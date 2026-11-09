import { useRef, useSyncExternalStore } from 'react';
import { seed, DEFAULT_BRANDING } from './seed';
import type { CartLine, DB, Order, OrderStatus, Staff, StockLog } from './types';

const KEY = 'grainsmart.db.v2';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('grainsmart') : null;

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      const base = seed();
      if (parsed.version !== base.version) return base;
      return {
        ...base,
        ...parsed,
        branding: {
          ...DEFAULT_BRANDING,
          ...parsed.branding,
          hero: { ...DEFAULT_BRANDING.hero, ...parsed.branding?.hero },
          welcome: { ...DEFAULT_BRANDING.welcome, ...parsed.branding?.welcome },
          story: { ...DEFAULT_BRANDING.story, ...parsed.branding?.story },
        },
        settings: { ...base.settings, ...parsed.settings },
        receipt: { ...base.receipt, ...parsed.receipt },
        loyalty: { ...base.loyalty, ...parsed.loyalty },
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return seed();
}

let state: DB = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
  channel?.postMessage('changed');
}

function emit() {
  listeners.forEach((l) => l());
}

channel?.addEventListener('message', () => {
  state = load();
  emit();
});
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load();
    emit();
  }
});

export function getDB(): DB {
  return state;
}

export function update(mutator: (draft: DB) => void) {
  const draft = structuredClone(state);
  mutator(draft);
  state = draft;
  persist();
  emit();
}

export function resetDB(empty = false) {
  state = seed();
  if (empty) {
    state.orders = [];
  }
  persist();
  emit();
}

