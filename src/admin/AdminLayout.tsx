import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDB } from '../store/db';

type NavItem = { to: string; label: string; icon: string; end?: boolean };
type NavGroup = { label: string; icon: string; children: NavItem[] };
type Section = { title?: string; items: (NavItem | NavGroup)[] };

export const NAV: Section[] = [
  {
    items: [
      { to: '/admin', label: 'Dashboard', icon: '⌂', end: true },
      { to: '/admin/orders', label: 'Orders', icon: '☰' },
      {
        label: 'Menu',
        icon: '◫',
        children: [
          { to: '/admin/menu', label: 'Menu Management', icon: '' },
          { to: '/admin/categories', label: 'Categories', icon: '' },
          { to: '/admin/addons', label: 'Add-ons', icon: '' },
          { to: '/admin/boost-sales', label: 'Boost Sales', icon: '' },
        ],
      },
    ],
  },
  { title: 'Reports', items: [{ to: '/admin/reports', label: 'Sales', icon: '▤', end: true }, { to: '/admin/cash', label: 'Cash & remits', icon: '₱' }] },
  { title: 'Money', items: [{ to: '/admin/expenses', label: 'Expenses', icon: '⇣' }, { to: '/admin/reports/profit', label: 'Profit', icon: '↗' }] },
  {
    title: 'Stock',
    items: [
      { to: '/admin/inventory', label: 'Stock', icon: '▣', end: true },
      { to: '/admin/inventory/transfers', label: 'Transfers', icon: '⇄' },
      { to: '/admin/inventory/log', label: 'Stock history', icon: '↺' },
    ],
  },
  {
    title: 'Grow',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: '☺' },
      { to: '/admin/loyalty', label: 'Loyalty', icon: '★' },
      { to: '/admin/texts', label: 'Texts', icon: '✉' },
      { to: '/admin/vouchers', label: 'Vouchers', icon: '%' },
      { to: '/admin/gov-discounts', label: 'Senior & PWD', icon: '♿' },
    ],
  },
  {
    title: 'Store',
    items: [
      {
        label: 'Store Setup',
        icon: '⚙',
        children: [
          { to: '/admin/order-types', label: 'Order Types', icon: '' },
          { to: '/admin/outlets', label: 'Branches', icon: '' },
          { to: '/admin/staff', label: 'Staff', icon: '' },
          { to: '/admin/payment-methods', label: 'Payment Methods', icon: '' },
          { to: '/admin/branding', label: 'Branding Studio', icon: '' },
          { to: '/admin/receipt-editor', label: 'Receipt Studio', icon: '' },
          { to: '/admin/qr-codes', label: 'QR Codes', icon: '' },
          { to: '/admin/hero-designer', label: 'Hero Builder', icon: '' },
          { to: '/admin/welcome-designer', label: 'Welcome Builder', icon: '' },
          { to: '/admin/mcp', label: 'Connect AI', icon: '' },
        ],
      },
      { to: '/admin/settings', label: 'Settings', icon: '⚙' },
    ],
  },
  { title: 'Help', items: [{ to: '/admin/learn', label: 'Learn', icon: '?' }] },
];

const LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((s) => s.items.flatMap((i) => ('children' in i ? i.children : [i]))).map((i) => [i.to, i.label]),
);

export function isAuthed() {
  return sessionStorage.getItem('gs.admin') === '1';
}

export default function AdminLayout() {
  const b = useDB((d) => d.branding);
  const pending = useDB((d) => d.orders.filter((o) => o.status === 'pending').length);
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Record<string, boolean>>({});

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!isAuthed()) nav('/admin/login', { replace: true, state: { from: loc.pathname } });
  }, [loc.pathname, nav]);

  const crumb = LABELS[loc.pathname];

  return (
    <div className="admin">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">🌾</div>
          GrainSmart
        </div>
        <div className="store-chip">
          <div className="logo">{b.logo ? <img src={b.logo} alt="" /> : '🏪'}</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.storeName}</b>
            <a href="/kiosk" target="_blank" rel="noreferrer">
              View storefront ↗
            </a>
          </div>
        </div>
        {NAV.map((sec, si) => (
          <div key={si}>
            {sec.title && <div className="nav-sec">{sec.title}</div>}
            {sec.items.map((it) =>
              'children' in it ? (
                <div key={it.label}>
                  {(() => {
                    const active = it.children.some((c) => loc.pathname === c.to);
                    const isOpen = groups[it.label] ?? active;
                    return (
                      <>
                        <button className="nav-link" onClick={() => setGroups((g) => ({ ...g, [it.label]: !isOpen }))}>
                          <span className="ni">{it.icon}</span>
                          {it.label}
                          <span className={`chev ${isOpen ? 'open' : ''}`}>▶</span>
                        </button>
                        {isOpen && (
                          <div className="nav-sub">
                            {it.children.map((c) => (
                              <NavLink key={c.to} to={c.to} end className="nav-link">
                                {c.label}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <NavLink key={it.to} to={it.to} end={it.end} className="nav-link">
                  <span className="ni">{it.icon}</span>
                  {it.label}
                  {it.to === '/admin/orders' && pending > 0 && (
                    <span className="badge red" style={{ marginLeft: 'auto', height: 20 }}>
                      {pending}
                    </span>
                  )}
                </NavLink>
              ),
            )}
          </div>
        ))}
        <div className="side-foot">
          <button
            className="nav-link"
            onClick={() => {
              sessionStorage.removeItem('gs.admin');
              nav('/admin/login');
            }}
          >
            <span className="ni">⏻</span>Log out
          </button>
        </div>
      </aside>
      {open && <div className="overlay" style={{ zIndex: 40, background: 'rgba(0,0,0,.2)' }} onClick={() => setOpen(false)} />}
      <main className="main">
        <div className="topbar">
          <button className="btn icon ghost hamburger" onClick={() => setOpen(true)} aria-label="Menu">
            ☰
          </button>
          <div className="crumbs">
            <Link to="/admin">Dashboard</Link>
            {crumb && crumb !== 'Dashboard' && (
              <>
                <span>›</span>
                <b>{crumb}</b>
              </>
            )}
          </div>
          <span className="grow" />
          <a className="btn sm" href="/kiosk" target="_blank" rel="noreferrer">
            Open kiosk ↗
          </a>
        </div>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
