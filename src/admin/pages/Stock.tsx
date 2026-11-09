import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adjustStock, transferStock, update, useDB } from '../../store/db';
import type { MenuItem, StockLogKind } from '../../store/types';
import { Card, Empty, Field, Modal, PageHead, Seg, toast } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';

function BranchPicker() {
  const branches = useDB((d) => d.branches);
  const active = useDB((d) => d.settings.activeBranchId);
  return (
    <select className="input" style={{ width: 200 }} value={active} onChange={(e) => update((d) => { d.settings.activeBranchId = e.target.value; })}>
      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
}

export function Inventory() {
  const db = useDB((d) => d);
  const [adj, setAdj] = useState<MenuItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const b = db.settings.activeBranchId;
  const tracked = db.items.filter((i) => i.trackStock);
  const list = tracked.filter((i) => {
    const s = i.stock[b] ?? 0;
    return filter === 'all' || (filter === 'out' ? s <= 0 : s > 0 && s <= i.lowStockAt);
  });
  const low = tracked.filter((i) => (i.stock[b] ?? 0) > 0 && (i.stock[b] ?? 0) <= i.lowStockAt).length;
  const out = tracked.filter((i) => (i.stock[b] ?? 0) <= 0).length;
  return (
    <>
      <PageHead title="Stock" sub="Stock goes down with every order and comes back when an order is cancelled." actions={<><BranchPicker /><Link className="btn" to="/admin/inventory/log">Stock history</Link></>} />
      <div className="row between wrap" style={{ marginBottom: 16 }}>
        <Seg value={filter} onChange={setFilter} options={[{ value: 'all', label: `All (${tracked.length})` }, { value: 'low', label: `Low (${low})` }, { value: 'out', label: `Out (${out})` }]} />
        <span className="small muted">{db.items.length - tracked.length} items not tracked · turn tracking on in Menu</span>
      </div>
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Item</th>{db.branches.map((br) => <th key={br.id} className="right">{br.name}</th>)}<th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((i) => {
              const s = i.stock[b] ?? 0;
              return (
                <tr key={i.id}>
                  <td><div className="row"><img className="thumb" src={i.image} alt="" />{i.name}</div></td>
                  {db.branches.map((br) => <td key={br.id} className={`right mono ${br.id === b ? 'strong' : 'muted'}`}>{i.stock[br.id] ?? 0}</td>)}
                  <td><span className={`badge ${s <= 0 ? 'red' : s <= i.lowStockAt ? 'orange' : 'green'}`}>{s <= 0 ? 'Out of stock' : s <= i.lowStockAt ? 'Low' : 'In stock'}</span></td>
                  <td className="right"><button className="btn sm" onClick={() => setAdj(i)}>Adjust</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <Empty icon="▣" title="Nothing here">Turn on “Track stock” for an item in Menu Management.</Empty>}
      </Card>
      {adj && <AdjustModal item={adj} onClose={() => setAdj(null)} />}
    </>
  );
}

function AdjustModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const b = useDB((d) => d.settings.activeBranchId);
  const branch = useDB((d) => d.branches.find((x) => x.id === b));
  const cur = useDB((d) => d.items.find((i) => i.id === item.id)?.stock[b] ?? 0);
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('Delivery received');
  const delta = mode === 'add' ? qty : mode === 'remove' ? -qty : qty - cur;
  return (
    <Modal
      title={`Adjust ${item.name}`}
      onClose={onClose}
      footer={<button className="btn primary" disabled={delta === 0} onClick={() => { adjustStock(item.id, b, delta, reason); toast('Stock updated'); onClose(); }}>Save · {cur} → {cur + delta}</button>}
    >
      <p className="muted" style={{ margin: 0 }}>{branch?.name} currently has <b>{cur}</b>.</p>
      <Seg value={mode} onChange={setMode} options={[{ value: 'add', label: 'Add' }, { value: 'remove', label: 'Remove' }, { value: 'set', label: 'Set count' }]} />
      <Field label={mode === 'set' ? 'New count' : 'Quantity'}><input className="input" type="number" min={0} value={qty} onChange={(e) => setQty(Math.max(0, +e.target.value))} autoFocus /></Field>
      <Field label="Reason">
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {['Delivery received', 'Physical count', 'Spoiled / wasted', 'Staff meal', 'Correction', 'Other'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

export function Transfers() {
  const db = useDB((d) => d);
  const tracked = db.items.filter((i) => i.trackStock);
  const [f, setF] = useState({ itemId: tracked[0]?.id ?? '', from: db.branches[0]?.id ?? '', to: db.branches[1]?.id ?? '', qty: 1, note: '' });
  const it = db.items.find((i) => i.id === f.itemId);
  const avail = it?.stock[f.from] ?? 0;
  const name = (id: string) => db.branches.find((b) => b.id === id)?.name ?? '—';
  return (
    <>
      <PageHead title="Transfers" sub="Move stock from one branch to another. Both sides are logged." />
      <div className="card pad" style={{ marginBottom: 16 }}>
        {db.branches.length < 2 ? (
          <Empty title="You need two branches">Add another branch in Store Setup → Branches.</Empty>
        ) : (
          <div className="row wrap" style={{ alignItems: 'flex-end' }}>
            <Field label="Item"><select className="input" value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })}>{tracked.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
            <Field label={`From (has ${avail})`}><select className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}>{db.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <span style={{ paddingBottom: 8 }}>→</span>
            <Field label="To"><select className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{db.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            <Field label="Qty"><input className="input" style={{ width: 90 }} type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: Math.max(1, +e.target.value) })} /></Field>
            <div className="grow" style={{ minWidth: 160 }}><Field label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
            <button
              className="btn primary"
              disabled={!f.itemId || f.from === f.to || f.qty > avail}
              onClick={() => { transferStock(f.itemId, f.from, f.to, f.qty, f.note); toast('Transferred'); setF({ ...f, note: '' }); }}
            >
              Transfer
            </button>
          </div>
        )}
        {f.qty > avail && f.from !== f.to && <p className="small" style={{ color: 'var(--red)', marginBottom: 0 }}>Not enough stock at {name(f.from)}.</p>}
      </div>
      <Card title="Past transfers" pad={false}>
        <table className="table">
          <thead><tr><th>When</th><th>Item</th><th>From → To</th><th className="right">Qty</th><th>Note</th></tr></thead>
          <tbody>{db.transfers.map((t) => <tr key={t.id}><td className="muted">{fmtDateTime(t.at)}</td><td>{db.items.find((i) => i.id === t.itemId)?.name}</td><td>{name(t.fromBranchId)} → {name(t.toBranchId)}</td><td className="right">{t.qty}</td><td className="muted">{t.note}</td></tr>)}</tbody>
        </table>
        {!db.transfers.length && <Empty icon="⇄" title="No transfers yet" />}
      </Card>
    </>
  );
}

const KIND: Record<StockLogKind, { label: string; color: string }> = {
  order_deduction: { label: 'Order', color: 'blue' },
  restored: { label: 'Restored', color: 'green' },
  duplicate_refused: { label: 'Second deduction refused', color: 'orange' },
  manual: { label: 'Manual', color: '' },
  manual_repeat: { label: 'Repeated manual', color: 'purple' },
  transfer: { label: 'Transfer', color: '' },
  failed: { label: 'Failed', color: 'red' },
};
const PROBLEMS: StockLogKind[] = ['duplicate_refused', 'manual_repeat', 'failed'];

export function StockLogPage() {
  const db = useDB((d) => d);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [problems, setProblems] = useState(false);
  const count = (k: StockLogKind) => db.stockLog.filter((l) => l.kind === k).length;
  const list = db.stockLog.filter((l) => (!problems || PROBLEMS.includes(l.kind)) && (!applied || String(l.orderNumber ?? '').includes(applied) || (l.orderId ?? '').includes(applied)));
  return (
    <>
      <PageHead title="Stock log" sub="Every time stock moved — or something tried to move it — with where it came from and who did it. A second deduction for the same order is refused and shown here." />
      <div className="grid g5" style={{ marginBottom: 16 }}>
        {(['order_deduction', 'restored', 'duplicate_refused', 'manual_repeat', 'failed'] as StockLogKind[]).map((k) => (
          <div className="card stat" key={k}>
            <div className="v">{count(k)}</div>
            <div className="l">{{ order_deduction: 'Order deductions', restored: 'Restored (cancelled)', duplicate_refused: 'Second deductions refused', manual_repeat: 'Repeated manual entries', failed: 'Failed' }[k as string]}</div>
          </div>
        ))}
      </div>
      <form className="row wrap" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); setApplied(q.replace('#', '').trim()); }}>
        <input className="input" style={{ width: 260 }} placeholder="Find an order number" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn">Search</button>
        <button type="button" className={`btn ${problems ? 'primary' : ''}`} onClick={() => setProblems(!problems)}>⚠ Problems only</button>
      </form>
      <Card pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>What</th><th>Item</th><th>Branch</th><th className="right">Change</th><th className="right">After</th><th>Source</th><th>By</th></tr></thead>
            <tbody>
              {list.slice(0, 300).map((l) => (
                <tr key={l.id}>
                  <td className="muted small">{fmtDateTime(l.at)}</td>
                  <td><span className={`badge ${KIND[l.kind].color}`}>{KIND[l.kind].label}</span></td>
                  <td>{l.itemName}</td>
                  <td className="muted">{db.branches.find((b) => b.id === l.branchId)?.name}</td>
                  <td className={`right mono ${l.delta > 0 ? 'up' : l.delta < 0 ? 'down' : 'muted'}`}>{l.delta > 0 ? '+' : ''}{l.delta}</td>
                  <td className="right mono">{l.after}</td>
                  <td className="small">{l.orderNumber ? `Order #${l.orderNumber}` : ''} {l.note && <span className="muted">{l.note}</span>}</td>
                  <td className="small">{l.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <Empty icon="↺" title={db.stockLog.length ? 'No matching entries' : 'No stock activity has been logged yet.'}>Every sale, cancellation and manual change will appear here from now on.</Empty>}
      </Card>
    </>
  );
}
