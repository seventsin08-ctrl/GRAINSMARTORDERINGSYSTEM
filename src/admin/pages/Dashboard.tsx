import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB, useUser } from '../../store/db';
import type { Order } from '../../store/types';
import { Card, Empty, Seg, Stat } from '../../components/ui';
import { moneyShort, pctChange, rangeDays, rangeStart } from '../../lib/format';

export const counted = (o: Order) => o.status !== 'cancelled';

export function inRange(orders: Order[], from: number, to = Infinity) {
  return orders.filter((o) => counted(o) && o.createdAt >= from && o.createdAt < to);
}

export function bestSellers(orders: Order[]) {
  const m = new Map<string, { name: string; qty: number; sales: number }>();
  for (const o of orders)
    for (const l of o.lines) {
      const cur = m.get(l.itemId) ?? { name: l.name, qty: 0, sales: 0 };
      cur.qty += l.qty;
      cur.sales += (l.unitPrice + l.addons.reduce((s, a) => s + a.price, 0)) * l.qty;
      m.set(l.itemId, cur);
    }
  return [...m.values()].sort((a, b) => b.qty - a.qty);
}

export function Hours({ orders }: { orders: Order[] }) {
  const hours = Array.from({ length: 24 }, (_, h) => orders.filter((o) => new Date(o.createdAt).getHours() === h).length);
  const max = Math.max(1, ...hours);
  const shown = hours.map((v, h) => ({ v, h })).slice(6, 23);
  return (
    <>
      <div className="chart">
        {shown.map(({ v, h }) => (
          <div key={h} className="b" style={{ height: `${(v / max) * 100}%` }}>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className="chart-x">
        {shown.map(({ h }) => (
          <span key={h}>{h % 12 || 12}{h < 12 ? 'a' : 'p'}</span>
        ))}
      </div>
    </>
  );
}

export function DailyChart({ orders, days }: { orders: Order[]; days: number }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const n = Math.min(days, 30);
  const buckets = Array.from({ length: n }, (_, i) => {
    const d0 = start.getTime() - (n - 1 - i) * 86400000;
    const v = orders.filter((o) => o.createdAt >= d0 && o.createdAt < d0 + 86400000).reduce((s, o) => s + o.total, 0);
    return { d0, v };
  });
  const max = Math.max(1, ...buckets.map((b) => b.v));
  return (
    <>
      <div className="chart">
        {buckets.map((b) => (
          <div key={b.d0} className="b" style={{ height: `${(b.v / max) * 100}%` }}>
            <span>{moneyShort(b.v)}</span>
          </div>
        ))}
      </div>
      <div className="chart-x">
        {buckets.map((b, i) => (
          <span key={b.d0}>{n <= 7 || i % 5 === 0 ? new Date(b.d0).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : ''}</span>
        ))}
      </div>
    </>
  );
}

export default function Dashboard() {
  const db = useDB((d) => d);
  const u = useUser();
  const [range, setRange] = useState('7d');
  const [, setTick] = useState(0);
  const from = rangeStart(range);
  const len = rangeDays(range) * 86400000;
  const all = inRange(db.orders, from);
  const cur = all.filter((o) => o.paid);
  const prev = inRange(db.orders, from - len, from).filter((o) => o.paid);
  const sales = cur.reduce((s, o) => s + o.total, 0);
  const prevSales = prev.reduce((s, o) => s + o.total, 0);
  const awaiting = all.filter((o) => !o.paid).length;
  const inProgress = db.orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
  const lowStock = db.items.filter((i) => i.trackStock && (i.stock[db.settings.activeBranchId] ?? 0) <= i.lowStockAt);
  const best = bestSellers(cur).slice(0, 6);
  const newCust = db.customers.filter((c) => c.createdAt >= from).length;
  const days = Array.from(new Set(cur.map((o) => new Date(o.createdAt).toISOString().slice(0, 10)))).sort().reverse().slice(0, 7);
  const byDay = days.map((d) => ({ d, v: cur.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === d).reduce((s, o) => s + o.total, 0) }));
  const maxDay = Math.max(1, ...byDay.map((x) => x.v));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good day' : 'Good evening';

  const todos = [
    { to: '/admin/menu', t: 'Review your menu', d: 'Keep products and availability up to date.', i: '+' },
    { to: '/admin/loyalty', t: 'Build customer loyalty', d: 'Manage your configurable rewards program.', i: '✧' },
    lowStock.length > 0 && { to: '/admin/inventory', t: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} running low`, d: lowStock.slice(0, 3).map((i) => i.name).join(', '), i: '!' },
    db.orders.some((o) => o.status === 'pending') && { to: '/admin/orders', t: 'Orders waiting', d: 'New orders need your attention.', i: '▤' },
    !db.cashSessions.some((s) => !s.closedAt) && { to: '/admin/cash', t: 'Open the register', d: 'Start a cashier session before accepting cash.', i: '₱' },
  ].filter(Boolean) as { to: string; t: string; d: string; i: string }[];

  const statCard = (ic: string, bg: string, label: string, v: string | number, sub: string) => (
    <div className="card stat">
      <div className="ic" style={{ background: bg }}>{ic}</div>
      <div className="small muted">{label}</div>
      <div className="v" style={{ fontSize: 24 }}>{v}</div>
      <div className="small faint" style={{ clear: 'both', paddingLeft: 50 }}>{sub}</div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Shop overview</div>
          <h1>{greet}, {u?.name}</h1>
          <p>A clear look at how your store is doing.</p>
        </div>
        <button className="btn outline lg" onClick={() => setTick((t) => t + 1)}>↻ Refresh</button>
      </div>

      <Link to="/admin/orders" className="card pad row between" style={{ marginBottom: 22, color: 'inherit', textDecoration: 'none' }}>
        <div className="row">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fill)', display: 'grid', placeItems: 'center' }}>▣</div>
          <div>
            <div className="strong">{inProgress.length} orders in progress</div>
            <div className="muted small">{cur.length} paid orders in this period · {moneyShort(sales)}</div>
          </div>
        </div>
        <span className="strong">Open orders →</span>
      </Link>

      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <span className="muted small">Compared with the previous period · {pctChange(sales, prevSales)} sales</span>
        <Seg value={range} onChange={setRange} options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        {statCard('♙', 'rgba(232,140,120,.18)', 'Paid sales', moneyShort(sales), `${cur.length} paid orders`)}
        {statCard('₱', 'var(--green-soft)', 'Orders', all.length, `${awaiting} awaiting payment`)}
        {statCard('◷', 'var(--orange-soft)', 'Average paid order', moneyShort(cur.length ? sales / cur.length : 0), 'For the selected period')}
        {statCard('◇', 'var(--accent-soft)', 'Low stock items', lowStock.length, 'Check inventory')}
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <Card title="To do" actions={<span className="small muted">Quick actions</span>}>
          <div className="stack">
            {todos.map((t) => (
              <Link key={t.t} to={t.to} className="row" style={{ color: 'inherit', textDecoration: 'none', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--fill)', display: 'grid', placeItems: 'center' }}>{t.i}</span>
                <div className="grow">
                  <div className="strong">{t.t}</div>
                  <div className="small muted">{t.d}</div>
                </div>
                <span className="muted">›</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Best sellers" actions={<Link to="/admin/reports" className="small strong">View report →</Link>}>
          {best.length === 0 ? <p className="muted">No paid sales in this period yet.</p> : (
            <div className="stack">
              {best.map((b, i) => (
                <div key={b.name} className="row">
                  <span className="badge" style={{ width: 24, justifyContent: 'center' }}>{i + 1}</span>
                  <span className="grow">{b.name}</span>
                  <span className="strong">{b.qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <Card title="Recent orders" actions={<Link to="/admin/orders" className="small strong">Open orders →</Link>}>
          {db.orders.length === 0 ? <p className="muted">No orders yet. Place one from the shop to see it here.</p> : (
            <div className="stack">
              {db.orders.slice(0, 6).map((o) => (
                <div key={o.id} className="row">
                  <span className="mono small" style={{ width: 48 }}>#{o.code}</span>
                  <span className="grow" style={{ background: 'var(--fill)', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>{o.status === 'pending' ? 'new' : o.status}</span>
                  <span className="strong mono">{moneyShort(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Sales by day" actions={<Link to="/admin/reports" className="small strong">View report →</Link>}>
          {byDay.length === 0 ? <p className="muted">No paid sales in this period yet.</p> : (
            <div className="stack">
              {byDay.map((x) => (
                <div key={x.d} className="row">
                  <span className="small" style={{ width: 84 }}>{x.d}</span>
                  <div className="bar grow" style={{ height: 8 }}><i style={{ width: `${(x.v / maxDay) * 100}%`, background: '#7f9f78' }} /></div>
                  <span className="strong mono small">{moneyShort(x.v)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Busiest hours">{cur.length ? <Hours orders={cur} /> : <Empty icon="◷" title="No paid orders in this period yet">Your rush hours show up here once orders are paid.</Empty>}</Card>
        <Card title="Customers">
          <div className="grid g2">
            <Stat value={newCust} label="New customers" />
            <Stat value={db.customers.length} label="All customers" />
          </div>
        </Card>
      </div>
    </>
  );
}
