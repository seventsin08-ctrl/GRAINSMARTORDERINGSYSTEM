import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lineTotal, useDB } from '../store/db';
import { shopVars } from '../lib/theme';
import { money, fmtTime } from '../lib/format';
import { Logo } from './Kiosk';

const STEPS = [
  { key: 'pending', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Picked up' },
] as const;

export function OrderStatusPage() {
  const { id } = useParams();
  const b = useDB((d) => d.branding);
  const o = useDB((d) => d.orders.find((x) => x.id === id || x.code === id));
  const idx = o ? STEPS.findIndex((s) => s.key === o.status) : -1;
  return (
    <div className="kiosk" style={shopVars(b)}>
      <div className="k-page">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <Logo b={b} cls="k-mini-logo" />
          <b style={{ fontSize: 18 }}>{b.storeName}</b>
        </div>
        {!o ? (
          <div className="k-box">
            <h1>Order not found</h1>
            <p className="k-muted">This link may be from another device. Orders are stored on the device that took them.</p>
          </div>
        ) : (
          <>
            <p className="k-muted" style={{ margin: 0 }}>Order #{o.code} · {fmtTime(o.createdAt)} · {o.orderTypeName}</p>
            <h1 style={{ marginTop: 6 }}>
              {o.status === 'cancelled' ? 'Order cancelled' : o.status === 'ready' ? 'Ready for pickup! 🎉' : o.status === 'completed' ? 'Enjoy your meal' : o.status === 'preparing' ? 'Being prepared…' : 'Order received'}
            </h1>
            {o.status !== 'cancelled' && (
              <div className="k-progress">
                {STEPS.map((s, i) => (
                  <div key={s.key} className={i <= idx ? 'on' : ''}>
                    <i />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
            <div className="k-box">
              {o.lines.map((l) => (
                <div className="k-sum" key={l.key}>
                  <span>
                    {l.qty}× {l.name}
                    {l.addons.length > 0 && <span className="k-muted"> · {l.addons.map((a) => a.name).join(', ')}</span>}
                  </span>
                  <span>{money(lineTotal(l))}</span>
                </div>
              ))}
              {o.discount > 0 && (
                <div className="k-sum">
                  <span className="k-muted">{o.discountLabel}</span>
                  <span>−{money(o.discount)}</span>
                </div>
              )}
              <div className="k-sum total">
                <span>Total</span>
                <span>{money(o.total)}</span>
              </div>
              <p className="k-muted" style={{ marginBottom: 0 }}>
                {o.paymentMethodName} · {o.paid ? 'Paid' : 'Not yet paid'}
              </p>
            </div>
            <p className="k-muted" style={{ textAlign: 'center', fontSize: 13 }}>This page updates by itself.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function LoyaltyPage() {
  const b = useDB((d) => d.branding);
  const loyalty = useDB((d) => d.loyalty);
  const customers = useDB((d) => d.customers);
  const [phone, setPhone] = useState('');
  const c = customers.find((x) => x.phone === phone.replace(/\D/g, ''));
  const card = useDB((d) => d.loyaltyCards.find((x) => x.active && x.code === phone.trim().toUpperCase()));
  const have = c ? c.stamps % loyalty.stampsForReward : 0;
  return (
    <div className="kiosk" style={shopVars(b)}>
      <div className="k-page">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <Logo b={b} cls="k-mini-logo" />
          <b style={{ fontSize: 18 }}>{b.storeName}</b>
          <span className="grow" />
          <Link to="/" className="k-pill" style={{ textDecoration: 'none' }}>Order now</Link>
        </div>
        <h1>Loyalty card</h1>
        <div className="k-box" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="kin" inputMode="tel" placeholder="Mobile number or loyalty card code" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {card && (
            <>
              <b style={{ fontSize: 20 }}>Card {card.code.slice(0, 4)}••••</b>
              <div className="stamps">
                {Array.from({ length: loyalty.stampsForReward }, (_, i) => (
                  <i key={i} className={i < card.points % loyalty.stampsForReward ? 'on' : ''}>{i < card.points % loyalty.stampsForReward ? '★' : ''}</i>
                ))}
              </div>
              <p className="k-muted" style={{ margin: 0 }}>{card.points} points · {Math.floor(card.points / loyalty.stampsForReward) - card.redeemed} free drink(s) ready</p>
            </>
          )}
          {phone.replace(/\D/g, '').length >= 10 && !c && <p className="k-muted" style={{ margin: 0 }}>No card yet — add your number at checkout to start collecting.</p>}
          {c && (
            <>
              <b style={{ fontSize: 20 }}>Hi {c.name}!</b>
              <div className="stamps">
                {Array.from({ length: loyalty.stampsForReward }, (_, i) => (
                  <i key={i} className={i < have ? 'on' : ''}>{i < have ? '★' : ''}</i>
                ))}
              </div>
              <p className="k-muted" style={{ margin: 0 }}>
                {loyalty.stampsForReward - have} more to get: <b style={{ color: 'var(--k-text)' }}>{loyalty.rewardText}</b>
              </p>
              {Math.floor(c.stamps / loyalty.stampsForReward) - c.rewardsRedeemed > 0 && <p style={{ margin: 0, fontWeight: 600 }}>🎁 You have a reward ready! Show this at the counter.</p>}
            </>
          )}
        </div>
        <p className="k-muted" style={{ fontSize: 14 }}>{loyalty.earnBy === 'spend' ? `Earn ${loyalty.pointsPer} point for every ${money(loyalty.spendPerStamp)} spent.` : `Earn ${loyalty.pointsPer} point for every eligible drink on a paid order.`}</p>
      </div>
    </div>
  );
}
