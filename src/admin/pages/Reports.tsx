import { useState } from 'react';
import { can, sessionExpected, uid, update, useDB, useUser } from '../../store/db';
import type { Expense, Order } from '../../store/types';
import { Card, Empty, Field, PageHead, Seg, confirmAction, toast } from '../../components/ui';
import { downloadCSV, fmtDate, fmtDateTime, money, moneyShort, today } from '../../lib/format';
import { bestSellers, DailyChart, Hours } from './Dashboard';

const dayStr = (t: number) => new Date(t).toISOString().slice(0, 10);
const daysAgo = (n: number) => dayStr(Date.now() - n * 86400000);

function useRange(initial = 6) {
  const [from, setFrom] = useState(daysAgo(initial));
  const [to, setTo] = useState(today());
  const start = new Date(from + 'T00:00:00').getTime();
  const end = new Date(to + 'T00:00:00').getTime() + 86400000;
  const quick = (v: string) => {
    const n = v === 'today' ? 0 : v === '7d' ? 6 : v === '30d' ? 29 : 89;
    setFrom(daysAgo(n));
    setTo(today());
  };
  const picker = (
    <div className="row">
      <input type="date" className="input" style={{ width: 160 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" className="input" style={{ width: 160 }} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
    </div>
  );
  return { from, to, start, end, quick, picker };
}

const inWindow = (orders: Order[], s: number, e: number) => orders.filter((o) => o.status !== 'cancelled' && o.createdAt >= s && o.createdAt < e);

export function Sales() {
  const db = useDB((d) => d);
  const u = useUser();
  const r = useRange();
  const [q, setQ] = useState('7d');
  const all = inWindow(db.orders, r.start, r.end);
  const paid = all.filter((o) => o.paid);
  const len = r.end - r.start;
  const prevPaid = inWindow(db.orders, r.start - len, r.start).filter((o) => o.paid);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevPaid.reduce((s, o) => s + o.total, 0);
  const cancelled = db.orders.filter((o) => o.status === 'cancelled' && o.createdAt >= r.start && o.createdAt < r.end).length;
  const items = bestSellers(paid);
  const byPm = db.paymentMethods.map((p) => ({ name: p.name, n: paid.filter((o) => o.paymentMethodId === p.id).length, v: paid.filter((o) => o.paymentMethodId === p.id).reduce((s, o) => s + o.total, 0) }));
  const byType = db.orderTypes.map((t) => ({ name: t.name, n: paid.filter((o) => o.orderTypeId === t.id).length, v: paid.filter((o) => o.orderTypeId === t.id).reduce((s, o) => s + o.total, 0) }));
  const days = Math.max(1, Math.round(len / 86400000));
  const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? '—';
  const stat = (ic: string, bg: string, l: string, v: string | number, sub: string) => (
    <div className="card stat"><div className="ic" style={{ background: bg }}>{ic}</div><div className="small muted">{l}</div><div className="v" style={{ fontSize: 24 }}>{v}</div><div className="small faint" style={{ clear: 'both', paddingLeft: 50 }}>{sub}</div></div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Sales overview</div>
          <h1>Sales reports</h1>
          <p>{r.from} to {r.to} · Paid revenue and product activity.</p>
        </div>
        {r.picker}
      </div>

      <div className="card pad row between wrap" style={{ marginBottom: 14 }}>
        <div className="row">
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fill)', display: 'grid', placeItems: 'center' }}>▤</span>
          <div><b>Choose a report format</b><div className="small muted">Download a PDF or a CSV file for Google Sheets.</div></div>
        </div>
        <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary lg" onClick={() => downloadCSV(`sales-${r.from}-to-${r.to}.csv`, [
            ['Date', 'Order code', 'Method', 'Customer', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment', 'Status'],
            ...paid.map((o) => [fmtDateTime(o.createdAt), o.code, o.orderTypeName, o.customerName, o.lines.map((l) => `${l.qty}x ${l.name}`).join('; '), o.subtotal, o.discount, o.total, o.paymentStatus, o.status]),
            [], ['Item', 'Qty', 'Sales'], ...items.map((i) => [i.name, i.qty, i.sales]),
          ])}>Download CSV for Google Sheets</button>
          <button className="btn outline lg" onClick={() => window.print()}>Print / Save as PDF</button>
          <button className="btn outline lg" onClick={() => downloadCSV('staff-clock-times.csv', [['Staff', 'Clock in', 'Clock out', 'Hours'], ...db.shifts.filter((s) => s.clockIn >= r.start && s.clockIn < r.end).map((s) => [name(s.staffId), fmtDateTime(s.clockIn), s.clockOut ? fmtDateTime(s.clockOut) : 'still clocked in', s.clockOut ? ((s.clockOut - s.clockIn) / 3600000).toFixed(2) : ''])])}>Staff clock times CSV</button>
        </div>
      </div>

      {u?.role === 'owner' && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="row between"><b>Reset sales data</b><span className="small muted">Owner only</span></div>
          <p className="small muted">Clear order history and paid sales. Cash session and expense history stay.</p>
          <button className="btn solid-red lg" onClick={() => confirmAction('Delete ALL orders and sales history? This cannot be undone.') && update((d) => { d.orders = []; d.govLog = []; d.nextOrderNumber = 101; })}>Reset all sales</button>
        </div>
      )}

      <div className="row between wrap" style={{ margin: '20px 0 14px' }}>
        <span className="small muted">Compared with the previous period · {prevRevenue ? `${Math.round(((revenue - prevRevenue) / prevRevenue) * 100)}%` : '—'}</span>
        <Seg value={q} onChange={(v) => { setQ(v); r.quick(v); }} options={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />
      </div>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        {stat('₱', 'rgba(232,140,120,.18)', 'Paid revenue', moneyShort(revenue), 'Selected date range')}
        {stat('▣', 'var(--green-soft)', 'Paid orders', paid.length, 'Completed payments')}
        {stat('◷', 'var(--orange-soft)', 'Average paid order', moneyShort(paid.length ? revenue / paid.length : 0), 'Revenue ÷ paid orders')}
        {stat('⌛', 'var(--accent-soft)', 'Awaiting payment', all.length - paid.length, `${cancelled} cancelled`)}
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <Card title="Daily revenue">{paid.length ? <DailyChart orders={paid.filter((o) => o.createdAt >= r.end - Math.min(days, 30) * 86400000)} days={Math.min(days, 30)} /> : <Empty title="No paid sales yet" />}</Card>
        <Card title="By hour">{paid.length ? <Hours orders={paid} /> : <Empty title="No paid sales yet" />}</Card>
      </div>
      <div className="grid g3">
        <Card title="Products" pad={false}>
          <table className="table"><thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Sales</th></tr></thead>
            <tbody>{items.map((i) => <tr key={i.name}><td>{i.name}</td><td className="right">{i.qty}</td><td className="right mono">{moneyShort(i.sales)}</td></tr>)}</tbody></table>
          {!items.length && <Empty title="Nothing sold yet" />}
        </Card>
        <Card title="Payment methods" pad={false}><table className="table"><tbody>{byPm.map((p) => <tr key={p.name}><td>{p.name}</td><td className="right muted">{p.n}</td><td className="right mono">{moneyShort(p.v)}</td></tr>)}</tbody></table></Card>
        <Card title="Order methods" pad={false}><table className="table"><tbody>{byType.map((p) => <tr key={p.name}><td>{p.name}</td><td className="right muted">{p.n}</td><td className="right mono">{moneyShort(p.v)}</td></tr>)}</tbody></table></Card>
      </div>
    </>
  );
}

