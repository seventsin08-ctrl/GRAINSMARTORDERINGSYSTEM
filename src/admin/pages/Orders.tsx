import { useEffect, useRef, useState } from 'react';
import { can, lineTotal, markPayment, retryDeduction, setOrderStatus, update, useDB, useUser } from '../../store/db';
import type { Order, OrderStatus } from '../../store/types';
import { Empty, Modal, PageHead, Seg, confirmAction, toast } from '../../components/ui';
import { Receipt } from '../../components/Receipt';
import { downloadCSV, fmtDateTime, money } from '../../lib/format';

export const STATUS_LABEL: Record<OrderStatus, string> = { pending: 'New', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
export const STATUS_COLOR: Record<OrderStatus, string> = { pending: 'orange', preparing: 'blue', ready: 'green', completed: '', cancelled: 'red' };

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

function useNewOrderAlert(enabled: boolean) {
  const pending = useDB((d) => d.orders.filter((o) => o.status === 'pending').length);
  const last = useRef(pending);
  useEffect(() => {
    if (pending > last.current && enabled) {
      beep();
      toast('New order received');
    }
    last.current = pending;
  }, [pending, enabled]);
}

export function OrderCard({ o, kitchen }: { o: Order; kitchen?: boolean }) {
  const u = useUser();
  const [detail, setDetail] = useState(false);
  const pay = can(u, 'payment');
  const notify = (msg: string) => {
    update((d) => {
      const x = d.orders.find((y) => y.id === o.id);
      if (x) x.notified = true;
    });
    toast(o.customerPhone ? `${msg} — customer notified (${o.customerPhone})` : msg);
  };
  return (
    <div className="order-card">
      <div className="row between wrap">
        <div className="row">
          <span className="code">#{o.code}</span>
          <span className="type">{o.orderTypeName}</span>
          <span className="small muted">{new Date(o.createdAt).toLocaleString()}</span>
        </div>
        <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      {o.lines.map((l) => (
        <div className="line" key={l.key}>
          <span>
            <span style={{ color: 'var(--accent)', marginRight: 10 }}>{l.qty}×</span>
            {[l.name, ...l.addons.filter((a) => a.groupName !== 'Variation' && a.groupName !== 'Add-ons').map((a) => a.name),
              l.addons.some((a) => a.groupName === 'Add-ons') ? `Add-ons: ${l.addons.filter((a) => a.groupName === 'Add-ons').map((a) => a.name).join(', ')}` : '',
              l.addons.find((a) => a.groupName === 'Variation') ? `Variation: ${l.addons.find((a) => a.groupName === 'Variation')!.name}` : '',
              l.note ? `“${l.note}”` : ''].filter(Boolean).join(' · ')}
          </span>
          <b className="mono">{money(lineTotal(l))}</b>
        </div>
      ))}
      <div className="row between" style={{ padding: '10px 0' }}>
        <span className="small muted">
          {o.customerName} {o.customerPhone && `· ${o.customerPhone}`} {o.tableNo && <>&nbsp;·&nbsp;Table {o.tableNo}</>} &nbsp;&nbsp;{o.paymentMethodName} · {o.paid ? `Paid (${o.paymentStatus})` : 'Payment due'}
          {o.proofImage && <> · <a href={o.proofImage} target="_blank" rel="noreferrer">proof of payment</a></>}
          {o.discount > 0 && ` · ${o.discountLabel} −${money(o.discount)}`}
        </span>
        <b className="mono" style={{ fontSize: 18 }}>{money(o.total)}</b>
      </div>
      <div className="row wrap">
        {o.status === 'pending' && <button className="btn sm outline" onClick={() => { setOrderStatus(o.id, 'preparing'); notify('Preparing'); }}>Start preparing · notify customer</button>}
        {o.status === 'preparing' && <button className="btn sm outline" onClick={() => { setOrderStatus(o.id, 'ready'); notify('Ready for pickup'); }}>Mark ready · notify customer</button>}
        {o.status === 'ready' && <button className="btn sm outline" onClick={() => setOrderStatus(o.id, 'completed')}>Complete order</button>}
        {pay && !o.paid && o.status !== 'cancelled' && (
          <>
            <button className="btn sm outline" onClick={() => markPayment(o.id, 'cash')}>Cash received</button>
            <button className="btn sm outline" onClick={() => markPayment(o.id, 'digital')}>Digital payment received</button>
          </>
        )}
        {pay && o.paid && o.status !== 'completed' && <button className="btn sm ghost" onClick={() => markPayment(o.id, 'due')}>Undo payment</button>}
        {o.status !== 'cancelled' && o.status !== 'completed' && <button className="btn sm outline danger" onClick={() => confirmAction('Cancel this order? Stock will be put back.') && setOrderStatus(o.id, 'cancelled')}>Cancel</button>}
        {o.status === 'cancelled' && <button className="btn sm outline" onClick={() => setOrderStatus(o.id, 'pending')}>Reopen</button>}
        {!kitchen && <button className="btn sm ghost" onClick={() => setDetail(true)}>Receipt</button>}
      </div>
      {detail && (
        <Modal title={`Order #${o.code}`} onClose={() => setDetail(false)} footer={<><button className="btn" onClick={() => { retryDeduction(o.id); toast('Logged in Stock history'); }}>Test stock guard</button><span className="grow" /><button className="btn primary" onClick={() => window.print()}>Print receipt</button></>}>
          <div style={{ display: 'grid', placeItems: 'center' }}><Receipt order={o} /></div>
        </Modal>
      )}
    </div>
  );
}

export default function Orders() {
  const orders = useDB((d) => d.orders);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'open' | 'all' | OrderStatus>('all');
  const [sound, setSound] = useState(true);
  const [, setTick] = useState(0);
  useNewOrderAlert(sound);

  const filtered = orders.filter(
    (o) =>
      (status === 'all' || (status === 'open' ? ['pending', 'preparing', 'ready'].includes(o.status) : o.status === status)) &&
      (!q || o.code.includes(q.replace('#', '')) || o.customerName.toLowerCase().includes(q.toLowerCase()) || o.customerPhone.includes(q)),
  );

  return (
    <>
      <PageHead
        title="Incoming orders"
        sub="Live orders from the shop database. New orders chime and appear at the top."
        actions={
          <>
            <button className="btn sm" onClick={() => setSound(!sound)}>{sound ? '🔔 Sound on' : '🔕 Sound off'}</button>
            <button className="btn sm" onClick={() => downloadCSV('orders.csv', [
              ['Code', 'Date', 'Method', 'Customer', 'Phone', 'Items', 'Subtotal', 'Discount', 'Total', 'Payment', 'Paid', 'Status'],
              ...orders.map((o) => [o.code, fmtDateTime(o.createdAt), o.orderTypeName, o.customerName, o.customerPhone, o.lines.map((l) => `${l.qty}x ${l.name} (${l.addons.map((a) => a.name).join(', ')})`).join('; '), o.subtotal, o.discount, o.total, o.paymentMethodName, o.paymentStatus, o.status]),
            ])}>Export CSV</button>
            <button className="btn outline lg" onClick={() => setTick((t) => t + 1)}>↻ Refresh</button>
          </>
        }
      />
      <div className="row between wrap" style={{ marginBottom: 16 }}>
        <input className="input" style={{ width: 260 }} placeholder="Search code, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Seg value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'In progress' }, { value: 'pending', label: 'New' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      </div>
      {filtered.map((o) => <OrderCard key={o.id} o={o} />)}
      {!filtered.length && <div className="card"><Empty icon="▤" title="No orders yet">Orders from the shop and kiosk appear here instantly.</Empty></div>}
    </>
  );
}

export function Kitchen() {
  const orders = useDB((d) => d.orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)));
  const [, setTick] = useState(0);
  useNewOrderAlert(true);
  return (
    <>
      <PageHead title="Kitchen tickets" sub="Live orders that still need to be made. Oldest first." actions={<button className="btn outline lg" onClick={() => setTick((t) => t + 1)}>↻ Refresh</button>} />
      {[...orders].reverse().map((o) => <OrderCard key={o.id} o={o} kitchen />)}
      {!orders.length && <div className="card"><Empty icon="♨" title="All caught up">New tickets appear here as soon as they're placed.</Empty></div>}
    </>
  );
}
