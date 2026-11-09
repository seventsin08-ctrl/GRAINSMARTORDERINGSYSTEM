import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { DB } from './types';

/**
 * Optional live sync between every device (website, kiosk tablet, phone app).
 * The whole store lives in one Supabase row (table `grainsmart_stores`). Records that many
 * devices create at once (orders, customers, logs, shifts) are merged by id so nothing is lost.
 * Without a configured project, everything keeps working locally on each device.
 */

export interface SyncConfig {
  url: string;
  key: string;
  storeId: string;
}
export type SyncStatus = 'off' | 'connecting' | 'live' | 'error';

const CFG_KEY = 'gs.sync';
const TABLE = 'grainsmart_stores';
const clientId = Math.random().toString(36).slice(2);

let status: SyncStatus = 'off';
let statusDetail = '';
const statusListeners = new Set<() => void>();
const setStatus = (s: SyncStatus, detail = '') => {
  status = s;
  statusDetail = detail;
  statusListeners.forEach((l) => l());
};
export const getSyncStatus = () => ({ status, detail: statusDetail });
export const onSyncStatus = (l: () => void) => {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
};

export function getSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && key ? { url, key, storeId: (import.meta.env.VITE_STORE_ID as string) || 'grainsmart' } : null;
}

export function setSyncConfig(cfg: SyncConfig | null) {
  try {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CFG_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge two lists by id; keep the newer copy when both sides have one. */
function mergeById<T extends { id: string }>(a: T[], b: T[], newer: (x: T, y: T) => boolean): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(x.id, x);
  for (const y of b) {
    const x = map.get(y.id);
    if (!x || newer(y, x)) map.set(y.id, y);
  }
  return [...map.values()];
}

export function mergeDB(local: DB, remote: DB): DB {
  const byTime = <T extends { id: string }>(k: keyof T) => (x: T, y: T) => Number(x[k] ?? 0) >= Number(y[k] ?? 0);
  return {
    ...remote,
    nextOrderNumber: Math.max(local.nextOrderNumber, remote.nextOrderNumber),
    orders: mergeById(local.orders, remote.orders, byTime('updatedAt')).sort((x, y) => y.createdAt - x.createdAt),
    customers: mergeById(local.customers, remote.customers, (x, y) => x.stamps >= y.stamps),
    stockLog: mergeById(local.stockLog, remote.stockLog, () => false).sort((x, y) => y.at - x.at).slice(0, 2000),
    govLog: mergeById(local.govLog, remote.govLog, () => false).sort((x, y) => y.at - x.at),
    shifts: mergeById(local.shifts, remote.shifts, (x, y) => !!x.clockOut && !y.clockOut),
    expenses: mergeById(local.expenses, remote.expenses, () => false),
  };
}

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;
let cfg: SyncConfig | null = null;
let pushTimer: number | undefined;
let pending: DB | null = null;
let applying = false;

export interface SyncHooks {
  getState: () => DB;
  applyRemote: (db: DB) => void;
}
let hooks: SyncHooks | null = null;

export async function startSync(h: SyncHooks) {
  hooks = h;
  await stopSync();
  cfg = getSyncConfig();
  if (!cfg) return setStatus('off');
  setStatus('connecting');
  try {
    client = createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
    const { data, error } = await client.from(TABLE).select('data').eq('id', cfg.storeId).maybeSingle();
    if (error) throw error;
    if (data?.data) {
      const merged = mergeDB(h.getState(), data.data as DB);
      applying = true;
      h.applyRemote(merged);
      applying = false;
    }
    await push(h.getState());
    channel = client
      .channel(`store-${cfg.storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${cfg.storeId}` }, (payload) => {
        const row = payload.new as { data?: DB; updated_by?: string };
        if (!row?.data || row.updated_by === clientId || !hooks) return;
        applying = true;
        hooks.applyRemote(mergeDB(hooks.getState(), row.data));
        applying = false;
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') setStatus('live');
        else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error', 'Live updates disconnected. Retrying…');
      });
  } catch (e) {
    setStatus('error', e instanceof Error ? e.message : 'Could not reach the database');
  }
}

export async function stopSync() {
  if (channel && client) await client.removeChannel(channel);
  channel = null;
  client = null;
  setStatus('off');
}

async function push(db: DB) {
  if (!client || !cfg) return;
  const { error } = await client.from(TABLE).upsert({ id: cfg.storeId, data: db, updated_at: new Date().toISOString(), updated_by: clientId });
  if (error) setStatus('error', error.message);
}

/** Called after every local change; batches writes for 300ms. */
export function queuePush(db: DB) {
  if (!client || applying) return;
  pending = db;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    if (pending) void push(pending);
    pending = null;
  }, 300);
}

export const SETUP_SQL = `create table if not exists public.grainsmart_stores (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.grainsmart_stores enable row level security;
create policy "store read" on public.grainsmart_stores for select using (true);
create policy "store write" on public.grainsmart_stores for insert with check (true);
create policy "store update" on public.grainsmart_stores for update using (true);
alter publication supabase_realtime add table public.grainsmart_stores;`;
