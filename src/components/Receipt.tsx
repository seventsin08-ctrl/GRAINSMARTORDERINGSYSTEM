import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { lineTotal, useDB } from '../store/db';
import type { Order, ReceiptSettings } from '../store/types';
import { money, fmtDateTime } from '../lib/format';

export function Receipt({ order, settings }: { order: Order; settings?: ReceiptSettings }) {
  const db = useDB((d) => d);
  const r = settings ?? db.receipt;
  const b = db.branding;
  const branch = db.branches.find((x) => x.id === order.branchId);
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (r.showQr) QRCode.toDataURL(`${location.href.split("#")[0]}#/order/${order.code}`, { margin: 0, width: 120 }).then(setQr);
  }, [order.id, r.showQr]);
  const vatable = db.settings.taxIncluded ? order.total / (1 + db.settings.taxPct / 100) : order.total;
  return (
    <div className="receipt print-area" style={{ width: r.width === 58 ? 220 : 300 }}>
      {r.showLogo && b.logo && <img src={b.logo} alt="" style={{ width: 56, height: 56, margin: '0 auto 6px', borderRadius: 8, objectFit: 'cover' }} />}
      <div className="c" style={{ fontWeight: 700, fontSize: 14 }}>{b.storeName}</div>
      {branch && <div className="c">{branch.name}<br />{branch.address}</div>}
      {r.header && <div className="c" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.header}</div>}
      <hr />
      <div className="r"><span>Order #{order.code}</span><span>{order.orderTypeName}</span></div>
      <div>{fmtDateTime(order.createdAt)}</div>
      {order.customerName && <div>Name: {order.customerName}</div>}
      {order.tableNo && <div>Table: {order.tableNo}</div>}
      <hr />
      {order.lines.map((l) => (
        <div key={l.key} style={{ marginBottom: 4 }}>
          <div className="r"><span>{l.qty} × {l.name}</span><span>{money(lineTotal(l))}</span></div>
          {l.addons.map((a) => (
            <div key={a.name} className="r" style={{ paddingLeft: 10, color: '#555' }}><span>+ {a.name}</span><span>{a.price ? money(a.price * l.qty) : ''}</span></div>
          ))}
          {l.note && <div style={{ paddingLeft: 10, color: '#555' }}>“{l.note}”</div>}
          {r.showItemsCost && <div style={{ paddingLeft: 10, color: '#999' }}>cost {money(l.unitCost * l.qty)}</div>}
        </div>
      ))}
      <hr />
      <div className="r"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
      {order.discount > 0 && <div className="r"><span>{order.discountLabel}</span><span>-{money(order.discount)}</span></div>}
      {order.serviceCharge > 0 && <div className="r"><span>Service charge</span><span>{money(order.serviceCharge)}</span></div>}
      <div className="r" style={{ fontWeight: 700, fontSize: 14 }}><span>TOTAL</span><span>{money(order.total)}</span></div>
      {db.settings.taxIncluded && (
        <>
          <div className="r"><span>VATable sales</span><span>{money(vatable)}</span></div>
          <div className="r"><span>VAT {db.settings.taxPct}%</span><span>{money(order.total - vatable)}</span></div>
        </>
      )}
      <div className="r"><span>Payment</span><span>{order.paymentMethodName} {order.paid ? '(paid)' : '(unpaid)'}</span></div>
      {order.govDiscount && <div>{order.govDiscount.type.toUpperCase()} ID: {order.govDiscount.idNumber} · {order.govDiscount.name}</div>}
      <hr />
      {r.footer && <div className="c" style={{ whiteSpace: 'pre-wrap' }}>{r.footer}</div>}
      {r.showQr && qr && (
        <div className="c" style={{ marginTop: 8 }}>
          <img src={qr} alt="" style={{ width: 90, margin: '0 auto' }} />
          <div style={{ fontSize: 10 }}>Scan to track your order</div>
        </div>
      )}
    </div>
  );
}
