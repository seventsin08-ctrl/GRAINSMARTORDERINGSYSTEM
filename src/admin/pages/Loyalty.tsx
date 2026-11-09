import { useState } from 'react';
import { adjustStock, can, uid, update, useDB, useUser } from '../../store/db';
import type { LoyaltySettings } from '../../store/types';
import { Empty, Field, Modal, PageHead, toast } from '../../components/ui';
import { fmtDateTime, money } from '../../lib/format';

function newCardCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
  return `GS${part()}${part()}`;
}

export function LoyaltyCards() {
  const db = useDB((d) => d);
  const u = useUser();
  const l = db.loyalty;
  const config = can(u, 'loyalty_config');
  const set = (p: Partial<LoyaltySettings>) => update((d) => { Object.assign(d.loyalty, p); });
  const [issued, setIssued] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [adj, setAdj] = useState<{ id: string; delta: number; note: string } | null>(null);
  const drinks = db.items.filter((i) => i.addonGroupIds.length > 0 || /tea|coffee|juice|frapp|matcha/i.test(db.categories.find((c) => c.id === i.categoryId)?.name ?? ''));
  const cat = (id: string) => db.categories.find((c) => c.id === id)?.name ?? '';
  const cards = db.loyaltyCards.filter((c) => !q || c.code.includes(q.toUpperCase()) || c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead
        title="Loyalty cards"
        sub="Physical Canva cards use a unique printed code. The full code appears only once when issued; there is no recovery or point transfer for a lost card."
        actions={<button className="btn primary lg" onClick={() => { const code = newCardCode(); update((d) => { d.loyaltyCards.unshift({ id: uid('lc'), code, label: '', points: 0, issuedAt: Date.now(), redeemed: 0, active: true, history: [] }); }); setIssued(code); }}>+ Issue new card</button>}
      />

      {config && (
        <div className="card pad stack" style={{ maxWidth: 760, marginBottom: 20 }}>
          <h3 className="h-serif" style={{ fontSize: 24 }}>Program rules</h3>
          <label className="chk small"><input type="checkbox" checked={l.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Program active</label>
          <Field label="Earn points by">
            <select className="input" value={l.earnBy} onChange={(e) => set({ earnBy: e.target.value as LoyaltySettings['earnBy'] })}>
              <option value="drinks">Eligible drinks on a paid order</option>
              <option value="spend">Amount spent on a paid order</option>
            </select>
          </Field>
          {l.earnBy === 'spend' && <Field label="Spend per point (₱)"><input className="input" type="number" min={1} value={l.spendPerStamp} onChange={(e) => set({ spendPerStamp: Math.max(1, +e.target.value) })} /></Field>}
          <Field label="Points earned per selected basis"><input className="input" type="number" min={1} value={l.pointsPer} onChange={(e) => set({ pointsPer: Math.max(1, +e.target.value) })} /></Field>
          <Field label="Points needed for one free drink"><input className="input" type="number" min={1} value={l.stampsForReward} onChange={(e) => set({ stampsForReward: Math.max(1, +e.target.value) })} /></Field>
          <Field label="Reward"><input className="input" value={l.rewardText} onChange={(e) => set({ rewardText: e.target.value })} /></Field>
          {l.earnBy === 'drinks' && (
            <>
              <div className="row between"><h3 className="h-serif" style={{ fontSize: 22 }}>Eligible drinks</h3>
                <div className="row"><button className="btn sm" onClick={() => set({ eligibleItemIds: drinks.map((d) => d.id) })}>All</button><button className="btn sm" onClick={() => set({ eligibleItemIds: [] })}>None</button></div>
              </div>
              <div className="grid g2" style={{ gap: 8 }}>
                {drinks.map((i) => (
                  <label key={i.id} className="chk small">
                    <input type="checkbox" checked={l.eligibleItemIds.includes(i.id)} onChange={(e) => set({ eligibleItemIds: e.target.checked ? [...l.eligibleItemIds, i.id] : l.eligibleItemIds.filter((x) => x !== i.id) })} />
                    {i.name} <span className="muted">· {cat(i.categoryId)}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <label className="chk small"><input type="checkbox" checked={l.largeIncluded} onChange={(e) => set({ largeIncluded: e.target.checked })} /> Free drink includes the large size</label>
          <label className="chk small"><input type="checkbox" checked={l.toppingsIncluded} onChange={(e) => set({ toppingsIncluded: e.target.checked })} /> Include toppings in the free drink</label>
          <p className="small muted" style={{ margin: 0 }}>{l.largeIncluded ? 'Large size is included.' : 'Large size is charged.'} Toppings are {l.toppingsIncluded ? 'included' : 'charged unless this box is checked'}.</p>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Issued cards · {db.loyaltyCards.length}</h3>
          <input className="input" style={{ width: 220 }} placeholder="Find a card code" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table className="table">
          <thead><tr><th>Card</th><th>Holder</th><th className="right">Points</th><th>Free drinks</th><th>Issued</th><th /></tr></thead>
          <tbody>
            {cards.map((c) => {
              const ready = Math.floor(c.points / l.stampsForReward) - c.redeemed;
              return (
                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
                  <td className="mono">{q && c.code.includes(q.toUpperCase()) ? c.code : `${c.code.slice(0, 4)}••••${c.code.slice(-2)}`}</td>
                  <td><input className="input" style={{ height: 32 }} placeholder="Name (optional)" value={c.label} onChange={(e) => update((d) => { d.loyaltyCards.find((x) => x.id === c.id)!.label = e.target.value; })} /></td>
                  <td className="right mono">{c.points}</td>
                  <td>{ready > 0 ? <span className="badge green">{ready} ready</span> : <span className="small muted">{l.stampsForReward - (c.points % l.stampsForReward)} to go</span>}</td>
                  <td className="small muted">{fmtDateTime(c.issuedAt)}</td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      {ready > 0 && <button className="btn sm primary" onClick={() => { update((d) => { const x = d.loyaltyCards.find((y) => y.id === c.id)!; x.redeemed++; x.history.unshift({ at: Date.now(), delta: 0, note: 'Free drink redeemed' }); }); toast('Free drink redeemed'); }}>Redeem</button>}
                      {config && <button className="btn sm outline" onClick={() => setAdj({ id: c.id, delta: 1, note: '' })}>Adjust</button>}
                      <button className="btn sm ghost" onClick={() => update((d) => { const x = d.loyaltyCards.find((y) => y.id === c.id)!; x.active = !x.active; })}>{c.active ? 'Disable' : 'Enable'}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!cards.length && <Empty icon="✧" title="No cards issued yet">Issue a card, print the code on your Canva card, and customers enter it at checkout.</Empty>}
      </div>

      {issued && (
        <Modal title="New loyalty card" onClose={() => setIssued(null)} footer={<button className="btn primary" onClick={() => setIssued(null)}>I've saved the code</button>}>
          <p className="muted" style={{ margin: 0 }}>Print this code on the card now. For security it is only shown in full once.</p>
          <div className="mono" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', padding: 20, background: 'var(--surface-2)', borderRadius: 14 }}>{issued}</div>
          <button className="btn" onClick={() => { navigator.clipboard?.writeText(issued); toast('Copied'); }}>Copy code</button>
        </Modal>
      )}
      {adj && (
        <Modal title="Adjust points" onClose={() => setAdj(null)} footer={<button className="btn primary" disabled={!adj.delta} onClick={() => { update((d) => { const x = d.loyaltyCards.find((y) => y.id === adj.id)!; x.points = Math.max(0, x.points + adj.delta); x.history.unshift({ at: Date.now(), delta: adj.delta, note: adj.note || 'Manual adjustment' }); }); setAdj(null); toast('Points updated'); }}>Save</button>}>
          <Field label="Points to add (use a minus to remove)"><input className="input" type="number" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: +e.target.value })} /></Field>
          <Field label="Reason"><input className="input" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></Field>
        </Modal>
      )}
      <p className="small muted" style={{ marginTop: 16 }}>Customers can check their card at the “Loyalty card” link in the shop footer. Points are added automatically when an order with their card code is paid. 1 free drink = {l.stampsForReward} points{l.earnBy === 'spend' ? ` · 1 point per ${money(l.spendPerStamp)}` : ''}.</p>
    </>
  );
}

export function StockOnHand() {
  const db = useDB((d) => d);
  const b = db.settings.activeBranchId;
  const [draft, setDraft] = useState<Record<string, { qty: string; unit: string; low: string; reason: string }>>({});
  const get = (id: string) => draft[id] ?? { qty: '', unit: 'each', low: '', reason: '' };
  const [, setTick] = useState(0);
  return (
    <>
      <PageHead
        title="Stock on hand"
        sub="Product counts are manual. Drinks without a tracked count still use the separate availability switch."
        actions={<>
          <select className="input" style={{ width: 180 }} value={b} onChange={(e) => update((d) => { d.settings.activeBranchId = e.target.value; })}>{db.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <button className="btn outline lg" onClick={() => setTick((t) => t + 1)}>↻ Refresh</button>
        </>}
      />
      {db.items.map((i) => {
        const f = get(i.id);
        const setF = (p: Partial<typeof f>) => setDraft((d) => ({ ...d, [i.id]: { ...f, ...p } }));
        const stock = i.stock[b] ?? 0;
        return (
          <div key={i.id} className="card pad" style={{ marginBottom: 12 }}>
            <div className="row between">
              <h3 className="h-serif" style={{ fontSize: 20, fontWeight: 700 }}>{i.name}</h3>
              <span className="small muted">{i.trackStock ? <span className={`badge ${stock <= 0 ? 'red' : stock <= i.lowStockAt ? 'orange' : 'green'}`}>{stock} on hand</span> : i.available ? 'Manually enabled' : 'Manually disabled'}</span>
            </div>
            <div className="row wrap" style={{ marginTop: 10 }}>
              <input className="input grow" style={{ minWidth: 130 }} type="number" placeholder={i.trackStock ? 'New count' : 'Opening quantity'} value={f.qty} onChange={(e) => setF({ qty: e.target.value })} />
              <input className="input grow" style={{ minWidth: 100 }} value={f.unit} onChange={(e) => setF({ unit: e.target.value })} aria-label="Unit" />
              <input className="input grow" style={{ minWidth: 130 }} type="number" placeholder={i.trackStock ? `Low-stock alert at (${i.lowStockAt})` : 'Low-stock alert at'} value={f.low} onChange={(e) => setF({ low: e.target.value })} />
              <input className="input grow" style={{ minWidth: 160 }} placeholder={i.trackStock ? 'Count reason' : 'Opening count reason'} value={f.reason} onChange={(e) => setF({ reason: e.target.value })} />
              <button
                className="btn outline"
                disabled={f.qty === ''}
                onClick={() => {
                  const qty = Number(f.qty);
                  update((d) => { const x = d.items.find((y) => y.id === i.id)!; x.trackStock = true; if (f.low !== '') x.lowStockAt = Number(f.low); });
                  adjustStock(i.id, b, qty - (i.trackStock ? stock : 0), f.reason || (i.trackStock ? 'Physical count' : 'Opening count'));
                  setDraft((d) => { const n = { ...d }; delete n[i.id]; return n; });
                  toast(i.trackStock ? 'Count saved' : `Tracking ${i.name}`);
                }}
              >
                {i.trackStock ? 'Save count' : 'Start tracking'}
              </button>
              {i.trackStock && <button className="btn ghost" onClick={() => update((d) => { d.items.find((y) => y.id === i.id)!.trackStock = false; })}>Stop</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}