export function replaceDB(next: DB) {
  state = next;
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Subscribe to the store. The selector only re-runs when the store changes, so it may return new arrays/objects safely. */
export function useDB<T>(selector: (db: DB) => T): T {
  const snap = useSyncExternalStore(subscribe, () => state);
  const cache = useRef<{ snap: DB; sel: (db: DB) => T; value: T } | null>(null);
  if (!cache.current || cache.current.snap !== snap || cache.current.sel !== selector) {
    // selectors are usually inline lambdas; recompute when snapshot changes or on each render (cheap)
    cache.current = { snap, sel: selector, value: selector(snap) };
  }
  return cache.current.value;
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

/* ------------------------------------------------------------------ */
/* Stock                                                               */
/* ------------------------------------------------------------------ */

function log(d: DB, entry: Omit<StockLog, 'id' | 'at'>) {
  d.stockLog.unshift({ id: uid('sl'), at: Date.now(), ...entry });
  if (d.stockLog.length > 2000) d.stockLog.length = 2000;
}

/** Deducts stock for an order exactly once. A second call is refused and logged. */
function deductForOrder(d: DB, order: Order, by: string) {
  const already = d.stockLog.some((l) => l.orderId === order.id && l.kind === 'order_deduction');
  const restored = d.stockLog.some((l) => l.orderId === order.id && l.kind === 'restored');
  if (already && !restored) {
    for (const line of order.lines) {
      const it = d.items.find((i) => i.id === line.itemId);
      log(d, {
        kind: 'duplicate_refused',
        itemId: line.itemId,
        itemName: line.name,
        branchId: order.branchId,
        delta: 0,
        after: it?.stock[order.branchId] ?? 0,
        orderId: order.id,
        orderNumber: order.code,
        by,
        note: 'Stock was already deducted for this order',
      });
    }
    return;
  }
  for (const line of order.lines) {
    const it = d.items.find((i) => i.id === line.itemId);
    if (!it) {
      log(d, {
        kind: 'failed',
        itemId: line.itemId,
        itemName: line.name,
        branchId: order.branchId,
        delta: 0,
        after: 0,
        orderId: order.id,
        orderNumber: order.code,
        by,
        note: 'Item no longer exists on the menu',
      });
      continue;
    }
    if (!it.trackStock) continue;
    const cur = it.stock[order.branchId] ?? 0;
    it.stock[order.branchId] = cur - line.qty;
    if (it.stock[order.branchId] <= 0) it.available = it.available && it.stock[order.branchId] > 0;
    log(d, {
      kind: 'order_deduction',
      itemId: it.id,
      itemName: it.name,
      branchId: order.branchId,
      delta: -line.qty,
      after: it.stock[order.branchId],
      orderId: order.id,
      orderNumber: order.code,
      by,
      note: '',
    });
  }
}

function restoreForOrder(d: DB, order: Order, by: string) {
  const deducted = d.stockLog.some((l) => l.orderId === order.id && l.kind === 'order_deduction');
  const restored = d.stockLog.some((l) => l.orderId === order.id && l.kind === 'restored');
  if (!deducted || restored) return;
  for (const line of order.lines) {
    const it = d.items.find((i) => i.id === line.itemId);
    if (!it || !it.trackStock) continue;
    it.stock[order.branchId] = (it.stock[order.branchId] ?? 0) + line.qty;
    if (it.stock[order.branchId] > 0) it.available = true;
    log(d, {
      kind: 'restored',
      itemId: it.id,
      itemName: it.name,
      branchId: order.branchId,
      delta: line.qty,
      after: it.stock[order.branchId],
      orderId: order.id,
      orderNumber: order.code,
      by,
      note: 'Order cancelled',
    });
  }
}

export function adjustStock(itemId: string, branchId: string, delta: number, note: string, by = 'Admin') {
  update((d) => {
    const it = d.items.find((i) => i.id === itemId);
    if (!it) return;
    const recent = d.stockLog.find(
      (l) => l.itemId === itemId && l.branchId === branchId && (l.kind === 'manual' || l.kind === 'manual_repeat') && Date.now() - l.at < 60_000,
    );
    const repeat = !!recent && recent.delta === delta;
    it.stock[branchId] = (it.stock[branchId] ?? 0) + delta;
    if (it.stock[branchId] > 0 && it.trackStock) it.available = true;
    log(d, {
      kind: repeat ? 'manual_repeat' : 'manual',
      itemId,
      itemName: it.name,
      branchId,
      delta,
      after: it.stock[branchId],
      by,
      note: repeat ? `${note || 'Manual change'} (same change repeated within a minute)` : note,
    });
  });
}

export function transferStock(itemId: string, fromBranchId: string, toBranchId: string, qty: number, note: string, by = 'Admin') {
  update((d) => {
    const it = d.items.find((i) => i.id === itemId);
    if (!it || qty <= 0 || fromBranchId === toBranchId) return;
    it.stock[fromBranchId] = (it.stock[fromBranchId] ?? 0) - qty;
    it.stock[toBranchId] = (it.stock[toBranchId] ?? 0) + qty;
    d.transfers.unshift({ id: uid('tr'), at: Date.now(), fromBranchId, toBranchId, itemId, qty, by, note });
    log(d, { kind: 'transfer', itemId, itemName: it.name, branchId: fromBranchId, delta: -qty, after: it.stock[fromBranchId], by, note: `Sent to ${d.branches.find((b) => b.id === toBranchId)?.name ?? 'branch'}` });
    log(d, { kind: 'transfer', itemId, itemName: it.name, branchId: toBranchId, delta: qty, after: it.stock[toBranchId], by, note: `Received from ${d.branches.find((b) => b.id === fromBranchId)?.name ?? 'branch'}` });
  });
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export interface PlaceOrderInput {
  orderTypeId: string;
  customerName: string;
  customerPhone: string;
  lines: CartLine[];
  voucherCode: string;
  paymentMethodId: string;
  tableNo: string;
  govDiscount?: { type: 'senior' | 'pwd'; idNumber: string; name: string };
  proofImage?: string;
  loyaltyCardCode?: string;
}

export interface Pricing {
  subtotal: number;
  discount: number;
  discountLabel: string;
  serviceCharge: number;
  total: number;
  voucherError: string;
}

export function priceOrder(d: DB, input: Pick<PlaceOrderInput, 'lines' | 'voucherCode' | 'orderTypeId' | 'govDiscount'>): Pricing {
  const subtotal = input.lines.reduce((s, l) => s + lineTotal(l), 0);
  let discount = 0;
  let discountLabel = '';
  let voucherError = '';
  if (input.govDiscount) {
    // Senior / PWD: VAT-exempt + discount on the cheapest-to-highest single person share.
    // Simplified: discount applies to the whole order for one diner.
    const vatable = d.settings.taxIncluded ? subtotal / (1 + d.settings.taxPct / 100) : subtotal;
    const vatRemoved = subtotal - vatable;
    discount = round(vatRemoved + vatable * (d.settings.govDiscountPct / 100));
    discountLabel = `${input.govDiscount.type === 'senior' ? 'Senior citizen' : 'PWD'} (${d.settings.govDiscountPct}% + VAT exempt)`;
  } else if (input.voucherCode.trim()) {
    const v = d.vouchers.find((x) => x.code.toUpperCase() === input.voucherCode.trim().toUpperCase());
    const today = new Date().toISOString().slice(0, 10);
    if (!v || !v.active) voucherError = 'That code is not valid.';
    else if (v.expiresAt && v.expiresAt < today) voucherError = 'That code has expired.';
    else if (v.maxUses > 0 && v.used >= v.maxUses) voucherError = 'That code has been fully used.';
    else if (subtotal < v.minSpend) voucherError = `Spend at least ${d.settings.currency}${v.minSpend} to use this code.`;
    else {
      discount = v.type === 'percent' ? round((subtotal * v.value) / 100) : Math.min(v.value, subtotal);
      discountLabel = `Voucher ${v.code}`;
    }
  }
  const ot = d.orderTypes.find((o) => o.id === input.orderTypeId);
  const serviceCharge = round(((subtotal - discount) * (ot?.serviceChargePct ?? 0)) / 100);
  return { subtotal, discount, discountLabel, serviceCharge, total: round(subtotal - discount + serviceCharge), voucherError };
}

export const lineTotal = (l: CartLine) => (l.unitPrice + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty;
const round = (n: number) => Math.round(n * 100) / 100;

export function placeOrder(input: PlaceOrderInput): Order {
  let created!: Order;
  update((d) => {
    const pricing = priceOrder(d, input);
    const ot = d.orderTypes.find((o) => o.id === input.orderTypeId);
    const pm = d.paymentMethods.find((p) => p.id === input.paymentMethodId);
    const phone = input.customerPhone.replace(/\D/g, '');
    let stampsEarned = 0;
    if (phone) {
      let c = d.customers.find((x) => x.phone === phone);
      if (!c) {
        c = { id: uid('cu'), name: input.customerName || 'Guest', phone, createdAt: Date.now(), stamps: 0, rewardsRedeemed: 0, optInTexts: true };
        d.customers.push(c);
      } else if (input.customerName) c.name = input.customerName;
    }
    if (d.loyalty.enabled) stampsEarned = pointsFor(d, input.lines, pricing.total);
    const order: Order = {
      id: uid('or'),
      number: d.nextOrderNumber++,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      branchId: d.settings.kioskBranchId,
      orderTypeId: input.orderTypeId,
      orderTypeName: ot?.name ?? '',
      customerName: input.customerName || 'Guest',
      customerPhone: phone,
      lines: input.lines,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      discountLabel: pricing.discountLabel,
      voucherCode: pricing.discountLabel.startsWith('Voucher') ? input.voucherCode.trim().toUpperCase() : '',
      serviceCharge: pricing.serviceCharge,
      total: pricing.total,
      cost: input.lines.reduce((s, l) => s + l.unitCost * l.qty, 0),
      paymentMethodId: input.paymentMethodId,
      paymentMethodName: pm?.name ?? '',
      paid: false,
      status: d.settings.autoAcceptOrders ? 'preparing' : 'pending',
      tableNo: input.tableNo,
      govDiscount: input.govDiscount,
      stampsEarned,
      code: newCode(d),
      paymentStatus: 'due',
      proofImage: input.proofImage ?? '',
      loyaltyCardCode: (input.loyaltyCardCode ?? '').trim().toUpperCase(),
    };
    if (order.voucherCode) {
      const v = d.vouchers.find((x) => x.code.toUpperCase() === order.voucherCode);
      if (v) v.used++;
    }
    if (input.govDiscount) {
      d.govLog.unshift({ id: uid('gd'), at: Date.now(), orderId: order.id, orderNumber: order.code, type: input.govDiscount.type, name: input.govDiscount.name, idNumber: input.govDiscount.idNumber, discount: pricing.discount });
    }
    d.orders.unshift(order);
    deductForOrder(d, order, 'Kiosk');
    created = order;
  });
  return created;
}

export function setOrderStatus(orderId: string, status: OrderStatus, by = 'Admin') {
  update((d) => {
    const o = d.orders.find((x) => x.id === orderId);
    if (!o || o.status === status) return;
    const prev = o.status;
    o.status = status;
    o.updatedAt = Date.now();
    if (status === 'cancelled') {
      restoreForOrder(d, o, by);
      if (o.paid) o.paid = false;
    }
    if (prev === 'cancelled' && status !== 'cancelled') deductForOrder(d, o, by);
    if (status === 'completed') {
      if (!o.paid) {
        o.paid = true;
        if (o.paymentStatus === 'due') o.paymentStatus = d.paymentMethods.find((p) => p.id === o.paymentMethodId)?.kind ?? 'cash';
      }
      awardStamps(d, o);
    }
  });
}

export function pointsFor(d: DB, lines: CartLine[], total: number) {
  const l = d.loyalty;
  if (l.earnBy === 'spend') return Math.floor(total / Math.max(1, l.spendPerStamp)) * l.pointsPer;
  return lines.filter((x) => l.eligibleItemIds.includes(x.itemId)).reduce((s, x) => s + x.qty, 0) * l.pointsPer;
}

function awardStamps(d: DB, o: Order) {
  if (!d.loyalty.enabled || !o.stampsEarned || o.pointsAwarded) return;
  let given = false;
  if (o.customerPhone) {
    const c = d.customers.find((x) => x.phone === o.customerPhone);
    if (c) {
      c.stamps += o.stampsEarned;
      given = true;
    }
  }
  if (o.loyaltyCardCode) {
    const card = d.loyaltyCards.find((c) => c.code === o.loyaltyCardCode && c.active);
    if (card) {
      card.points += o.stampsEarned;
      card.history.unshift({ at: Date.now(), delta: o.stampsEarned, note: `Order #${o.code}` });
      given = true;
    }
  }
  if (given) o.pointsAwarded = true;
}

/** Record how an order was paid. 'due' marks it unpaid again. */
export function markPayment(orderId: string, kind: 'cash' | 'digital' | 'due') {
  update((d) => {
    const o = d.orders.find((x) => x.id === orderId);
    if (!o) return;
    o.paymentStatus = kind;
    o.paid = kind !== 'due';
    o.updatedAt = Date.now();
    if (o.paid) awardStamps(d, o);
  });
}

function newCode(d: DB) {
  for (let i = 0; i < 50; i++) {
    const c = String(Math.floor(1000 + Math.random() * 9000));
    if (!d.orders.some((o) => o.code === c)) return c;
  }
  return String(d.nextOrderNumber);
}

export function markPaid(orderId: string, paid: boolean) {
  const o = state.orders.find((x) => x.id === orderId);
  const kind = state.paymentMethods.find((p) => p.id === o?.paymentMethodId)?.kind ?? 'cash';
  markPayment(orderId, paid ? kind : 'due');
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const AUTH = 'gs.user';
export function currentUser(): Staff | null {
  let id: string | null = null;
  try {
    id = sessionStorage.getItem(AUTH) ?? localStorage.getItem(AUTH);
    const exp = Number(localStorage.getItem(AUTH + '.exp') ?? 0);
    if (!sessionStorage.getItem(AUTH) && exp && exp < Date.now()) {
      localStorage.removeItem(AUTH);
      id = null;
    }
  } catch {
    /* storage blocked */
  }
  const u = state.staff.find((s) => s.id === id && s.active);
  return u ?? null;
}

export function useUser() {
  return useDB(() => currentUser());
}

export function login(username: string, password: string, keep: boolean): Staff | null {
  const u = state.staff.find((s) => s.active && s.username.toLowerCase() === username.trim().toLowerCase() && s.password === password);
  if (!u) return null;
  try {
    if (keep) {
      localStorage.setItem(AUTH, u.id);
      localStorage.setItem(AUTH + '.exp', String(Date.now() + 30 * 86400000));
    } else sessionStorage.setItem(AUTH, u.id);
  } catch {
    /* ignore */
  }
  emit();
  return u;
}

export function logout(clear = false) {
  try {
    sessionStorage.removeItem(AUTH);
    localStorage.removeItem(AUTH);
    localStorage.removeItem(AUTH + '.exp');
    if (clear) localStorage.removeItem('gs.theme');
  } catch {
    /* ignore */
  }
  emit();
}

export function can(u: Staff | null, perm: Staff['perms'][number]) {
  if (!u) return false;
  return u.role === 'owner' || u.role === 'admin' || u.perms.includes(perm);
}

/** Expected cash in drawer for an open (or closed) session. */
export function sessionExpected(d: DB, sid: string) {
  const s = d.cashSessions.find((x) => x.id === sid);
  if (!s) return 0;
  const end = s.closedAt ?? Infinity;
  const cashSales = d.orders
    .filter((o) => o.paymentStatus === 'cash' && o.status !== 'cancelled' && o.updatedAt >= s.openedAt && o.updatedAt <= end)
    .reduce((a, o) => a + o.total, 0);
  const cashExp = d.expenses
    .filter((e) => e.paidWith === 'cash' && e.at >= s.openedAt && e.at <= end)
    .reduce((a, e) => a + e.amount, 0);
  const mv = s.movements.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0);
  return s.float + cashSales + mv - cashExp;
}

/** Tries deducting again — used by the admin "re-deduct" button to demonstrate the guard. */
export function retryDeduction(orderId: string) {
  update((d) => {
    const o = d.orders.find((x) => x.id === orderId);
    if (o) deductForOrder(d, o, 'Admin');
  });
}