export function Cash() {
  const db = useDB((d) => d);
  const u = useUser();
  const open = db.cashSessions.find((s) => !s.closedAt);
  const [float, setFloat] = useState('');
  const [note, setNote] = useState('');
  const [mv, setMv] = useState({ type: 'remit' as 'in' | 'out' | 'remit', amount: '', note: '' });
  const [counted, setCounted] = useState('');
  const viewAll = can(u, 'cash_view_all');
  const history = db.cashSessions.filter((s) => s.closedAt && (viewAll || s.openedBy === u?.name)).sort((a, b) => b.openedAt - a.openedAt);
  const expected = open ? sessionExpected(db, open.id) : 0;
  const cashSales = open ? db.orders.filter((o) => o.paymentStatus === 'cash' && o.status !== 'cancelled' && o.updatedAt >= open.openedAt).reduce((a, o) => a + o.total, 0) : 0;

  return (
    <>
      <PageHead title="Cash & remits" sub="Open a register session, record cash movements, and reconcile the drawer at close." />
      {!open ? (
        <div className="card pad" style={{ maxWidth: 740 }}>
          <h3 className="h-serif" style={{ fontSize: 22 }}>Open register</h3>
          <p style={{ fontSize: 16 }}>Start a cashier session before accepting cash payments.</p>
          <div className="stack">
            <Field label="Opening cash float (₱)"><input className="input" type="number" min={0} placeholder="0.00" value={float} onChange={(e) => setFloat(e.target.value)} /></Field>
            <Field label="Opening note"><input className="input" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <button className="btn primary lg" style={{ alignSelf: 'flex-start' }} onClick={() => { update((d) => { d.cashSessions.push({ id: uid('cs'), openedAt: Date.now(), openedBy: u?.name ?? 'staff', float: Number(float) || 0, note, movements: [] }); }); setFloat(''); setNote(''); toast('Register opened'); }}>Open cash session</button>
          </div>
        </div>
      ) : (
        <div className="grid g2">
          <div className="card pad stack">
            <div className="row between"><h3 className="h-serif" style={{ fontSize: 22 }}>Register open</h3><span className="badge green">● Open</span></div>
            <div className="small muted">Opened by {open.openedBy} · {fmtDateTime(open.openedAt)} {open.note && `· ${open.note}`}</div>
            <div className="grid g2">
              <div><div className="small muted">Opening float</div><div className="v h-serif" style={{ fontSize: 24 }}>{money(open.float)}</div></div>
              <div><div className="small muted">Cash sales</div><div className="v h-serif" style={{ fontSize: 24 }}>{money(cashSales)}</div></div>
              <div><div className="small muted">Movements</div><div className="v h-serif" style={{ fontSize: 24 }}>{money(open.movements.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0))}</div></div>
              <div><div className="small muted">Expected in drawer</div><div className="v h-serif" style={{ fontSize: 24, color: 'var(--accent)' }}>{money(expected)}</div></div>
            </div>
            <div className="divider" />
            <b>Record cash movement</b>
            <Seg value={mv.type} onChange={(type) => setMv({ ...mv, type })} options={[{ value: 'remit', label: 'Remit' }, { value: 'out', label: 'Pay-out' }, { value: 'in', label: 'Cash in' }]} />
            <div className="row">
              <input className="input" type="number" placeholder="Amount" value={mv.amount} onChange={(e) => setMv({ ...mv, amount: e.target.value })} />
              <input className="input" placeholder="Note" value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} />
              <button className="btn outline" disabled={!Number(mv.amount)} onClick={() => { update((d) => { d.cashSessions.find((s) => s.id === open.id)!.movements.push({ id: uid('mv'), at: Date.now(), type: mv.type, amount: Number(mv.amount), note: mv.note, by: u?.name ?? '' }); }); setMv({ ...mv, amount: '', note: '' }); }}>Add</button>
            </div>
            {open.movements.map((m) => <div key={m.id} className="row between small"><span><span className="badge">{m.type}</span> {m.note} · {m.by}</span><span className="mono">{m.type === 'in' ? '+' : '−'}{money(m.amount)}</span></div>)}
          </div>
          <div className="card pad stack">
            <h3 className="h-serif" style={{ fontSize: 22 }}>Close & reconcile</h3>
            <p className="muted" style={{ margin: 0 }}>Count the cash in the drawer and enter the total.</p>
            <Field label="Counted cash (₱)"><input className="input" type="number" value={counted} onChange={(e) => setCounted(e.target.value)} /></Field>
            {counted !== '' && (
              <div className={`badge ${Number(counted) - expected === 0 ? 'green' : 'red'}`} style={{ height: 30, fontSize: 14, alignSelf: 'flex-start' }}>
                {Number(counted) - expected === 0 ? 'Balanced' : Number(counted) > expected ? `Over by ${money(Number(counted) - expected)}` : `Short by ${money(expected - Number(counted))}`}
              </div>
            )}
            <button className="btn primary lg" style={{ alignSelf: 'flex-start' }} disabled={counted === ''} onClick={() => { update((d) => { const s = d.cashSessions.find((x) => x.id === open.id)!; s.closedAt = Date.now(); s.closedBy = u?.name; s.counted = Number(counted); s.expected = expected; }); setCounted(''); toast('Register closed'); }}>Close cash session</button>
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head"><h3>Past sessions</h3>{!viewAll && <span className="small muted">Showing your sessions</span>}</div>
        <table className="table">
          <thead><tr><th>Opened</th><th>By</th><th className="right">Float</th><th className="right">Expected</th><th className="right">Counted</th><th className="right">Difference</th></tr></thead>
          <tbody>{history.map((s) => { const diff = (s.counted ?? 0) - (s.expected ?? 0); return <tr key={s.id}><td>{fmtDateTime(s.openedAt)}</td><td>{s.openedBy}</td><td className="right mono">{money(s.float)}</td><td className="right mono">{money(s.expected ?? 0)}</td><td className="right mono">{money(s.counted ?? 0)}</td><td className={`right mono ${diff === 0 ? '' : diff > 0 ? 'up' : 'down'}`}>{money(diff)}</td></tr>; })}</tbody>
        </table>
        {!history.length && <Empty icon="₱" title="No closed sessions yet" />}
      </div>
    </>
  );
}

