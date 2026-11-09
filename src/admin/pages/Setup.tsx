import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { getDB, replaceDB, resetDB, uid, update, useDB } from '../../store/db';
import type { DB, Order } from '../../store/types';
import { Card, Field, ImagePicker, PageHead, Seg, Toggle, ToggleRow, confirmAction, toast } from '../../components/ui';
import { Receipt } from '../../components/Receipt';

export function OrderTypes() {
  const types = useDB((d) => d.orderTypes);
  return (
    <>
      <PageHead title="Order methods" sub="How customers get their order — shown at checkout on the shop and the kiosk." actions={<button className="btn primary" onClick={() => update((d) => { d.orderTypes.push({ id: uid('ot'), name: 'Delivery', icon: '🛵', active: true, askTable: false, serviceChargePct: 0 }); })}>+ Add type</button>} />
      <div className="grid g2">
        {types.map((t) => {
          const set = (p: Partial<typeof t>) => update((d) => { Object.assign(d.orderTypes.find((x) => x.id === t.id)!, p); });
          return (
            <div key={t.id} className="card pad stack">
              <div className="row">
                <input className="input" style={{ width: 60, textAlign: 'center', fontSize: 20 }} value={t.icon} onChange={(e) => set({ icon: e.target.value })} />
                <input className="input grow" value={t.name} onChange={(e) => set({ name: e.target.value })} />
                <Toggle on={t.active} onChange={(active) => set({ active })} label="Active" />
              </div>
              <ToggleRow label="Ask for table number" on={t.askTable} onChange={(askTable) => set({ askTable })} />
              <Field label="Service charge %"><input className="input" type="number" min={0} value={t.serviceChargePct} onChange={(e) => set({ serviceChargePct: +e.target.value })} /></Field>
              <button className="btn sm danger" style={{ alignSelf: 'flex-start' }} disabled={types.length <= 1} onClick={() => update((d) => { d.orderTypes = d.orderTypes.filter((x) => x.id !== t.id); })}>Remove</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Branches() {
  const db = useDB((d) => d);
  return (
    <>
      <PageHead title="Branches" sub="Each branch keeps its own stock, cash drawer and orders." actions={<button className="btn primary" onClick={() => update((d) => { const id = uid('br'); d.branches.push({ id, name: 'New branch', address: '', phone: '', active: true }); d.items.forEach((i) => (i.stock[id] = 0)); })}>+ Add branch</button>} />
      <div className="grid g2">
        {db.branches.map((b) => {
          const set = (p: Partial<typeof b>) => update((d) => { Object.assign(d.branches.find((x) => x.id === b.id)!, p); });
          return (
            <div key={b.id} className="card pad stack">
              <div className="row between">
                <div className="row">
                  {db.settings.kioskBranchId === b.id && <span className="badge blue">Kiosk</span>}
                  {db.settings.activeBranchId === b.id && <span className="badge">Admin view</span>}
                </div>
                <Toggle on={b.active} onChange={(active) => set({ active })} />
              </div>
              <Field label="Name"><input className="input" value={b.name} onChange={(e) => set({ name: e.target.value })} /></Field>
              <Field label="Address"><input className="input" value={b.address} onChange={(e) => set({ address: e.target.value })} /></Field>
              <Field label="Phone"><input className="input" value={b.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <div className="row">
                <button className="btn sm" onClick={() => update((d) => { d.settings.kioskBranchId = b.id; })}>Use for this kiosk</button>
                <button className="btn sm danger" disabled={db.branches.length <= 1 || db.settings.kioskBranchId === b.id} onClick={() => confirmAction('Remove this branch?') && update((d) => { d.branches = d.branches.filter((x) => x.id !== b.id); if (d.settings.activeBranchId === b.id) d.settings.activeBranchId = d.branches[0].id; })}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function PaymentMethods() {
  const pms = useDB((d) => d.paymentMethods);
  const single = useDB((d) => d.settings.singlePaymentId);
  return (
    <>
      <PageHead title="Payment methods" sub="Manage the ways customers can pay and upload QR codes from your designated bank or wallet accounts." />
      <div className="stack lg" style={{ maxWidth: 780 }}>
        {pms.map((p) => {
          const set = (x: Partial<typeof p>) => update((d) => { Object.assign(d.paymentMethods.find((y) => y.id === p.id)!, x); });
          return (
            <div key={p.id} className="card pad stack">
              <div className="row between wrap">
                <b style={{ textTransform: 'uppercase' }}>{p.name}</b>
                <div className="row">
                  <label className="chk small"><input type="radio" name="single" checked={single === p.id} onChange={() => update((d) => { d.settings.singlePaymentId = p.id; })} /> Use this single payment method at checkout</label>
                  <Toggle on={p.active} onChange={(active) => set({ active })} label="Active" />
                </div>
              </div>
              <div className="grid g2">
                <Field label="Payment option name"><input className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Type"><select className="input" value={p.kind} onChange={(e) => set({ kind: e.target.value as 'cash' | 'digital' })}><option value="digital">Digital (e-wallet / bank)</option><option value="cash">Cash</option></select></Field>
              </div>
              <Field label="Instructions"><textarea className="input" rows={2} value={p.instructions} onChange={(e) => set({ instructions: e.target.value })} /></Field>
              {p.kind === 'digital' && (
                <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 14, padding: 16 }} className="stack">
                  <div className="row between"><div><b>{p.name} QR code</b><div className="small muted">Upload the QR generated by your own bank or e-wallet account.</div></div>{p.qr && <span className="badge green">Image added</span>}</div>
                  {p.qr && <img src={p.qr} alt="" style={{ width: 180, margin: '0 auto', borderRadius: 12 }} />}
                  <ImagePicker label={p.qr ? 'Replace QR image' : 'QR image'} value={p.qr} onChange={(qr) => set({ qr })} size={900} />
                </div>
              )}
              <label className="chk small"><input type="checkbox" checked={p.allowProof} onChange={(e) => set({ allowProof: e.target.checked })} /> Allow optional proof of payment upload</label>
              <button className="btn sm outline danger" style={{ alignSelf: 'flex-start' }} onClick={() => confirmAction('Remove this payment method?') && update((d) => { d.paymentMethods = d.paymentMethods.filter((x) => x.id !== p.id); if (d.settings.singlePaymentId === p.id) d.settings.singlePaymentId = ''; })}>Remove</button>
            </div>
          );
        })}
        <button className="btn ghost lg" style={{ alignSelf: 'flex-start', color: 'var(--accent)' }} onClick={() => update((d) => { d.paymentMethods.push({ id: uid('pm'), name: 'New method', instructions: 'Scan our QR to pay.', payAtCounter: false, active: true, qr: '', allowProof: true, kind: 'digital' }); })}>+ Add payment method</button>
        {single && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => update((d) => { d.settings.singlePaymentId = ''; })}>Offer all active methods at checkout instead</button>}
      </div>
    </>
  );
}

const SAMPLE: Order = {
  id: 'sample', number: 123, createdAt: Date.now(), updatedAt: Date.now(), branchId: 'br_main', orderTypeId: 'ot_dine', orderTypeName: 'Dine in', customerName: 'Juan', customerPhone: '', tableNo: '5',
  lines: [
    { key: 'a', itemId: 'it_latte', name: 'Café Latte', unitPrice: 125, unitCost: 38, qty: 2, addons: [{ groupName: 'Size', name: 'Large', price: 20 }], note: '' },
    { key: 'b', itemId: 'it_croissant', name: 'Butter Croissant', unitPrice: 85, unitCost: 30, qty: 1, addons: [], note: 'warm' },
  ],
  subtotal: 375, discount: 0, discountLabel: '', voucherCode: '', serviceCharge: 0, total: 375, cost: 106, paymentMethodId: 'pm_cash', paymentMethodName: 'Cash', paid: true, status: 'completed', stampsEarned: 3,
  code: '3372', paymentStatus: 'cash', proofImage: '', loyaltyCardCode: '',
};

export function ReceiptStudio() {
  const r = useDB((d) => d.receipt);
  const set = (p: Partial<typeof r>) => update((d) => { Object.assign(d.receipt, p); });
  return (
    <>
      <PageHead title="Receipt Studio" sub="What gets printed for every order." actions={<button className="btn" onClick={() => window.print()}>Test print</button>} />
      <div className="grid g2">
        <Card title="Layout">
          <div className="stack lg">
            <Field label="Paper width"><Seg value={r.width} onChange={(width) => set({ width })} options={[{ value: 58, label: '58 mm' }, { value: 80, label: '80 mm' }]} /></Field>
            <Field label="Header message"><textarea className="input" value={r.header} onChange={(e) => set({ header: e.target.value })} /></Field>
            <Field label="Footer message"><textarea className="input" value={r.footer} onChange={(e) => set({ footer: e.target.value })} /></Field>
            <ToggleRow label="Show logo" on={r.showLogo} onChange={(showLogo) => set({ showLogo })} />
            <ToggleRow label="Order-tracking QR" on={r.showQr} onChange={(showQr) => set({ showQr })} />
            <ToggleRow label="Show item cost (kitchen copy)" on={r.showItemsCost} onChange={(showItemsCost) => set({ showItemsCost })} />
          </div>
        </Card>
        <div style={{ background: 'var(--fill)', borderRadius: 20, padding: 24 }}>
          <Receipt order={SAMPLE} settings={r} />
        </div>
      </div>
    </>
  );
}

function QR({ url, label }: { url: string; label: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 400 }).then(setSrc); }, [url]);
  return (
    <div className="card pad stack" style={{ alignItems: 'center', textAlign: 'center' }}>
      {src && <img src={src} alt={label} style={{ width: 180 }} />}
      <b>{label}</b>
      <span className="small muted" style={{ wordBreak: 'break-all' }}>{url}</span>
      {src && <a className="btn sm" href={src} download={`${label}.png`}>Download PNG</a>}
    </div>
  );
}

export function QRCodes() {
  const [tables, setTables] = useState(6);
  const origin = location.href.split('#')[0];
  return (
    <>
      <PageHead title="QR Codes" sub="Print and stick these so customers can order or check their stamps from their phone." actions={<button className="btn" onClick={() => window.print()}>Print all</button>} />
      <div className="grid g3 print-area" style={{ marginBottom: 24 }}>
        <QR url={`${origin}#/`} label="Order online" />
        <QR url={`${origin}#/kiosk`} label="Kiosk" />
        <QR url={`${origin}#/loyalty`} label="Loyalty card" />
      </div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3>Table codes</h3>
        <div className="row"><span className="small muted">Tables</span><input className="input" style={{ width: 80 }} type="number" min={1} max={50} value={tables} onChange={(e) => setTables(Math.min(50, Math.max(1, +e.target.value)))} /></div>
      </div>
      <div className="grid g4">
        {Array.from({ length: tables }, (_, i) => <QR key={i} url={`${origin}#/kiosk?table=${i + 1}`} label={`Table ${i + 1}`} />)}
      </div>
    </>
  );
}

export function ConnectAI() {
  const ref = useRef<HTMLInputElement>(null);
  const db = useDB((d) => d);
  const summary = {
    store: db.branding.storeName,
    items: db.items.map((i) => ({ name: i.name, price: i.price, available: i.available })),
    openOrders: db.orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length,
    customers: db.customers.length,
  };
  return (
    <>
      <PageHead title="Connect AI" sub="Let an AI assistant read your menu and sales — or move your whole store between devices." />
      <div className="grid g2">
        <Card title="Store data for AI assistants">
          <p className="muted" style={{ marginTop: 0 }}>Paste this snapshot into Claude or another assistant and ask things like “Which items should I promote this week?”.</p>
          <pre style={{ background: 'var(--fill)', padding: 14, borderRadius: 12, overflow: 'auto', maxHeight: 260, fontSize: 12 }}>{JSON.stringify(summary, null, 2)}</pre>
          <button className="btn primary" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(summary, null, 2)); toast('Copied'); }}>Copy snapshot</button>
        </Card>
        <Card title="Backup & move">
          <div className="stack lg">
            <p className="muted" style={{ margin: 0 }}>Download everything (menu, orders, customers, branding) as one file, then import it on another device.</p>
            <button className="btn" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(getDB())], { type: 'application/json' })); a.download = `grainsmart-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); }}>Download backup</button>
            <button className="btn" onClick={() => ref.current?.click()}>Import backup…</button>
            <input ref={ref} type="file" accept="application/json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = JSON.parse(await f.text()) as DB;
                if (!data.items || !data.branding) throw new Error('bad');
                if (confirmAction('Replace all current data with this backup?')) { replaceDB(data); toast('Backup imported'); }
              } catch { toast('That file is not a GrainSmart backup'); }
              e.target.value = '';
            }} />
          </div>
        </Card>
      </div>
    </>
  );
}

export function SettingsPage() {
  const s = useDB((d) => d.settings);
  const branches = useDB((d) => d.branches);
  const set = (p: Partial<typeof s>) => update((d) => { Object.assign(d.settings, p); });
  const [theme, setTheme] = useState(() => localStorage.getItem('gs.theme') ?? 'auto');
  return (
    <>
      <PageHead title="Settings" />
      <div className="grid g2">
        <Card title="Store">
          <div className="stack lg">
            <Field label="Currency symbol"><input className="input" style={{ width: 100 }} value={s.currency} onChange={(e) => set({ currency: e.target.value })} /></Field>
            <ToggleRow label="Prices include VAT" on={s.taxIncluded} onChange={(taxIncluded) => set({ taxIncluded })} />
            <Field label="VAT %"><input className="input" style={{ width: 100 }} type="number" value={s.taxPct} onChange={(e) => set({ taxPct: +e.target.value })} /></Field>
            <ToggleRow label="Auto-accept new orders" hint="Skip “New” and go straight to Preparing" on={s.autoAcceptOrders} onChange={(autoAcceptOrders) => set({ autoAcceptOrders })} />
            <Field label="This kiosk takes orders for"><select className="input" value={s.kioskBranchId} onChange={(e) => set({ kioskBranchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          </div>
        </Card>
        <Card title="Security & appearance">
          <div className="stack lg">
            <Field label="Admin PIN" hint="Used to sign in to this dashboard"><input className="input mono" style={{ width: 140 }} maxLength={8} value={s.adminPin} onChange={(e) => set({ adminPin: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Dashboard theme">
              <Seg value={theme} onChange={(v) => { setTheme(v); localStorage.setItem('gs.theme', v); if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); }} options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </Field>
            <div className="divider" />
            <b>Danger zone</b>
            <div className="row wrap">
              <button className="btn danger" onClick={() => confirmAction('Delete all orders, customers and logs but keep your menu and branding?') && update((d) => { d.orders = []; d.customers = []; d.stockLog = []; d.transfers = []; d.cash = []; d.expenses = []; d.govLog = []; d.texts = []; d.nextOrderNumber = 101; })}>Clear sales data</button>
              <button className="btn danger" onClick={() => confirmAction('Reset EVERYTHING to the demo store?') && resetDB()}>Reset to demo</button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

const GUIDES = [
  { t: 'Take your first order', d: 'Open the kiosk, tap to start, pick an item and check out. It appears in Orders instantly.', to: '/admin/orders' },
  { t: 'Make it look like your store', d: 'Upload your logo, pick colors and a font in the Branding Studio. Preview every screen before publishing.', to: '/admin/branding' },
  { t: 'Set up your menu', d: 'Create categories, add items with photos, then attach add-on groups like Size and Sweetness.', to: '/admin/menu' },
  { t: 'Track stock', d: 'Turn on stock tracking per item. Orders deduct stock once; cancellations put it back. Every move is in Stock history.', to: '/admin/inventory' },
  { t: 'Bring customers back', d: 'Turn on the stamp card, then text a promo to people who haven’t visited in a while.', to: '/admin/loyalty' },
  { t: 'Close the day', d: 'Record opening cash, remits and your closing count in Cash & remits to see if the drawer is short.', to: '/admin/cash' },
  { t: 'Senior & PWD', d: 'Customers choose the discount at checkout and enter their ID. Export the log for your reports.', to: '/admin/gov-discounts' },
  { t: 'Put the kiosk on a tablet', d: 'Open /kiosk on an iPad or Android tablet, add it to the home screen, and turn on guided access.', to: '/admin/qr-codes' },
];

export function Learn() {
  return (
    <>
      <PageHead title="Learn" sub="Short guides to get the most out of your store." />
      <div className="grid g2">
        {GUIDES.map((g, i) => (
          <Link key={g.t} to={g.to} className="card pad row" style={{ color: 'inherit', textDecoration: 'none', alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', fontWeight: 700, flex: 'none' }}>{i + 1}</div>
            <div><div className="strong" style={{ fontSize: 16 }}>{g.t}</div><div className="muted">{g.d}</div></div>
          </Link>
        ))}
      </div>
    </>
  );
}
