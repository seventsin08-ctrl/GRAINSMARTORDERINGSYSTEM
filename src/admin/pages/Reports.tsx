import { useState } from 'react';
import { uid, update, useDB } from '../../store/db';
import type { CashEntry, Expense } from '../../store/types';
import { Card, Empty, Field, Modal, PageHead, Seg, Stat } from '../../components/ui';
import { downloadCSV, fmtDate, money, moneyShort, pctChange, rangeDays, rangeStart, today } from '../../lib/format';
import { bestSellers, DailyChart, Hours, inRange } from './Dashboard';

const RANGES = [{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }];

export function Sales() {
  const db = useDB((d) => d);
  const [range, setRange] = useState('30d');
  const from = rangeStart(range);
  const len = rangeDays(range) * 86400000;
  const cur = inRange(db.orders, from);
  const prev = inRange(db.orders, from - len, from);
  const sales = cur.reduce((s, o) => s + o.total, 0);
  const prevSales = prev.reduce((s, o) => s + o.total, 0);
  const discounts = cur.reduce((s, o) => s + o.discount, 0);
  const avg = cur.length ? sales / cur.length : 0;
  const items = bestSellers(cur);
  const byPm = db.paymentMethods.map((p) => ({ name: p.name, n: cur.filter((o) => o.paymentMethodId === p.id).length, v: cur.filter((o) => o.paymentMethodId === p.id).reduce((s, o) => s + o.total, 0) }));
  const byType = db.orderTypes.map((t) => ({ name: t.name, n: cur.filter((o) => o.orderTypeId === t.id).length, v: cur.filter((o) => o.orderTypeId === t.id).reduce((s, o) => s + o.total, 0) }));
  const cancelled = db.orders.filter((o) => o.status === 'cancelled' && o.createdAt >= from).length;

  return (
    <>
      <PageHead
        title="Sales"
        sub="How much you sold, what sold, and how people paid."
        actions={
          <>
            <Seg value={range} onChange={setRange} options={RANGES} />
            <button className="btn" onClick={() => downloadCSV('sales-by-item.csv', [['Item', 'Qty', 'Sales'], ...items.map((i) => [i.name, i.qty, i.sales])])}>Export</button>
          </>
        }
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat value={moneyShort(sales)} label="Net sales" delta={pctChange(sales, prevSales)} good={sales >= prevSales} />
        <Stat value={cur.length} label="Orders" delta={pctChange(cur.length, prev.length)} good={cur.length >= prev.length} />
        <Stat value={money(avg)} label="Average order" />
        <Stat value={moneyShort(discounts)} label={`Discounts · ${cancelled} cancelled`} />
      </div>
      <div className="grid g2" style={{ marginBottom: 16 }}>
        <Card title="Daily sales">{cur.length ? <DailyChart orders={cur} days={rangeDays(range)} /> : <Empty title="No sales yet" />}</Card>
        <Card title="By hour">{cur.length ? <Hours orders={cur} /> : <Empty title="No sales yet" />}</Card>
      </div>
      <div className="grid g3">
        <Card title="Items" pad={false}>
          <table className="table">
            <thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Sales</th></tr></thead>
            <tbody>{items.map((i) => <tr key={i.name}><td>{i.name}</td><td className="right">{i.qty}</td><td className="right mono">{moneyShort(i.sales)}</td></tr>)}</tbody>
          </table>
          {!items.length && <Empty title="Nothing sold yet" />}
        </Card>
        <Card title="Payment methods" pad={false}>
          <table className="table"><tbody>{byPm.map((p) => <tr key={p.name}><td>{p.name}</td><td className="right muted">{p.n}</td><td className="right mono">{moneyShort(p.v)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Order types" pad={false}>
          <table className="table"><tbody>{byType.map((p) => <tr key={p.name}><td>{p.name}</td><td className="right muted">{p.n}</td><td className="right mono">{moneyShort(p.v)}</td></tr>)}</tbody></table>
        </Card>
      </div>
    </>
  );
}

export function Cash() {
  const db = useDB((d) => d);
  const [date, setDate] = useState(today());
  const [add, setAdd] = useState<CashEntry | null>(null);
  const d0 = new Date(date + 'T00:00:00').getTime();
  const dayOrders = inRange(db.orders, d0, d0 + 86400000).filter((o) => o.paid && o.branchId === db.settings.activeBranchId);
  const cashSales = dayOrders.filter((o) => o.paymentMethodName.toLowerCase() === 'cash').reduce((s, o) => s + o.total, 0);
  const entries = db.cash.filter((c) => c.date === date && c.branchId === db.settings.activeBranchId);
  const sum = (t: CashEntry['type']) => entries.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0);
  const expected = sum('opening') + cashSales - sum('payout') - sum('remit');
  const closing = entries.find((e) => e.type === 'closing');
  const variance = closing ? closing.amount - expected : 0;
  const branch = db.branches.find((b) => b.id === db.settings.activeBranchId);

  return (
    <>
      <PageHead
        title="Cash & remits"
        sub={`Count the drawer, record remits and pay-outs, and see if anything is short. Branch: ${branch?.name ?? ''}`}
        actions={
          <>
            <input type="date" className="input" style={{ width: 170 }} value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="btn primary" onClick={() => setAdd({ id: uid('ca'), date, type: 'opening', amount: 0, staffName: '', note: '', branchId: db.settings.activeBranchId })}>+ Record</button>
          </>
        }
      />
      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Stat value={moneyShort(sum('opening'))} label="Opening cash" />
        <Stat value={moneyShort(cashSales)} label="Cash sales (paid)" />
        <Stat value={moneyShort(sum('remit') + sum('payout'))} label="Remits & pay-outs" />
        <Stat value={moneyShort(expected)} label="Expected in drawer" />
        <div className="card stat">
          <div className={`v ${!closing ? '' : variance === 0 ? 'up' : 'down'}`}>{closing ? money(variance) : '—'}</div>
          <div className="l">{closing ? (variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short') : 'Not closed yet'}</div>
        </div>
      </div>
      <Card title="Entries" pad={false}>
        <table className="table">
          <thead><tr><th>Type</th><th>By</th><th>Note</th><th className="right">Amount</th><th /></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td><span className={`badge ${e.type === 'remit' ? 'blue' : e.type === 'payout' ? 'orange' : e.type === 'closing' ? 'purple' : 'green'}`}>{e.type}</span></td>
                <td>{e.staffName}</td>
                <td className="muted">{e.note}</td>
                <td className="right mono">{money(e.amount)}</td>
                <td className="right"><button className="btn sm ghost" onClick={() => update((d) => { d.cash = d.cash.filter((x) => x.id !== e.id); })}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <Empty icon="₱" title="Nothing recorded for this day">Start with the opening cash in the drawer.</Empty>}
      </Card>
      {add && (
        <Modal title="Record cash" onClose={() => setAdd(null)} footer={<button className="btn primary" onClick={() => { update((d) => { d.cash.push(add); }); setAdd(null); }}>Save</button>}>
          <Field label="Type">
            <Seg value={add.type} onChange={(type) => setAdd({ ...add, type })} options={[{ value: 'opening', label: 'Opening' }, { value: 'remit', label: 'Remit' }, { value: 'payout', label: 'Pay-out' }, { value: 'closing', label: 'Closing count' }]} />
          </Field>
          <Field label="Amount"><input className="input" type="number" value={add.amount} onChange={(e) => setAdd({ ...add, amount: +e.target.value })} autoFocus /></Field>
          <Field label="Staff">
            <select className="input" value={add.staffName} onChange={(e) => setAdd({ ...add, staffName: e.target.value })}>
              <option value="">—</option>
              {db.staff.map((s) => <option key={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Note"><input className="input" value={add.note} onChange={(e) => setAdd({ ...add, note: e.target.value })} /></Field>
        </Modal>
      )}
    </>
  );
}

const EXP_CATS = ['Ingredients', 'Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Other'];

export function Expenses() {
  const db = useDB((d) => d);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [range, setRange] = useState('30d');
  const from = new Date(rangeStart(range)).toISOString().slice(0, 10);
  const list = db.expenses.filter((e) => e.date >= from).sort((a, b) => b.date.localeCompare(a.date));
  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCat = EXP_CATS.map((c) => ({ c, v: list.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v > 0);
  return (
    <>
      <PageHead
        title="Expenses"
        sub="Everything you spend to run the store, so profit is real profit."
        actions={
          <>
            <Seg value={range} onChange={setRange} options={RANGES} />
            <button className="btn primary" onClick={() => setEdit({ id: uid('ex'), date: today(), category: 'Ingredients', description: '', amount: 0, branchId: db.settings.activeBranchId })}>+ Add expense</button>
          </>
        }
      />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat value={moneyShort(total)} label="Total spent" />
        <div className="card pad" style={{ gridColumn: 'span 2' }}>
          {byCat.length ? byCat.map((x) => (
            <div key={x.c} style={{ marginBottom: 8 }}>
              <div className="row between small"><span>{x.c}</span><span className="mono">{moneyShort(x.v)}</span></div>
              <div className="bar"><i style={{ width: `${(x.v / total) * 100}%` }} /></div>
            </div>
          )) : <span className="muted">No expenses in this period.</span>}
        </div>
      </div>
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Branch</th><th className="right">Amount</th><th /></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(new Date(e.date + 'T00:00:00').getTime())}</td>
                <td><span className="badge">{e.category}</span></td>
                <td>{e.description}</td>
                <td className="muted">{db.branches.find((b) => b.id === e.branchId)?.name}</td>
                <td className="right mono">{money(e.amount)}</td>
                <td className="right"><button className="btn sm" onClick={() => setEdit(e)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <Empty icon="⇣" title="No expenses recorded" />}
      </Card>
      {edit && (
        <Modal
          title="Expense"
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn danger" onClick={() => { update((d) => { d.expenses = d.expenses.filter((x) => x.id !== edit.id); }); setEdit(null); }}>Delete</button>
              <span className="grow" />
              <button className="btn primary" onClick={() => { update((d) => { const i = d.expenses.findIndex((x) => x.id === edit.id); if (i >= 0) d.expenses[i] = edit; else d.expenses.push(edit); }); setEdit(null); }}>Save</button>
            </>
          }
        >
          <div className="grid g2">
            <Field label="Date"><input className="input" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
            <Field label="Amount"><input className="input" type="number" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: +e.target.value })} /></Field>
          </div>
          <Field label="Category"><select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <Field label="Branch"><select className="input" value={edit.branchId} onChange={(e) => setEdit({ ...edit, branchId: e.target.value })}>{db.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        </Modal>
      )}
    </>
  );
}

export function Profit() {
  const db = useDB((d) => d);
  const [range, setRange] = useState('30d');
  const from = rangeStart(range);
  const cur = inRange(db.orders, from);
  const sales = cur.reduce((s, o) => s + o.total, 0);
  const cogs = cur.reduce((s, o) => s + o.cost, 0);
  const fromDate = new Date(from).toISOString().slice(0, 10);
  const expenses = db.expenses.filter((e) => e.date >= fromDate).reduce((s, e) => s + e.amount, 0);
  const gross = sales - cogs;
  const net = gross - expenses;
  const items = bestSellers(cur).map((i) => {
    const it = db.items.find((x) => x.name === i.name);
    const cost = (it?.cost ?? 0) * i.qty;
    return { ...i, profit: i.sales - cost, margin: i.sales ? ((i.sales - cost) / i.sales) * 100 : 0 };
  }).sort((a, b) => b.profit - a.profit);
  return (
    <>
      <PageHead title="Profit" sub="Sales minus what the food cost and what you spent." actions={<Seg value={range} onChange={setRange} options={RANGES} />} />
      <div className="grid g5" style={{ marginBottom: 16 }}>
        <Stat value={moneyShort(sales)} label="Sales" />
        <Stat value={moneyShort(cogs)} label="Cost of goods" />
        <Stat value={moneyShort(gross)} label={`Gross profit · ${sales ? Math.round((gross / sales) * 100) : 0}%`} />
        <Stat value={moneyShort(expenses)} label="Expenses" />
        <div className="card stat"><div className={`v ${net >= 0 ? 'up' : 'down'}`}>{moneyShort(net)}</div><div className="l">Net profit</div></div>
      </div>
      <Card title="Most profitable items" pad={false}>
        <table className="table">
          <thead><tr><th>Item</th><th className="right">Sold</th><th className="right">Sales</th><th className="right">Profit</th><th className="right">Margin</th></tr></thead>
          <tbody>{items.map((i) => <tr key={i.name}><td>{i.name}</td><td className="right">{i.qty}</td><td className="right mono">{moneyShort(i.sales)}</td><td className="right mono">{moneyShort(i.profit)}</td><td className="right">{Math.round(i.margin)}%</td></tr>)}</tbody>
        </table>
        {!items.length && <Empty title="No sales in this period yet" />}
      </Card>
    </>
  );
}