const EXP_CATS = ['Ingredients', 'Packaging', 'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'];

export function Expenses() {
  const db = useDB((d) => d);
  const u = useUser();
  const r = useRange(29);
  const blank = (): Expense => ({ id: uid('ex'), date: today(), category: 'Ingredients', description: '', amount: 0, branchId: db.settings.activeBranchId, paidWith: 'digital', at: Date.now() });
  const [f, setF] = useState<Expense>(blank);
  const list = db.expenses.filter((e) => e.date >= r.from && e.date <= r.to).sort((a, b) => b.at - a.at);
  const total = list.reduce((s, e) => s + e.amount, 0);
  const canRecord = can(u, 'expenses_record');
  const openReg = db.cashSessions.some((s) => !s.closedAt);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p>Record operating costs for the selected report dates. Expenses paid in cash are included in the open register.</p>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end' }}>
          <div className="h-serif" style={{ fontSize: 30, color: 'var(--accent)', fontWeight: 700 }}>{money(total)}</div>
          {r.picker}
        </div>
      </div>
      <div className="grid g2">
        {canRecord && (
          <div className="card pad stack">
            <h3 className="h-serif" style={{ fontSize: 22 }}>Add expense</h3>
            <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Amount (₱)"><input className="input" type="number" value={f.amount || ''} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
            <Field label="Paid with" hint={f.paidWith === 'cash' ? (openReg ? 'Will be taken from the open register.' : 'No register is open right now.') : undefined}>
              <select className="input" value={f.paidWith} onChange={(e) => setF({ ...f, paidWith: e.target.value as Expense['paidWith'] })}><option value="digital">Digital</option><option value="cash">Cash</option></select>
            </Field>
            <Field label="Date"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Description"><input className="input" placeholder="What was this expense for?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <button className="btn primary lg" style={{ alignSelf: 'flex-start' }} disabled={!f.amount} onClick={() => { update((d) => { d.expenses.push({ ...f, at: Date.now() }); }); setF(blank()); toast('Expense saved'); }}>Save expense</button>
          </div>
        )}
        <div className="card pad">
          <h3 className="h-serif" style={{ fontSize: 22, marginBottom: 14 }}>Expenses in selected period</h3>
          {!list.length ? <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 24, textAlign: 'center' }} className="small muted">No expenses recorded for these dates.</div> : (
            <div className="stack">
              {list.map((e) => (
                <div key={e.id} className="row" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div className="grow">
                    <div className="strong">{e.category} <span className="badge">{e.paidWith}</span></div>
                    <div className="small muted">{fmtDate(new Date(e.date + 'T00:00:00').getTime())} · {e.description}</div>
                  </div>
                  <b className="mono">{money(e.amount)}</b>
                  {canRecord && <button className="btn sm ghost" onClick={() => update((d) => { d.expenses = d.expenses.filter((x) => x.id !== e.id); })}>✕</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function Profit() {
  const db = useDB((d) => d);
  const r = useRange(6);
  const paid = inWindow(db.orders, r.start, r.end).filter((o) => o.paid);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const costOf = (o: Order) => o.lines.reduce((s, l) => s + (l.unitCost || db.items.find((i) => i.id === l.itemId)?.cost || 0) * l.qty, 0);
  const missing = paid.filter((o) => o.lines.some((l) => !(l.unitCost || db.items.find((i) => i.id === l.itemId)?.cost)));
  const cogs = paid.reduce((s, o) => s + costOf(o), 0);
  const expenses = db.expenses.filter((e) => e.date >= r.from && e.date <= r.to).reduce((s, e) => s + e.amount, 0);
  const net = revenue - cogs - expenses;
  const incomplete = missing.length > 0;
  const box = (l: string, v: string) => <div className="card pad"><div className="small muted">{l}</div><div className="h-serif" style={{ fontSize: 28, marginTop: 6 }}>{v}</div></div>;
  return (
    <>
      <div className="page-head">
        <div><h1>Profit estimate</h1><p>Paid revenue less recorded item costs and expenses for the selected dates.</p></div>
        <div className="stack" style={{ alignItems: 'flex-end' }}>
          <button className="btn" style={{ background: '#f3ecd6', fontWeight: 700 }} onClick={() => downloadCSV(`finance-${r.from}-to-${r.to}.csv`, [['Metric', 'Amount'], ['Paid revenue', revenue], ['Estimated cost of goods', cogs], ['Recorded expenses', expenses], ['Estimated net profit', net], ['Orders missing item cost', missing.length], [], ['Expense date', 'Category', 'Paid with', 'Description', 'Amount'], ...db.expenses.filter((e) => e.date >= r.from && e.date <= r.to).map((e) => [e.date, e.category, e.paidWith, e.description, e.amount])])}>Download finance CSV</button>
          {r.picker}
        </div>
      </div>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        {box('Paid revenue', money(revenue))}
        {box('Estimated cost of goods', money(cogs))}
        {box('Recorded expenses', money(expenses))}
        {box('Estimated net profit', incomplete ? 'Incomplete' : money(net))}
        {box('Profit margin', incomplete || !revenue ? '—' : `${Math.round((net / revenue) * 100)}%`)}
        {box('Orders missing item cost', String(missing.length))}
      </div>
      {incomplete && (
        <div className="card pad" style={{ background: '#fff4e2', borderColor: '#f0d9b0', marginBottom: 14 }}>
          <b style={{ color: '#7a4b12' }}>Profit is incomplete.</b>
          <div className="small" style={{ color: '#7a4b12' }}>{missing.length} paid orders have products without a recorded unit cost. Add costs under Menu → Products; older orders will then use the current product cost.</div>
        </div>
      )}
      <div className="card pad">
        <h3 className="h-serif" style={{ fontSize: 22 }}>How profit is calculated</h3>
        <p style={{ fontSize: 16, marginBottom: 0 }}>Paid sales − item costs − recorded expenses. This is an estimate; unrecorded costs, taxes, and fees are not included.</p>
      </div>
    </>
  );
}
