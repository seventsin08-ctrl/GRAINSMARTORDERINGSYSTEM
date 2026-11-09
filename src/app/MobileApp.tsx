import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { can, lineTotal, login, logout, markPayment, setOrderStatus, useDB, useUser } from '../store/db';
import type { Order, OrderStatus } from '../store/types';
import { NAV, allowed, roleLabel } from '../admin/AdminLayout';
import { money, moneyShort, rangeStart } from '../lib/format';
import { inRange } from '../admin/pages/Dashboard';
import { useSyncStatus } from '../admin/pages/SyncPage';
import Shop from '../shop/Shop';
import { ADMIN_SCREENS } from './screens';
import './app.css';

/* ---------------------------------------------------------------- helpers */

const tap = (style: ImpactStyle = ImpactStyle.Light) => {
  Haptics.impact({ style }).catch(() => navigator.vibrate?.(8));
};
const notifyBuzz = () => {
  Haptics.notification({ type: NotificationType.Success }).catch(() => navigator.vibrate?.([30, 60, 30]));
};

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.35);
    });
  } catch {
    /* audio unavailable */
  }
}

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  pending: { label: 'New', tone: 'orange' },
  preparing: { label: 'Preparing', tone: 'blue' },
  ready: { label: 'Ready', tone: 'green' },
  completed: { label: 'Completed', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : new Date(t).toLocaleDateString();
};

/* ---------------------------------------------------------------- icons */

