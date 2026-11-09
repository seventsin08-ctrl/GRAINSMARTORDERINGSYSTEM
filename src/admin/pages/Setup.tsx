import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { getDB, replaceDB, resetDB, uid, update, useDB } from '../../store/db';
import type { DB, Order, StaffRole } from '../../store/types';
import { Card, Empty, Field, PageHead, Seg, Toggle, ToggleRow, confirmAction, toast } from '../../components/ui';
import { Receipt } from '../../components/Receipt';

export function OrderTypes() {
  const types = useDB((d) => d.orderTypes);
  return (
    <>
      <PageHead title="Order Types" sub="The first choice customers make on the kiosk." actions={<button className="btn primary" onClick={() => update((d) => { d.orderTypes.push({ id: uid('ot'), name: 'Delivery', icon: '🛵', active: true, askTable: false, serviceChargePct: 0 }); })}>+ Add type</button>} />
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

const ROLES: { value: StaffRole; label: string; desc: string }[] = [
  { value: 'owner', label: 'Owner', desc: 'Everything' },
  { value: 'manager', label: 'Manager', desc: 'Orders, menu, stock, reports' },
  { value: 'cashier', label: 'Cashier', desc: 'Orders and cash drawer' },
  { value: 'kitchen', label: 'Kitchen', desc: 'Order board only' },
];

export function StaffPage() {
  const db = useDB((d) => d);
  return (
    <>
      <PageHead title="Staff" sub="Give each person their own PIN so you know who did what." actions={<button className="btn primary" onClick={() => update((d) => { d.staff.push({ id: uid('st'), name: 'New staff', role: 'cashier', pin: String(Math.floor(1000 + Math.random() * 9000)), branchId: d.branches[0].id, active: true }); })}>+ Add staff</button>} />
      <Card pad={false}>
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Branch</th><th>PIN</th><th>Active</th><th /></tr></thead>
          <tbody>
            {db.staff.map((s) => {
              const set = (p: Partial<typeof s>) => update((d) => { Object.assign(d.staff.find((x) => x.id === s.id)!, p); });
              return (
                <tr key={s.id}>
                  <td><input className="input" value={s.name} onChange={(e) => set({ name: e.target.value })} /></td>
                  <td><select className="input" value={s.role} onChange={(e) => set({ role: e.target.value as StaffRole })}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}</select></td>
                  <td><select className="input" value={s.branchId} onChange={(e) => set({ branchId: e.target.value })}>{db.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
                  <td><input className="input mono" style={{ width: 90 }} maxLength={6} value={s.pin} onChange={(e) => set({ pin: e.target.value.replace(/\D/g, '') })} /></td>
                  <td><Toggle on={s.active} onChange={(active) => set({ active })} /></td>
                  <td><button className="btn sm ghost" onClick={() => update((d) => { d.staff = d.staff.filter((x) => x.id !== s.id); })}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!db.staff.length && <Empty title="No staff yet" />}
      </Card>
      <p className="small muted">Any active staff PIN — or the admin PIN in Settings — can sign in to the dashboard.</p>
    </>
  );
}

export function PaymentMethods() {
  const pms = useDB((d) => d.paymentMethods);
  return (
    <>
      <PageHead title="Payment Methods" sub="How customers can pay. Shown at checkout with your instructions." actions={<button className="btn primary" onClick={() => update((d) => { d.paymentMethods.push({ id: uid('pm'), name: 'Maya', instructions: 'Scan our QR at the counter.', payAtCounter: false, active: true }); })}>+ Add method</button>} />
      <div className="grid g2">
        {pms.map((p) => {
          const set = (x: Partial<typeof p>) => update((d) => { Object.assign(d.paymentMethods.find((y) => y.id === p.id)!, x); });
          return (
            <div key={p.id} className="card pad stack">
              <div className="row">
                <input className="input grow strong" value={p.name} onChange={(e) => set({ name: e.target.value })} />
                <Toggle on={p.active} onChange={(active) => set({ active })} />
              </div>
              <Field label="Instructions for the customer"><textarea className="input" value={p.instructions} onChange={(e) => set({ instructions: e.target.value })} /></Field>
              <ToggleRow label="Pay at counter" on={p.payAtCounter} onChange={(payAtCounter) => set({ payAtCounter })} />
              <button className="btn sm danger" style={{ alignSelf: 'flex-start' }} onClick={() => update((d) => { d.paymentMethods = d.paymentMethods.filter((x) => x.id !== p.id); })}>Remove</button>
            </div>
          );
        })}
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
  const origin = location.origin;
  return (
    <>
      <PageHead title="QR Codes" sub="Print and stick these so customers can order or check their stamps from their phone." actions={<button className="btn" onClick={() => window.print()}>Print all</button>} />
      <div className="grid g3 print-area" style={{ marginBottom: 24 }}>
        <QR url={`${origin}/kiosk`} label="Order menu" />
        <QR url={`${origin}/loyalty`} label="Loyalty card" />
      </div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3>Table codes</h3>
        <div className="row"><span className="small muted">Tables</span><input className="input" style={{ width: 80 }} type="number" min={1} max={50} value={tables} onChange={(e) => setTables(Math.min(50, Math.max(1, +e.target.value)))} /></div>
      </div>
      <div className="grid g4">
        {Array.from({ length: tables }, (_, i) => <QR key={i} url={`${origin}/kiosk?table=${i + 1}`} label={`Table ${i + 1}`} />)}
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
