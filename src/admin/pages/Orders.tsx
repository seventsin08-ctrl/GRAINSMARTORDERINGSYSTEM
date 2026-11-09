import { useEffect, useRef, useState } from 'react';
import { lineTotal, markPaid, retryDeduction, setOrderStatus, useDB } from '../../store/db';
import type { Order, OrderStatus } from '../../store/types';
import { Card, Empty, Modal, PageHead, Seg, confirmAction, toast } from '../../components/ui';
import { Receipt } from '../../components/Receipt';
import { downloadCSV, fmtDateTime, fmtTime, money } from '../../lib/format';

export const STATUS_LABEL: Record<OrderStatus, string> = { pending: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
export const STATUS_COLOR: Record<OrderStatus, string> = { pending: 'red', preparing: 'orange', ready: 'blue', completed: 'green', cancelled: '' };
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pending: 'preparing', preparing: 'ready', ready: 'completed' };
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = { pending: 'Accept', preparing: 'Mark ready', ready: 'Complete' };

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    /* audio not allowed */
  }
}

export default function Orders() {
  const orders = useDB((d) => d.orders);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [sel, setSel] = useState<Order | null>(null);
  const [sound, setSound] = useState(true);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const last = useRef(pending);
  useEffect(() => {
    if (pending > last.current && sound) {
      beep();
      toast('New order received');
    }
    last.current = pending;
  }, [pending, sound]);

  const filtered = orders.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      (!q || String(o.number).includes(q) || o.customerName.toLowerCase().includes(q.toLowerCase()) || o.customerPhone.includes(q)),
  );
  const live = sel ? orders.find((o) => o.id === sel.id) ?? null : null;

  return (
    <>
      <PageHead
        title="Orders"
        sub="Manage customer orders as they come in from the kiosk. This page updates live."
        actions={
          <>
            <span className="badge green">● Live updates</span>
            <button className="btn sm" onClick={() => setSound(!sound)}>{sound ? '🔔 Sound on' : '🔕 Sound off'}</button>
            <button
              className="btn sm"
              onClick={() =>
                downloadCSV('orders.csv', [
                  ['Number', 'Date', 'Type', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment', 'Paid', 'Status'],
                  ...orders.map((o) => [o.number, fmtDateTime(o.createdAt), o.orderTypeName, o.customerName, o.customerPhone, o.lines.map((l) => `${l.qty}x ${l.name}`).join('; '), o.subtotal, o.discount, o.total, o.paymentMethodName, o.paid ? 'yes' : 'no', o.status]),
                ])
              }
            >
              Export CSV
            </button>
          </>
        }
      />
      <div className="row between wrap" style={{ marginBottom: 16 }}>
        <div className="row wrap">
          <input className="input" style={{ width: 240 }} placeholder="Search # / name / phone" value={q} onChange={(e) => setQ(e.target.value)} />
          {view === 'list' && (
            <select className="input" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value as 'all')}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
        <Seg value={view} onChange={setView} options={[{ value: 'board', label: 'Board' }, { value: 'list', label: 'List' }]} />
      </div>

      {orders.length === 0 ? (
        <Card>
          <Empty icon="☰" title="No orders yet">Orders from customers will appear here. Open the kiosk in another tab to try one.</Empty>
        </Card>
      ) : view === 'board' ? (
        <div className="board">
          {(['pending', 'preparing', 'ready', 'completed'] as OrderStatus[]).map((s) => {
            const list = filtered.filter((o) => o.status === s && (s !== 'completed' || o.updatedAt > Date.now() - 6 * 3600000));
            return (
              <div className="col" key={s}>
                <div className="col-head">
                  <span>{STATUS_LABEL[s]}</span>
                  <span className={`badge ${STATUS_COLOR[s]}`}>{list.length}</span>
                </div>
                {list.map((o) => (
                  <div className="ticket" key={o.id}>
                    <div className="row between">
                      <span className="num">#{o.number}</span>
                      <span className="small muted">{fmtTime(o.createdAt)}</span>
                    </div>
                    <div className="small">
                      <b>{o.customerName}</b> · {o.orderTypeName}
                      {o.tableNo && ` · Table ${o.tableNo}`}
                    </div>
                    <ul>
                      {o.lines.map((l) => (
                        <li key={l.key}>
                          {l.qty}× {l.name}
                          {(l.addons.length > 0 || l.note) && <small>{[...l.addons.map((a) => a.name), l.note && `“${l.note}”`].filter(Boolean).join(', ')}</small>}
                        </li>
                      ))}
                    </ul>
                    <div className="row between">
                      <span className="strong">{money(o.total)}</span>
                      <span className={`badge ${o.paid ? 'green' : 'orange'}`}>{o.paid ? 'Paid' : o.paymentMethodName}</span>
                    </div>
                    <div className="row" style={{ marginTop: 10 }}>
                      {NEXT[o.status] && (
                        <button className="btn sm primary grow" onClick={() => setOrderStatus(o.id, NEXT[o.status]!)}>
                          {NEXT_LABEL[o.status]}
                        </button>
                      )}
                      <button className="btn sm" onClick={() => setSel(o)}>Details</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <Card pad={false}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Time</th><th>Customer</th><th>Type</th><th>Items</th><th className="right">Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => setSel(o)} style={{ cursor: 'pointer' }}>
                    <td className="strong">#{o.number}</td>
                    <td className="muted">{fmtDateTime(o.createdAt)}</td>
                    <td>{o.customerName}<div className="small faint">{o.customerPhone}</div></td>
                    <td>{o.orderTypeName}</td>
                    <td>{o.lines.reduce((s, l) => s + l.qty, 0)}</td>
                    <td className="right mono">{money(o.total)}</td>
                    <td><span className={`badge ${o.paid ? 'green' : 'orange'}`}>{o.paymentMethodName} · {o.paid ? 'paid' : 'unpaid'}</span></td>
                    <td><span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <Empty title="No matching orders" />}
        </Card>
      )}

      {live && <OrderModal order={live} onClose={() => setSel(null)} />}
    </>
  );
}

export function OrderModal({ order: o, onClose }: { order: Order; onClose: () => void }) {
  const [showReceipt, setShowReceipt] = useState(false);
  return (
    <Modal
      title={`Order #${o.number}`}
      onClose={onClose}
      wide={showReceipt}
      footer={
        <>
          {o.status !== 'cancelled' && o.status !== 'completed' && (
            <button className="btn danger" onClick={() => confirmAction('Cancel this order? Stock will be put back.') && setOrderStatus(o.id, 'cancelled')}>
              Cancel order
            </button>
          )}
          {o.status === 'cancelled' && <button className="btn" onClick={() => setOrderStatus(o.id, 'pending')}>Reopen</button>}
          <span className="grow" />
          <button className="btn" onClick={() => setShowReceipt(!showReceipt)}>{showReceipt ? 'Hide receipt' : 'Receipt'}</button>
          {NEXT[o.status] && <button className="btn primary" onClick={() => setOrderStatus(o.id, NEXT[o.status]!)}>{NEXT_LABEL[o.status]}</button>}
        </>
      }
    >
      <div className="row wrap">
        <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
        <span className="badge">{o.orderTypeName}</span>
        {o.tableNo && <span className="badge">Table {o.tableNo}</span>}
        <span className="muted small">{fmtDateTime(o.createdAt)}</span>
      </div>
      {showReceipt ? (
        <div className="stack" style={{ alignItems: 'center' }}>
          <Receipt order={o} />
          <button className="btn primary" onClick={() => window.print()}>Print receipt</button>
        </div>
      ) : (
        <>
          <div>
            <div className="strong">{o.customerName}</div>
            <div className="muted small">{o.customerPhone || 'No phone given'}</div>
          </div>
          <div className="card" style={{ boxShadow: 'none' }}>
            {o.lines.map((l) => (
              <div key={l.key} className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div>{l.qty}× {l.name}</div>
                  {(l.addons.length > 0 || l.note) && <div className="small muted">{[...l.addons.map((a) => a.name), l.note && `“${l.note}”`].filter(Boolean).join(', ')}</div>}
                </div>
                <span className="mono">{money(lineTotal(l))}</span>
              </div>
            ))}
            <div style={{ padding: '10px 14px' }}>
              <div className="row between"><span className="muted">Subtotal</span><span className="mono">{money(o.subtotal)}</span></div>
              {o.discount > 0 && <div className="row between"><span className="muted">{o.discountLabel}</span><span className="mono">−{money(o.discount)}</span></div>}
              {o.serviceCharge > 0 && <div className="row between"><span className="muted">Service charge</span><span className="mono">{money(o.serviceCharge)}</span></div>}
              <div className="row between strong" style={{ fontSize: 16 }}><span>Total</span><span className="mono">{money(o.total)}</span></div>
            </div>
          </div>
          {o.govDiscount && (
            <div className="small">
              <span className="badge purple">{o.govDiscount.type === 'senior' ? 'Senior' : 'PWD'}</span> {o.govDiscount.name} · ID {o.govDiscount.idNumber}
            </div>
          )}
          <div className="row between">
            <div>
              <div className="strong">{o.paymentMethodName}</div>
              <div className="small muted">{o.paid ? 'Payment received' : 'Waiting for payment'}</div>
            </div>
            <button className={`btn sm ${o.paid ? '' : 'primary'}`} onClick={() => markPaid(o.id, !o.paid)}>{o.paid ? 'Mark unpaid' : 'Mark paid'}</button>
          </div>
          <div className="divider" />
          <div className="row between">
            <span className="small muted">Stock guard: try deducting stock again for this order. It will be refused and logged.</span>
            <button className="btn sm" onClick={() => { retryDeduction(o.id); toast('Logged in Stock history'); }}>Test re-deduct</button>
          </div>
        </>
      )}
    </Modal>
  );
}