const I = {
  today: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" />,
  orders: <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V6a2 2 0 0 1 2-2Zm1 5h8M8 12.5h8M8 16h5" />,
  kitchen: <path d="M12 3c2 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2.2 1-3.7 2-4.8.3 1.6 1 2.5 2 2.8-.4-2.6.2-4.9 1-7Z" />,
  shop: <path d="M6 8h12l-1 12H7L6 8Zm3 0V7a3 3 0 0 1 6 0v1" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3.2} />,
};
function Icon({ d }: { d: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
}
const Chevron = () => <span className="ios-chev" aria-hidden>›</span>;

/* ---------------------------------------------------------------- navigation */

interface Screen {
  key: string;
  title: string;
  render: () => ReactNode;
  large?: boolean;
  action?: ReactNode;
}

function useStack(root: Screen) {
  const [stack, setStack] = useState<Screen[]>([root]);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => setStack((s) => [root, ...s.slice(1)]), [root.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const push = (s: Screen) => {
    tap();
    setStack((st) => [...st, s]);
  };
  const pop = () => {
    if (stack.length < 2) return;
    tap();
    setLeaving(true);
    window.setTimeout(() => {
      setStack((st) => st.slice(0, -1));
      setLeaving(false);
    }, 260);
  };
  const reset = () => setStack((st) => st.slice(0, 1));
  return { stack, push, pop, reset, leaving };
}

/** A navigation page with an iOS large title that collapses into the nav bar on scroll. */
function Page({ screen, canBack, onBack, depth, leaving, children }: { screen: Screen; canBack: boolean; onBack: () => void; depth: number; leaving: boolean; children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState(0);
  return (
    <section
      className={`ios-page ${depth > 0 ? 'pushed' : ''} ${leaving ? 'leaving' : ''}`}
      style={drag ? { transform: `translateX(${drag}px)`, transition: 'none' } : undefined}
      onScroll={(e) => setScrolled((e.target as HTMLElement).scrollTop > 34)}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (canBack && t.clientX < 28) touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        if (!touch.current) return;
        const dx = e.touches[0].clientX - touch.current.x;
        setDrag(Math.max(0, dx));
      }}
      onTouchEnd={() => {
        if (touch.current && drag > 90) onBack();
        touch.current = null;
        setDrag(0);
      }}
    >
      <header className={`ios-nav ${scrolled || !screen.large ? 'solid' : ''}`}>
        <div className="ios-nav-side">
          {canBack && (
            <button className="ios-back" onClick={onBack}>
              <span>‹</span> Back
            </button>
          )}
        </div>
        <div className={`ios-nav-title ${scrolled || !screen.large ? 'on' : ''}`}>{screen.title}</div>
        <div className="ios-nav-side right">{screen.action}</div>
      </header>
      {screen.large && <h1 className="ios-large">{screen.title}</h1>}
      <div className="ios-content">{children}</div>
    </section>
  );
}

function Stack({ nav }: { nav: ReturnType<typeof useStack> }) {
  return (
    <div className="ios-stack">
      {nav.stack.map((s, i) => (
        <Page key={s.key + i} screen={s} depth={i} canBack={i > 0} onBack={nav.pop} leaving={nav.leaving && i === nav.stack.length - 1}>
          {s.render()}
        </Page>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- screens */

function Group({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  return (
    <div className="ios-group">
      {header && <div className="ios-group-h">{header}</div>}
      <div className="ios-cells">{children}</div>
      {footer && <div className="ios-group-f">{footer}</div>}
    </div>
  );
}

function Cell({ title, sub, value, onClick, chevron = !!onClick, tint, left }: { title: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void; chevron?: boolean; tint?: boolean; left?: ReactNode }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`ios-cell ${tint ? 'tint' : ''}`} onClick={onClick}>
      {left}
      <div className="ios-cell-main">
        <div className="ios-cell-t">{title}</div>
        {sub && <div className="ios-cell-s">{sub}</div>}
      </div>
      {value !== undefined && <div className="ios-cell-v">{value}</div>}
      {chevron && <Chevron />}
    </Tag>
  );
}

function Pill({ s }: { s: OrderStatus }) {
  return <span className={`ios-pill ${STATUS[s].tone}`}>{STATUS[s].label}</span>;
}

function OrderRow({ o, onOpen }: { o: Order; onOpen: () => void }) {
  return (
    <Cell
      onClick={onOpen}
      left={<div className={`ios-avatar ${STATUS[o.status].tone}`}>#{o.code.slice(-2)}</div>}
      title={
        <span className="ios-row-between">
          <span>
            #{o.code} · {o.orderTypeName}
          </span>
          <span className="ios-num">{moneyShort(o.total)}</span>
        </span>
      }
      sub={
        <span className="ios-row-between">
          <span className="ios-ellipsis">{o.customerName} · {o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</span>
          <span className="ios-row-gap">
            {!o.paid && o.status !== 'cancelled' && <span className="ios-pill orange soft">Unpaid</span>}
            <Pill s={o.status} />
          </span>
        </span>
      }
    />
  );
}

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const o = useDB((d) => d.orders.find((x) => x.id === id));
  const u = useUser();
  const [sheet, setSheet] = useState(false);
  if (!o) return <div className="ios-empty">This order was removed.</div>;
  const next: Partial<Record<OrderStatus, [OrderStatus, string]>> = { pending: ['preparing', 'Start preparing'], preparing: ['ready', 'Mark ready'], ready: ['completed', 'Complete order'] };
  const step = next[o.status];
  return (
    <>
      <div className="ios-hero-card">
        <div className="ios-hero-code">#{o.code}</div>
        <div className="ios-row-gap" style={{ justifyContent: 'center' }}>
          <Pill s={o.status} />
          <span className={`ios-pill ${o.paid ? 'green' : 'orange'} soft`}>{o.paid ? `Paid · ${o.paymentStatus}` : 'Payment due'}</span>
        </div>
        <div className="ios-sub">{o.orderTypeName}{o.tableNo ? ` · Table ${o.tableNo}` : ''} · {new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
      <Group header="Items">
        {o.lines.map((l) => (
          <Cell key={l.key} title={`${l.qty}× ${l.name}`} sub={[...l.addons.map((a) => a.name), l.note && `“${l.note}”`].filter(Boolean).join(' · ') || undefined} value={money(lineTotal(l))} />
        ))}
        {o.discount > 0 && <Cell title={o.discountLabel} value={`−${money(o.discount)}`} />}
        <Cell title={<b>Total</b>} value={<b>{money(o.total)}</b>} />
      </Group>
      <Group header="Customer">
        <Cell title={o.customerName} sub={o.customerPhone || 'No number'} />
        <Cell title="Payment" value={o.paymentMethodName} />
        {o.proofImage && <div className="ios-proof"><img src={o.proofImage} alt="Proof of payment" /></div>}
      </Group>
      <div className="ios-actions">
        {step && <button className="ios-btn filled" onClick={() => { setOrderStatus(o.id, step[0]); notifyBuzz(); }}>{step[1]}</button>}
        {can(u, 'payment') && !o.paid && o.status !== 'cancelled' && (
          <div className="ios-row-gap">
            <button className="ios-btn tinted" onClick={() => { markPayment(o.id, 'cash'); tap(ImpactStyle.Medium); }}>Cash received</button>
            <button className="ios-btn tinted" onClick={() => { markPayment(o.id, 'digital'); tap(ImpactStyle.Medium); }}>Digital received</button>
          </div>
        )}
        {o.status !== 'cancelled' && o.status !== 'completed' && <button className="ios-btn plain danger" onClick={() => { tap(); setSheet(true); }}>Cancel order</button>}
        {o.status === 'cancelled' && <button className="ios-btn tinted" onClick={() => setOrderStatus(o.id, 'pending')}>Reopen order</button>}
      </div>
      {sheet && (
        <ActionSheet
          title={`Cancel order #${o.code}?`}
          message="Stock for these items will be put back."
          actions={[{ label: 'Cancel order', danger: true, run: () => { setOrderStatus(o.id, 'cancelled'); onClose(); } }]}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  );
}

function ActionSheet({ title, message, actions, onClose }: { title: string; message?: string; actions: { label: string; danger?: boolean; run: () => void }[]; onClose: () => void }) {
  const [out, setOut] = useState(false);
  const close = (fn?: () => void) => {
    setOut(true);
    window.setTimeout(() => {
      onClose();
      fn?.();
    }, 220);
  };
  return (
    <div className={`ios-sheet-wrap ${out ? 'out' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ios-action-sheet">
        <div className="ios-as-group">
          <div className="ios-as-title">
            <b>{title}</b>
            {message && <span>{message}</span>}
          </div>
          {actions.map((a) => (
            <button key={a.label} className={a.danger ? 'danger' : ''} onClick={() => close(a.run)}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="ios-as-group">
          <button className="bold" onClick={() => close()}>Keep order</button>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const i = options.findIndex((o) => o.value === value);
  return (
    <div className="ios-seg" style={{ ['--n' as string]: options.length, ['--i' as string]: i }}>
      <span className="ios-seg-thumb" />
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => { tap(); onChange(o.value); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OrdersScreen({ push, kitchen }: { push: (s: Screen) => void; kitchen?: boolean }) {
  const orders = useDB((d) => d.orders);
  const [seg, setSeg] = useState<'active' | 'pending' | 'ready' | 'done'>(kitchen ? 'active' : 'active');
  const [q, setQ] = useState('');
  const list = orders.filter((o) => {
    if (q && !(o.code.includes(q) || o.customerName.toLowerCase().includes(q.toLowerCase()))) return false;
    if (seg === 'active') return ['pending', 'preparing', 'ready'].includes(o.status);
    if (seg === 'pending') return o.status === 'pending';
    if (seg === 'ready') return o.status === 'ready';
    return o.status === 'completed' || o.status === 'cancelled';
  });
  const shown = kitchen ? [...list].reverse() : list;
  const open = (o: Order) => push({ key: `order-${o.id}`, title: `Order #${o.code}`, render: () => <OrderDetail id={o.id} onClose={() => {}} /> });
  return (
    <>
      <div className="ios-search">
        <span aria-hidden>⌕</span>
        <input id={kitchen ? 'k-search' : 'o-search'} placeholder="Search code or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!kitchen && (
        <div style={{ padding: '0 16px 12px' }}>
          <Segmented value={seg} onChange={setSeg} options={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'New' }, { value: 'ready', label: 'Ready' }, { value: 'done', label: 'Done' }]} />
        </div>
      )}
      {kitchen ? (
        <div className="ios-tickets">
          {shown.map((o) => (
            <div key={o.id} className={`ios-ticket ${STATUS[o.status].tone}`}>
              <div className="ios-row-between">
                <b className="ios-ticket-code">#{o.code}</b>
                <span className="ios-sub">{o.orderTypeName} · {ago(o.createdAt)}</span>
              </div>
              {o.lines.map((l) => (
                <div key={l.key} className="ios-ticket-line">
                  <b>{l.qty}×</b> {l.name}
                  {(l.addons.length > 0 || l.note) && <div className="ios-sub">{[...l.addons.map((a) => a.name), l.note && `“${l.note}”`].filter(Boolean).join(' · ')}</div>}
                </div>
              ))}
              <div className="ios-row-gap" style={{ marginTop: 10 }}>
                {o.status === 'pending' && <button className="ios-btn filled sm" onClick={() => { setOrderStatus(o.id, 'preparing'); notifyBuzz(); }}>Start preparing</button>}
                {o.status === 'preparing' && <button className="ios-btn filled sm" onClick={() => { setOrderStatus(o.id, 'ready'); notifyBuzz(); }}>Mark ready</button>}
                {o.status === 'ready' && <button className="ios-btn tinted sm" onClick={() => { setOrderStatus(o.id, 'completed'); tap(); }}>Picked up</button>}
                <button className="ios-btn plain sm" onClick={() => open(o)}>Details</button>
              </div>
            </div>
          ))}
          {!shown.length && <div className="ios-empty"><div className="ios-empty-ico">♨</div>All caught up. New tickets appear here instantly.</div>}
        </div>
      ) : (
        <Group footer={shown.length ? `${shown.length} order${shown.length === 1 ? '' : 's'}` : undefined}>
          {shown.map((o) => <OrderRow key={o.id} o={o} onOpen={() => open(o)} />)}
          {!shown.length && <div className="ios-empty">No orders here yet.</div>}
        </Group>
      )}
    </>
  );
}

function TodayScreen({ push, goTab }: { push: (s: Screen) => void; goTab: (t: Tab) => void }) {
  const db = useDB((d) => d);
  const sync = useSyncStatus();
  const today = inRange(db.orders, rangeStart('today'));
  const paid = today.filter((o) => o.paid);
  const sales = paid.reduce((s, o) => s + o.total, 0);
  const active = db.orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status));
  const tiles = [
    { l: 'Paid today', v: moneyShort(sales), s: `${paid.length} paid orders` },
    { l: 'Orders today', v: today.length, s: `${today.length - paid.length} awaiting payment` },
    { l: 'In progress', v: active.length, s: `${db.orders.filter((o) => o.status === 'pending').length} new` },
    { l: 'Low stock', v: db.items.filter((i) => i.trackStock && (i.stock[db.settings.activeBranchId] ?? 0) <= i.lowStockAt).length, s: 'items' },
  ];
  return (
    <>
      <div className="ios-date">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
      <div className="ios-tiles">
        {tiles.map((t) => (
          <div key={t.l} className="ios-tile">
            <div className="ios-sub">{t.l}</div>
            <div className="ios-tile-v">{t.v}</div>
            <div className="ios-sub">{t.s}</div>
          </div>
        ))}
      </div>
      <Group header="Live orders">
        {active.slice(0, 5).map((o) => <OrderRow key={o.id} o={o} onOpen={() => push({ key: `order-${o.id}`, title: `Order #${o.code}`, render: () => <OrderDetail id={o.id} onClose={() => {}} /> })} />)}
        {!active.length && <div className="ios-empty">No orders in progress.</div>}
        <Cell title={<span className="ios-tint-text">See all orders</span>} onClick={() => goTab('orders')} />
      </Group>
      <Group header="Sync" footer={sync.status === 'live' ? 'Orders from the website, kiosk and this phone update instantly.' : 'Connect a database in More → Connect devices to receive website orders on this phone.'}>
        <Cell title="Devices" value={<span className={`ios-dot ${sync.status}`}>{sync.status === 'live' ? 'Live' : sync.status === 'connecting' ? 'Connecting' : sync.status === 'error' ? 'Error' : 'This phone only'}</span>} />
      </Group>
    </>
  );
}

function MoreScreen({ push }: { push: (s: Screen) => void }) {
  const u = useUser();
  const b = useDB((d) => d.branding);
  const [sheet, setSheet] = useState(false);
  const skip = new Set(['/admin', '/admin/orders', '/admin/kitchen']);
  return (
    <>
      <Group>
        <Cell left={<img className="ios-me-logo" src={b.adminLogo || b.logo} alt="" />} title={<b>{u?.name}</b>} sub={`${roleLabel(u!.role)} · ${b.storeName}`} />
      </Group>
      {NAV.map((sec) => {
        const items = sec.items.filter((i) => !skip.has(i.to) && allowed(i, u) && ADMIN_SCREENS[i.to]);
        if (!items.length) return null;
        return (
          <Group key={sec.title} header={sec.title}>
            {items.map((i) => (
              <Cell
                key={i.to}
                left={<span className="ios-icon-tile">{i.icon}</span>}
                title={i.label}
                onClick={() => push({ key: i.to, title: i.label, render: () => <div className="ios-embed">{ADMIN_SCREENS[i.to]()}</div> })}
              />
            ))}
          </Group>
        );
      })}
      <Group>
        <Cell title={<span className="ios-danger-text">Sign out</span>} onClick={() => setSheet(true)} chevron={false} />
      </Group>
      {sheet && <ActionSheet title="Sign out of GrainSmart?" actions={[{ label: 'Sign out', danger: true, run: () => logout() }]} onClose={() => setSheet(false)} />}
    </>
  );
}

/* ---------------------------------------------------------------- login */

function Login({ onGuest }: { onGuest: () => void }) {
  const b = useDB((d) => d.branding);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div className="ios-login">
      <img className="ios-login-logo" src={b.logo} alt="" />
      <h1>{b.storeName}</h1>
      <p className="ios-sub">Sign in to receive and manage orders.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!login(u, p, true)) {
            setErr(true);
            Haptics.notification({ type: NotificationType.Error }).catch(() => navigator.vibrate?.([40, 40, 40]));
            window.setTimeout(() => setErr(false), 500);
          } else notifyBuzz();
        }}
      >
        <div className={`ios-cells ios-form ${err ? 'shake' : ''}`}>
          <input id="app-user" autoCapitalize="none" autoComplete="username" placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} />
          <input id="app-pass" type="password" autoComplete="current-password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        <button className="ios-btn filled big" disabled={!u || !p}>Sign In</button>
      </form>
      <button className="ios-btn plain" onClick={onGuest}>Browse the menu instead</button>
      <p className="ios-sub" style={{ marginTop: 'auto' }}>Demo: admin / admin123</p>
    </div>
  );
}

