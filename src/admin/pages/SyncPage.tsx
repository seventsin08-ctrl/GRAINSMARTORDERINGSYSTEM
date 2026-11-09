import { useEffect, useState } from 'react';
import { connectSync } from '../../store/db';
import { SETUP_SQL, getSyncConfig, getSyncStatus, onSyncStatus, setSyncConfig } from '../../store/sync';
import { Field, PageHead, toast } from '../../components/ui';

export function useSyncStatus() {
  const [s, setS] = useState(getSyncStatus());
  useEffect(() => onSyncStatus(() => setS(getSyncStatus())), []);
  return s;
}

const LABEL = { off: 'This device only', connecting: 'Connecting…', live: 'Live — syncing all devices', error: 'Not connected' } as const;
const COLOR = { off: '', connecting: 'orange', live: 'green', error: 'red' } as const;

export function SyncBadge() {
  const s = useSyncStatus();
  return <span className={`badge ${COLOR[s.status]}`}>● {LABEL[s.status]}</span>;
}

export default function SyncPage() {
  const saved = getSyncConfig();
  const [url, setUrl] = useState(saved?.url ?? '');
  const [key, setKey] = useState(saved?.key ?? '');
  const [storeId, setStoreId] = useState(saved?.storeId ?? 'grainsmart');
  const s = useSyncStatus();

  return (
    <>
      <PageHead title="Connect devices" sub="Link the website, the kiosk tablet and the GrainSmart phone app to one online database, so an order placed anywhere shows up everywhere within a second." actions={<SyncBadge />} />
      <div className="grid g2">
        <div className="card pad stack">
          <h3 className="h-serif" style={{ fontSize: 22 }}>Database connection</h3>
          <Field label="Supabase project URL" hint="Supabase → Project Settings → API → Project URL"><input id="sync-url" className="input" placeholder="https://abcd1234.supabase.co" value={url} onChange={(e) => setUrl(e.target.value.trim())} /></Field>
          <Field label="Anon public key" hint="Same page → Project API keys → anon public"><input id="sync-key" className="input mono" style={{ fontSize: 12 }} value={key} onChange={(e) => setKey(e.target.value.trim())} /></Field>
          <Field label="Store ID" hint="Use the same ID on every device of the same shop."><input id="sync-store" className="input" value={storeId} onChange={(e) => setStoreId(e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))} /></Field>
          {s.status === 'error' && <div className="small" style={{ color: 'var(--red)' }}>{s.detail || 'Could not connect.'} Check the URL and key, and that you ran the setup SQL.</div>}
          <div className="row">
            <button className="btn primary lg" disabled={!/^https:\/\/.+/.test(url) || key.length < 20 || !storeId} onClick={() => { setSyncConfig({ url, key, storeId }); connectSync(); toast('Connecting…'); }}>Connect</button>
            {saved && <button className="btn lg" onClick={() => { setSyncConfig(null); connectSync(); toast('Disconnected — this device only'); }}>Disconnect</button>}
          </div>
          <p className="small muted" style={{ margin: 0 }}>Do this once on each device: the website, the kiosk tablet and the phone app. Data already on this device is merged in when you connect.</p>
        </div>
        <div className="card pad stack">
          <h3 className="h-serif" style={{ fontSize: 22 }}>One-time setup (about 3 minutes)</h3>
          <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Create a free account and project at supabase.com.</li>
            <li>Open <b>SQL Editor</b>, paste the code below and press <b>Run</b>.</li>
            <li>Copy the Project URL and anon public key into this form and press Connect.</li>
          </ol>
          <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 12, borderRadius: 12, fontSize: 11.5, overflowX: 'auto', margin: 0 }}>{SETUP_SQL}</pre>
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => navigator.clipboard?.writeText(SETUP_SQL).then(() => toast('Copied'), () => toast('Select the code and copy it'))}>Copy setup code</button>
          <p className="small muted" style={{ margin: 0 }}>Note: anyone with the anon key can read and change the shop data. Keep the key inside your devices and don't post it publicly.</p>
        </div>
      </div>
    </>
  );
}
