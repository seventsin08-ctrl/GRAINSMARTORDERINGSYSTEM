import { useState } from 'react';
import { uid, update, useDB } from '../../store/db';
import type { Customer, TextMessage, Voucher } from '../../store/types';
import { Card, Empty, Field, Modal, PageHead, Seg, Stat, Toggle, ToggleRow, toast } from '../../components/ui';
import { downloadCSV, fmtDate, fmtDateTime, money, moneyShort } from '../../lib/format';
import { counted } from './Dashboard';

export function Customers() {
  const db = useDB((d) => d);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Customer | null>(null);
  const stats = (c: Customer) => {
    const os = db.orders.filter((o) => o.customerPhone === c.phone && counted(o));
    return { n: os.length, spent: os.reduce((s, o) => s + o.total, 0), last: os[0]?.createdAt };
  };
  const list = db.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)).sort((a, b) => b.createdAt - a.createdAt);
  const live = sel && db.customers.find((c) => c.id === sel.id);
  return (
    <>
      <PageHead
        title="Customers"
        sub="Everyone who left their number at the kiosk."
        actions={<button className="btn" onClick={() => downloadCSV('customers.csv', [['Name', 'Phone', 'Orders', 'Spent', 'Stamps', 'Texts OK'], ...db.customers.map((c) => { const s = stats(c); return [c.name, c.phone, s.n, s.spent, c.stamps, c.optInTexts ? 'yes' : 'no']; })])}>Export</button>}
      />
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat value={db.customers.length} label="Customers" />
        <Stat value={db.customers.filter((c) => stats(c).n > 1).length} label="Came back" />
        <Stat value={db.customers.filter((c) => c.optInTexts).length} label="Can be texted" />
      </div>
      <input className="input" style={{ width: 280, marginBottom: 16 }} placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Name</th><th>Phone</th><th className="right">Orders</th><th className="right">Spent</th><th>Stamps</th><th>Last visit</th></tr></thead>
          <tbody>
            {list.map((c) => {
              const s = stats(c);
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSel(c)}>
                  <td className="strong">{c.name}</td>
                  <td className="mono">{c.phone}</td>
                  <td className="right">{s.n}</td>
                  <td className="right mono">{moneyShort(s.spent)}</td>
                  <td><span className="badge orange">★ {c.stamps % db.loyalty.stampsForReward}/{db.loyalty.stampsForReward}</span></td>
                  <td className="muted">{s.last ? fmtDate(s.last) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <Empty icon="☺" title="No customers yet">Customers appear when they add their number at checkout.</Empty>}
      </Card>
      {live && (
        <Modal title={live.name} onClose={() => setSel(null)}>
          <div className="row between"><span className="mono">{live.phone}</span><span className="muted small">Since {fmtDate(live.createdAt)}</span></div>
          <ToggleRow label="OK to receive texts" on={live.optInTexts} onChange={(v) => update((d) => { d.customers.find((c) => c.id === live.id)!.optInTexts = v; })} />
          <div className="row between">
            <div>
              <div className="strong">{live.stamps} stamps total</div>
              <div className="small muted">{Math.floor(live.stamps / db.loyalty.stampsForReward) - live.rewardsRedeemed} reward(s) ready · {live.rewardsRedeemed} redeemed</div>
            </div>
            <div className="row">
              <button className="btn sm" onClick={() => update((d) => { d.customers.find((c) => c.id === live.id)!.stamps++; })}>+1 stamp</button>
              <button className="btn sm primary" disabled={Math.floor(live.stamps / db.loyalty.stampsForReward) - live.rewardsRedeemed <= 0} onClick={() => { update((d) => { d.customers.find((c) => c.id === live.id)!.rewardsRedeemed++; }); toast('Reward redeemed'); }}>Redeem reward</button>
            </div>
          </div>
          <div className="divider" />
          <b>Orders</b>
          {db.orders.filter((o) => o.customerPhone === live.phone).map((o) => (
            <div key={o.id} className="row between small"><span>#{o.code} · {fmtDateTime(o.createdAt)}</span><span className="mono">{money(o.total)}</span></div>
          ))}
        </Modal>
      )}
    </>
  );
}

export function Loyalty() {
  const l = useDB((d) => d.loyalty);
  const customers = useDB((d) => d.customers);
  const set = (p: Partial<typeof l>) => update((d) => { Object.assign(d.loyalty, p); });
  const have = 3;
  return (
    <>
      <PageHead title="Loyalty" sub="A digital stamp card. Customers share their number to collect stamps — and you get a list of people to bring back." actions={<a className="btn" href="/loyalty" target="_blank" rel="noreferrer">Customer card page ↗</a>} />
      <div className="grid g2">
        <Card title="Stamp card">
          <div className="stack lg">
            <ToggleRow label="Loyalty is on" hint="Kiosk asks for a number and shows stamps" on={l.enabled} onChange={(enabled) => set({ enabled })} />
            <div className="grid g2">
              <Field label="Stamps for a reward"><input className="input" type="number" min={2} value={l.stampsForReward} onChange={(e) => set({ stampsForReward: Math.max(2, +e.target.value) })} /></Field>
              <Field label="Spend per stamp"><input className="input" type="number" min={1} value={l.spendPerStamp} onChange={(e) => set({ spendPerStamp: Math.max(1, +e.target.value) })} /></Field>
            </div>
            <Field label="Reward"><input className="input" value={l.rewardText} onChange={(e) => set({ rewardText: e.target.value })} /></Field>
            <div className="small muted">{customers.filter((c) => c.stamps > 0).length} customers are collecting · {customers.reduce((s, c) => s + c.rewardsRedeemed, 0)} rewards redeemed</div>
          </div>
        </Card>
        <Card title="Preview">
          <div style={{ background: 'linear-gradient(135deg, #1d1d1f, #3a3a3c)', color: '#fff', borderRadius: 20, padding: 24 }}>
            <div className="small" style={{ opacity: 0.7 }}>LOYALTY CARD</div>
            <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 18px' }}>{l.rewardText}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(l.stampsForReward, 6)}, 1fr)`, gap: 10 }}>
              {Array.from({ length: l.stampsForReward }, (_, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', display: 'grid', placeItems: 'center', background: i < have ? '#fff' : 'transparent', color: '#1d1d1f', border: i < have ? 0 : '2px dashed rgba(255,255,255,.35)' }}>{i < have ? '★' : ''}</div>
              ))}
            </div>
            <div className="small" style={{ opacity: 0.7, marginTop: 16 }}>1 stamp per {money(l.spendPerStamp)}</div>
          </div>
        </Card>
      </div>
    </>
  );
}

export function Texts() {
  const db = useDB((d) => d);
  const [audience, setAudience] = useState<TextMessage['audience']>('all');
  const [body, setBody] = useState(`Hi! ${db.branding.storeName} here. `);
  const now = Date.now();
  const recipients = db.customers.filter((c) => {
    if (!c.optInTexts) return false;
    if (audience === 'loyalty') return c.stamps > 0;
    if (audience === 'inactive') {
      const last = db.orders.find((o) => o.customerPhone === c.phone)?.createdAt ?? 0;
      return now - last > 30 * 86400000;
    }
    return true;
  });
  const segments = Math.max(1, Math.ceil(body.length / 160));
  return (
    <>
      <PageHead title="Texts" sub="Send a promo to customers who said yes to texts." />
      <div className="grid g2">
        <Card title="New message">
          <div className="stack lg">
            <Field label="Send to">
              <Seg value={audience} onChange={setAudience} options={[{ value: 'all', label: 'Everyone' }, { value: 'loyalty', label: 'Stamp collectors' }, { value: 'inactive', label: 'Not seen in 30 days' }]} />
            </Field>
            <Field label="Message" hint={`${body.length} characters · ${segments} SMS each`}>
              <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <div className="row between">
              <span className="muted">{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span>
              <button
                className="btn primary"
                disabled={!recipients.length || !body.trim()}
                onClick={() => {
                  update((d) => { d.texts.unshift({ id: uid('tx'), at: Date.now(), audience, body, recipients: recipients.length }); });
                  toast(`Queued for ${recipients.length} customers`);
                }}
              >
                Send
              </button>
            </div>
            <p className="small faint" style={{ margin: 0 }}>Connect an SMS provider (e.g. Semaphore, Twilio) in Settings to deliver messages. Until then, sends are recorded here.</p>
          </div>
        </Card>
        <Card title="Sent" pad={false}>
          {db.texts.map((t) => (
            <div key={t.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
              <div className="row between small muted"><span>{fmtDateTime(t.at)}</span><span>{t.recipients} recipients</span></div>
              <div style={{ marginTop: 4 }}>{t.body}</div>
            </div>
          ))}
          {!db.texts.length && <Empty icon="✉" title="No texts sent yet" />}
        </Card>
      </div>
    </>
  );
}

export function Vouchers() {
  const vouchers = useDB((d) => d.vouchers);
  const [edit, setEdit] = useState<Voucher | null>(null);
  return (
    <>
      <PageHead title="Vouchers" sub="Codes customers type at checkout for a discount." actions={<button className="btn primary" onClick={() => setEdit({ id: uid('v'), code: '', type: 'percent', value: 10, minSpend: 0, maxUses: 0, used: 0, expiresAt: '', active: true })}>+ New voucher</button>} />
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Code</th><th>Discount</th><th>Min spend</th><th>Used</th><th>Expires</th><th>Active</th><th /></tr></thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td className="strong mono">{v.code}</td>
                <td>{v.type === 'percent' ? `${v.value}%` : money(v.value)}</td>
                <td>{v.minSpend ? money(v.minSpend) : '—'}</td>
                <td>{v.used}{v.maxUses ? ` / ${v.maxUses}` : ''}</td>
                <td className="muted">{v.expiresAt || 'Never'}</td>
                <td><Toggle on={v.active} onChange={(a) => update((d) => { d.vouchers.find((x) => x.id === v.id)!.active = a; })} /></td>
                <td className="right"><button className="btn sm" onClick={() => setEdit(v)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vouchers.length && <Empty icon="%" title="No vouchers yet" />}
      </Card>
      {edit && (
        <Modal
          title="Voucher"
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn danger" onClick={() => { update((d) => { d.vouchers = d.vouchers.filter((x) => x.id !== edit.id); }); setEdit(null); }}>Delete</button>
              <span className="grow" />
              <button
                className="btn primary"
                onClick={() => {
                  const code = edit.code.trim().toUpperCase();
                  if (!code) return toast('Enter a code');
                  if (vouchers.some((v) => v.code === code && v.id !== edit.id)) return toast('That code already exists');
                  update((d) => { const i = d.vouchers.findIndex((x) => x.id === edit.id); const v = { ...edit, code }; if (i >= 0) d.vouchers[i] = v; else d.vouchers.push(v); });
                  setEdit(null);
                }}
              >
                Save
              </button>
            </>
          }
        >
          <Field label="Code"><input className="input mono" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="SUMMER20" /></Field>
          <Seg value={edit.type} onChange={(type) => setEdit({ ...edit, type })} options={[{ value: 'percent', label: 'Percent off' }, { value: 'fixed', label: 'Amount off' }]} />
          <div className="grid g2">
            <Field label={edit.type === 'percent' ? 'Percent' : 'Amount'}><input className="input" type="number" value={edit.value} onChange={(e) => setEdit({ ...edit, value: +e.target.value })} /></Field>
            <Field label="Minimum spend"><input className="input" type="number" value={edit.minSpend} onChange={(e) => setEdit({ ...edit, minSpend: +e.target.value })} /></Field>
            <Field label="Max uses" hint="0 = unlimited"><input className="input" type="number" value={edit.maxUses} onChange={(e) => setEdit({ ...edit, maxUses: +e.target.value })} /></Field>
            <Field label="Expires"><input className="input" type="date" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

export function GovDiscounts() {
  const db = useDB((d) => d);
  const total = db.govLog.reduce((s, g) => s + g.discount, 0);
  return (
    <>
      <PageHead
        title="Senior & PWD"
        sub="Discounts given to senior citizens and persons with disability, with the ID details your BIR report needs."
        actions={<button className="btn" onClick={() => downloadCSV('senior-pwd.csv', [['Date', 'Order', 'Type', 'Name', 'ID', 'Discount'], ...db.govLog.map((g) => [fmtDateTime(g.at), g.orderNumber, g.type, g.name, g.idNumber, g.discount])])}>Export report</button>}
      />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat value={db.govLog.filter((g) => g.type === 'senior').length} label="Senior transactions" />
        <Stat value={db.govLog.filter((g) => g.type === 'pwd').length} label="PWD transactions" />
        <Stat value={moneyShort(total)} label="Total discounts" />
        <div className="card pad stack">
          <Field label="Discount %"><input className="input" type="number" value={db.settings.govDiscountPct} onChange={(e) => update((d) => { d.settings.govDiscountPct = +e.target.value; })} /></Field>
          <span className="small muted">Plus VAT exemption ({db.settings.taxPct}%)</span>
        </div>
      </div>
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Date</th><th>Order</th><th>Type</th><th>Name</th><th>ID number</th><th className="right">Discount</th></tr></thead>
          <tbody>{db.govLog.map((g) => <tr key={g.id}><td className="muted">{fmtDateTime(g.at)}</td><td>#{g.orderNumber}</td><td><span className="badge purple">{g.type === 'senior' ? 'Senior' : 'PWD'}</span></td><td>{g.name}</td><td className="mono">{g.idNumber}</td><td className="right mono">{money(g.discount)}</td></tr>)}</tbody>
        </table>
        {!db.govLog.length && <Empty icon="♿" title="No Senior or PWD discounts yet" />}
      </Card>
    </>
  );
}