/* ---------------------------------------------------------------- shell */

type Tab = 'today' | 'orders' | 'kitchen' | 'shop' | 'more';

export default function MobileApp() {
  const u = useUser();
  const [guest, setGuest] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [banner, setBanner] = useState<Order | null>(null);
  const pendingOrders = useDB((d) => d.orders.filter((o) => o.status === 'pending'));
  const seen = useRef(new Set(pendingOrders.map((o) => o.id)));
  const logo = useDB((d) => d.branding.logo);

  // New-order alert banner with sound and haptics
  useEffect(() => {
    const fresh = pendingOrders.filter((o) => !seen.current.has(o.id));
    pendingOrders.forEach((o) => seen.current.add(o.id));
    if (fresh.length && u) {
      setBanner(fresh[0]);
      notifyBuzz();
      chime();
      const t = window.setTimeout(() => setBanner(null), 4200);
      return () => window.clearTimeout(t);
    }
  }, [pendingOrders, u]);

  const roots = useMemo<Record<Tab, Screen>>(
    () => ({
      today: { key: 'today', title: 'Today', large: true, render: () => <TodayScreen push={(s) => navs.today.push(s)} goTab={setTab} /> },
      orders: { key: 'orders', title: 'Orders', large: true, render: () => <OrdersScreen push={(s) => navs.orders.push(s)} /> },
      kitchen: { key: 'kitchen', title: 'Kitchen', large: true, render: () => <OrdersScreen kitchen push={(s) => navs.kitchen.push(s)} /> },
      shop: { key: 'shop', title: 'Shop', render: () => <div className="ios-shop"><Shop /></div> },
      more: { key: 'more', title: 'More', large: true, render: () => <MoreScreen push={(s) => navs.more.push(s)} /> },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const navs = {
    today: useStack(roots.today),
    orders: useStack(roots.orders),
    kitchen: useStack(roots.kitchen),
    shop: useStack(roots.shop),
    more: useStack(roots.more),
  };

  if (!u && !guest) return <div className="ios"><Login onGuest={() => setGuest(true)} /></div>;
  if (!u && guest)
    return (
      <div className="ios">
        <div className="ios-shop full"><Shop /></div>
        <button className="ios-floating" onClick={() => setGuest(false)}>Staff sign in</button>
      </div>
    );

  const tabs: { id: Tab; label: string; icon: ReactNode; show: boolean; badge?: number }[] = [
    { id: 'today', label: 'Today', icon: I.today, show: true },
    { id: 'orders', label: 'Orders', icon: I.orders, show: can(u, 'orders'), badge: pendingOrders.length },
    { id: 'kitchen', label: 'Kitchen', icon: I.kitchen, show: can(u, 'kitchen') },
    { id: 'shop', label: 'Shop', icon: I.shop, show: true },
    { id: 'more', label: 'More', icon: I.more, show: true },
  ];

  return (
    <div className="ios">
      {(Object.keys(navs) as Tab[]).map((t) => (
        <div key={t} className={`ios-tab-pane ${tab === t ? 'on' : ''}`} aria-hidden={tab !== t}>
          <Stack nav={navs[t]} />
        </div>
      ))}
      {banner && (
        <button className="ios-banner" onClick={() => { setBanner(null); setTab('orders'); navs.orders.push({ key: `order-${banner.id}`, title: `Order #${banner.code}`, render: () => <OrderDetail id={banner.id} onClose={() => {}} /> }); }}>
          <img src={logo} alt="" />
          <div>
            <div className="ios-banner-top"><b>New order #{banner.code}</b><span>now</span></div>
            <div className="ios-banner-body">{banner.orderTypeName} · {banner.customerName} · {money(banner.total)}</div>
          </div>
        </button>
      )}
      <nav className="ios-tabbar">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => {
              tap();
              if (tab === t.id) navs[t.id].reset();
              setTab(t.id);
            }}
          >
            <span className="ios-tab-ico">
              <Icon d={t.icon} />
              {!!t.badge && <span className="ios-badge">{t.badge}</span>}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
