import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { can, currentUser, logout, useDB, useUser } from '../store/db';
import type { Perm } from '../store/types';

type NavItem = { to: string; label: string; icon: string; end?: boolean; perm?: Perm | Perm[] };
type Section = { title: string; items: NavItem[] };

export const NAV: Section[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/admin', label: 'Dashboard', icon: '▣', end: true },
      { to: '/admin/orders', label: 'Orders', icon: '▤', perm: 'orders' },
      { to: '/admin/kitchen', label: 'Kitchen', icon: '♨', perm: 'kitchen' },
    ],
  },
  {
    title: 'Menu',
    items: [
      { to: '/admin/menu', label: 'Products', icon: '◇', perm: 'products' },
      { to: '/admin/categories', label: 'Categories', icon: '☷', perm: 'categories' },
      { to: '/admin/addons', label: 'Add-ons & variations', icon: '⊕', perm: 'products' },
      { to: '/admin/bulk-import', label: 'Bulk import', icon: '⇧', perm: 'products' },
      { to: '/admin/boost-sales', label: 'Boost sales', icon: '↗', perm: 'products' },
    ],
  },
  { title: 'Reports', items: [{ to: '/admin/reports', label: 'Sales reports', icon: '▤', end: true, perm: 'sales' }] },
  {
    title: 'Finance',
    items: [
      { to: '/admin/cash', label: 'Cash & remits', icon: '₱', perm: ['cash_remits', 'cash_view_all'] },
      { to: '/admin/expenses', label: 'Expenses', icon: '▤', perm: ['expenses_record', 'expenses_view'] },
      { to: '/admin/reports/profit', label: 'Profit', icon: '↗', perm: 'profit' },
    ],
  },
  { title: 'Payments', items: [{ to: '/admin/payment-methods', label: 'Payment methods', icon: '₱', perm: 'branding' }] },
  {
    title: 'Grow',
    items: [
      { to: '/admin/loyalty', label: 'Loyalty', icon: '✧', perm: ['loyalty', 'loyalty_config'] },
      { to: '/admin/customers', label: 'Customers', icon: '☺', perm: 'loyalty' },
      { to: '/admin/vouchers', label: 'Vouchers', icon: '%', perm: 'loyalty_config' },
      { to: '/admin/texts', label: 'Texts', icon: '✉', perm: 'loyalty_config' },
      { to: '/admin/gov-discounts', label: 'Senior & PWD', icon: '♿', perm: 'sales' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { to: '/admin/inventory', label: 'Inventory', icon: '▦', end: true, perm: 'stock' },
      { to: '/admin/inventory/transfers', label: 'Transfers', icon: '⇄', perm: 'stock' },
      { to: '/admin/inventory/log', label: 'Stock history', icon: '↺', perm: 'stock' },
    ],
  },
  {
    title: 'Store setup',
    items: [
      { to: '/admin/branding', label: 'Branding', icon: '◉', perm: 'branding' },
      { to: '/admin/staff', label: 'Staff', icon: '♟' },
      { to: '/admin/attendance', label: 'Attendance', icon: '◷', perm: ['attendance_own', 'attendance_team'] },
      { to: '/admin/schedule', label: 'Schedule', icon: '▦', perm: ['schedule_own', 'schedule_team'] },
      { to: '/admin/order-types', label: 'Order methods', icon: '⇢', perm: 'branding' },
      { to: '/admin/outlets', label: 'Branches', icon: '⌂', perm: 'branding' },
      { to: '/admin/receipt-editor', label: 'Receipt studio', icon: '▭', perm: 'branding' },
      { to: '/admin/qr-codes', label: 'QR codes', icon: '▩', perm: 'branding' },
      { to: '/admin/mcp', label: 'Connect AI & backup', icon: '✦', perm: 'branding' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { to: '/admin/sync', label: 'Connect devices', icon: '⇆', perm: 'branding' },
      { to: '/admin/appearance', label: 'Appearance', icon: '◐' },
      { to: '/admin/settings', label: 'Store settings', icon: '⚙', perm: 'branding' },
      { to: '/admin/learn', label: 'Learn', icon: '?' },
    ],
  },
];

const ROLE_LABEL = { owner: 'Owner/Superadmin', admin: 'Admin', staff: 'Staff' } as const;
export const roleLabel = (r: keyof typeof ROLE_LABEL) => ROLE_LABEL[r];

export function allowed(item: NavItem, u: ReturnType<typeof currentUser>) {
  if (!item.perm) return item.to !== '/admin/staff' || u?.role !== 'staff';
  const perms = Array.isArray(item.perm) ? item.perm : [item.perm];
  return perms.some((p) => can(u, p));
}

export function applyAdminTheme() {
  try {
    const u = currentUser();
    const t = localStorage.getItem(`gs.theme.${u?.id ?? 'anon'}`) ?? 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch {
    /* ignore */
  }
}

export default function AdminLayout() {
  const b = useDB((d) => d.branding);
  const u = useUser();
  const pending = useDB((d) => d.orders.filter((o) => o.status === 'pending').length);
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!u) nav('/admin/login', { replace: true, state: { from: loc.pathname } });
  }, [u, loc.pathname, nav]);
  useEffect(() => {
    applyAdminTheme();
    return () => document.documentElement.removeAttribute('data-theme');
  }, [u?.id]);

  if (!u) return null;
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => allowed(i, u)) })).filter((s) => s.items.length);
  const here = NAV.flatMap((s) => s.items).find((i) => i.to === loc.pathname);
  const blocked = here && !allowed(here, u);

  return (
    <div className="admin">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">{b.adminLogo || b.logo ? <img src={b.adminLogo || b.logo} alt="" /> : 'G'}</div>
          <div>
            {b.storeName}
            <small>Admin console</small>
          </div>
        </div>
        <div className="store-chip">
          <span className="dot" />
          <div className="grow" style={{ minWidth: 0 }}>
            <b style={{ fontSize: 13 }}>{b.storeName}</b>
            <small>Store management</small>
          </div>
        </div>
        {sections.map((sec) => (
          <div key={sec.title}>
            <div className="nav-sec">{sec.title}</div>
            {sec.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end} className="nav-link">
                <span className="ni">{it.icon}</span>
                {it.label}
                {it.to === '/admin/orders' && pending > 0 && <span className="badge red" style={{ marginLeft: 'auto', height: 20 }}>{pending}</span>}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="side-user">
          <div className="av">{u.name.slice(0, 1).toUpperCase()}</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <b>{u.name}</b>
            <small>{roleLabel(u.role)}</small>
          </div>
          <a href="#/" target="_blank" rel="noreferrer" title="Open live shop">↗</a>
        </div>
      </aside>
      {open && <div className="overlay" style={{ zIndex: 40, background: 'rgba(0,0,0,.25)' }} onClick={() => setOpen(false)} />}
      <main className="main">
        <div className="page">
          <div className="console-head">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <button className="btn icon hamburger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
              <div>
                <div className="eyebrow">{b.storeName} · Admin console</div>
                <h1>Welcome, {u.name}</h1>
              </div>
            </div>
            <Link to="/" className="round-x" aria-label="Close admin and open shop">✕</Link>
          </div>
          {blocked ? (
            <div className="card pad"><b>You don't have access to this page.</b><p className="muted">Ask an Owner/Superadmin to enable it for your account in Staff.</p></div>
          ) : (
            <Outlet />
          )}
          <div className="console-foot">
            <span>Signed in as {roleLabel(u.role)} · Last synced now</span>
            <button onClick={() => { logout(true); nav('/admin/login'); }}>Sign out &amp; clear saved data</button>
          </div>
        </div>
      </main>
    </div>
  );
}
