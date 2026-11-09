import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../../store/db';
import type { Order } from '../../store/types';
import { Card, Empty, Seg, Stat } from '../../components/ui';
import { money, moneyShort, pctChange, rangeDays, rangeStart } from '../../lib/format';

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
  const [range, setRange] = useState('7d');
  const from = rangeStart(range);
  const len = rangeDays(range) * 86400000;
  const cur = inRange(db.orders, from);
  const prev = inRange(db.orders, from - len, from);
  const sales = cur.reduce((s, o) => s + o.total, 0);
  const prevSales = prev.reduce((s, o) => s + o.total, 0);
  const newCust = db.customers.filter((c) => c.createdAt >= from).length;
  const prevNew = db.customers.filter((c) => c.createdAt >= from - len && c.createdAt < from).length;
  const phones = new Set(cur.map((o) => o.customerPhone).filter(Boolean));
  const returning = [...phones].filter((p) => db.orders.some((o) => o.customerPhone === p && o.createdAt < from && counted(o))).length;
  const prevPhones = new Set(prev.map((o) => o.customerPhone).filter(Boolean));
  const prevReturning = [...prevPhones].filter((p) => db.orders.some((o) => o.customerPhone === p && o.createdAt < from - len)).length;
  const inProgress = db.orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
  const todayStart = rangeStart('today');
  const todayOrders = inRange(db.orders, todayStart);
  const textable = db.customers.filter((c) => c.optInTexts && c.phone).length;
  const lowStock = db.items.filter((i) => i.trackStock && (i.stock[db.settings.activeBranchId] ?? 0) <= i.lowStockAt);
  const best = bestSellers(cur).slice(0, 5);
  const byType = db.orderTypes.map((t) => ({ name: t.name, v: cur.filter((o) => o.orderTypeId === t.id).reduce((s, o) => s + o.total, 0) }));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const todos = [
    !db.loyalty.enabled && { to: '/admin/loyalty', t: 'Start a stamp card', d: 'Stamps bring customers back, and they share their number to get them.' },
    db.loyalty.enabled && db.customers.length === 0 && { to: '/admin/loyalty', t: 'Collect your first stamp', d: 'Ask customers for their number at checkout.' },
    lowStock.length > 0 && { to: '/admin/inventory', t: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} running low`, d: lowStock.slice(0, 3).map((i) => i.name).join(', ') },
    !db.branding.logo && { to: '/admin/branding', t: 'Add your logo', d: 'Make the kiosk feel like your store.' },
    db.orders.filter((o) => o.status === 'pending').length > 0 && { to: '/admin/orders', t: 'Orders waiting to be accepted', d: 'New orders need your attention.' },
  ].filter(Boolean) as { to: string; t: string; d: string }[];

  return (
    <>
      <p className="muted" style={{ margin: 0 }}>{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <div className="page-head">
        <div>
          <h1>
            {greet}, {db.branding.storeName}
          </h1>
        </div>
        <a className="btn" href="/kiosk" target="_blank" rel="noreferrer">
          View storefront ↗
        </a>
      </div>

      <Link to="/admin/orders" className="card pad row between" style={{ marginBottom: 24, color: 'inherit', textDecoration: 'none' }}>
        <div className="row">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontSize: 20 }}>☰</div>
          <div>
            <div className="strong" style={{ fontSize: 17 }}>
              {inProgress.length} order{inProgress.length === 1 ? '' : 's'} in progress
            </div>
            <div className="muted small">
              {todayOrders.length} placed today · {money(todayOrders.reduce((s, o) => s + o.total, 0))}
            </div>
          </div>
        </div>
        <span className="btn sm primary">Open orders →</span>
      </Link>

      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <span className="muted small">Compared with the previous {range === 'today' ? 'day' : `${rangeDays(range)} days`}</span>
        <Seg value={range} onChange={setRange} options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
      </div>

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <Stat value={newCust} label="New customers" delta={`${newCust - prevNew >= 0 ? '+' : ''}${newCust - prevNew}`} good={newCust >= prevNew} />
        <Stat value={returning} label="Returning customers" delta={`${returning - prevReturning >= 0 ? '+' : ''}${returning - prevReturning}`} good={returning >= prevReturning} />
        <Stat value={moneyShort(sales)} label="Sales" delta={pctChange(sales, prevSales)} good={sales >= prevSales} />
        <Stat value={cur.length} label="Orders" delta={`${cur.length - prev.length >= 0 ? '+' : ''}${cur.length - prev.length}`} good={cur.length >= prev.length} />
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <Card title="Sales">{cur.length ? <DailyChart orders={cur} days={rangeDays(range)} /> : <Empty icon="◔" title="No sales in this period yet." />}</Card>
        <Card title="To do" actions={<span className="badge">{textable} can be texted</span>}>
          {todos.length === 0 ? (
            <Empty icon="✓" title="You're all caught up" />
          ) : (
            <div className="stack">
              {todos.map((t) => (
                <Link key={t.t} to={t.to} className="row" style={{ color: 'inherit', textDecoration: 'none', padding: 10, borderRadius: 12, background: 'var(--fill)' }}>
                  <div className="grow">
                    <div className="strong">{t.t}</div>
                    <div className="small muted">{t.d}</div>
                  </div>
                  <span className="muted">›</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid g3">
        <Card title="Who's buying">
          <div className="v" style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>{money(sales)}</div>
          {sales === 0 ? (
            <p className="muted">No sales in this period yet.</p>
          ) : (
            <div className="stack">
              {byType.map((t) => (
                <div key={t.name}>
                  <div className="row between small">
                    <span>{t.name}</span>
                    <span className="mono">{moneyShort(t.v)}</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${(t.v / sales) * 100}%` }} />
                  </div>
                </div>
              ))}
              {newCust + returning > 0 && <div className="small muted">{newCust} new · {returning} returning</div>}
            </div>
          )}
        </Card>
        <Card title="Best sellers">
          {best.length === 0 ? (
            <p className="muted">No dishes sold in this period yet.</p>
          ) : (
            <div className="stack">
              {best.map((b, i) => (
                <div key={b.name} className="row">
                  <span className="faint mono" style={{ width: 16 }}>{i + 1}</span>
                  <span className="grow">{b.name}</span>
                  <span className="badge">{b.qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Busiest hours">
          {cur.length === 0 ? (
            <Empty icon="◷" title="No completed orders in this period yet">
              Your rush hours show up here once orders are paid or delivered.
            </Empty>
          ) : (
            <Hours orders={cur} />
          )}
        </Card>
      </div>
      <p className="small faint" style={{ marginTop: 20 }}>Updated live · changes from the kiosk appear instantly</p>
    </>
  );
}
