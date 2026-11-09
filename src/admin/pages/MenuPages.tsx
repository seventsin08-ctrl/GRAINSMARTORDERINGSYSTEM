import { useState } from 'react';
import { uid, update, useDB } from '../../store/db';
import type { AddonGroup, Category, MenuItem, UpsellRule } from '../../store/types';
import { Card, Empty, Field, ImagePicker, Modal, PageHead, Toggle, ToggleRow, confirmAction, toast } from '../../components/ui';
import { money } from '../../lib/format';
import { art, seed } from '../../store/seed';

/* ----------------------------- Menu management ----------------------------- */

export function MenuManagement() {
  const db = useDB((d) => d);
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const branch = db.settings.activeBranchId;
  const list = db.items.filter((i) => (cat === 'all' || i.categoryId === cat) && i.name.toLowerCase().includes(q.toLowerCase()));

  const blank = (): MenuItem => ({
    id: uid('it'),
    name: '',
    description: '',
    categoryId: db.categories[0]?.id ?? '',
    price: 0,
    cost: 0,
    image: art('🍽️', '#f2f2f7', '#d1d1d6'),
    available: true,
    featured: false,
    trackStock: false,
    stock: Object.fromEntries(db.branches.map((b) => [b.id, 0])),
    lowStockAt: 5,
    addonGroupIds: [],
  });

  return (
    <>
      <PageHead title="Menu products" sub="Prices in Philippine pesos. Availability updates the customer menu." actions={<>
        <button className="btn primary" onClick={() => setEdit(blank())}>+ Add product</button>
        <button className="btn solid-red lg" onClick={() => confirmAction('Reset all products to the default GrainSmart menu? Your current products will be replaced.') && update((d) => { const s = seed(); d.items = s.items; d.categories = s.categories; d.addonGroups = s.addonGroups; })}>Reset all products</button>
      </>} />
      <div className="row wrap" style={{ marginBottom: 16 }}>
        <input className="input" style={{ width: 260 }} placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ width: 200 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid g2">
        {list.map((i) => {
          const stock = i.stock[branch] ?? 0;
          return (
            <div key={i.id} className="card row" style={{ padding: 8, paddingRight: 14 }}>
              <img className="thumb" src={i.image} alt="" style={{ width: 52, height: 52 }} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="h-serif" style={{ fontSize: 17 }}>{i.name} {i.featured && <span className="badge orange">★</span>}</div>
                <div className="small muted">
                  {i.available ? 'Available' : 'Hidden'} · {money(i.price)}
                  {!i.cost && <span style={{ color: 'var(--orange)' }}> · no cost set</span>}
                  {i.trackStock && <> · {stock} in stock</>}
                  {' · '}{db.categories.find((c) => c.id === i.categoryId)?.name}
                </div>
              </div>
              <Toggle on={i.available} onChange={(v) => update((d) => { d.items.find((x) => x.id === i.id)!.available = v; })} label="Available" />
              <button className="btn sm outline" onClick={() => setEdit(structuredClone(i))}>Edit</button>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <Card><Empty title="No items yet" icon="◫">Add your first item to show it on the shop.</Empty></Card>}
      {edit && <ItemEditor item={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function ItemEditor({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const db = useDB((d) => d);
  const [f, setF] = useState(item);
  const exists = db.items.some((i) => i.id === item.id);
  const set = (p: Partial<MenuItem>) => setF((x) => ({ ...x, ...p }));
  const save = () => {
    if (!f.name.trim()) return toast('Give the item a name');
    update((d) => {
      const idx = d.items.findIndex((i) => i.id === f.id);
      if (idx >= 0) d.items[idx] = f;
      else d.items.push(f);
    });
    toast('Saved');
    onClose();
  };
  return (
    <Modal
      title={exists ? 'Edit item' : 'New item'}
      onClose={onClose}
      footer={
        <>
          {exists && <button className="btn danger" onClick={() => { if (confirmAction('Delete this item?')) { update((d) => { d.items = d.items.filter((i) => i.id !== f.id); }); onClose(); } }}>Delete</button>}
          <span className="grow" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </>
      }
    >
      <ImagePicker value={f.image} onChange={(image) => set({ image })} label="Photo" />
      <Field label="Name"><input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
      <Field label="Description"><textarea className="input" value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      <div className="grid g3">
        <Field label="Category">
          <select className="input" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            {db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Price"><input className="input" type="number" min={0} value={f.price} onChange={(e) => set({ price: +e.target.value })} /></Field>
        <Field label="Cost" hint="For profit reports"><input className="input" type="number" min={0} value={f.cost} onChange={(e) => set({ cost: +e.target.value })} /></Field>
      </div>
      <Field label="Add-on groups">
        <div className="row wrap">
          {db.addonGroups.map((g) => {
            const on = f.addonGroupIds.includes(g.id);
            return <button key={g.id} type="button" className={`btn sm ${on ? 'primary' : ''}`} onClick={() => set({ addonGroupIds: on ? f.addonGroupIds.filter((x) => x !== g.id) : [...f.addonGroupIds, g.id] })}>{on ? '✓ ' : ''}{g.name}</button>;
          })}
          {db.addonGroups.length === 0 && <span className="small muted">No add-on groups yet.</span>}
        </div>
      </Field>
      <ToggleRow label="Available on kiosk" on={f.available} onChange={(available) => set({ available })} />
      <ToggleRow label="Featured" hint="Shown in “Popular right now”" on={f.featured} onChange={(featured) => set({ featured })} />
      <ToggleRow label="Track stock" hint="Deduct on every order, auto sell-out at zero" on={f.trackStock} onChange={(trackStock) => set({ trackStock })} />
      {f.trackStock && (
        <div className="grid g3">
          {db.branches.map((b) => (
            <Field key={b.id} label={`Stock · ${b.name}`}>
              <input className="input" type="number" value={f.stock[b.id] ?? 0} onChange={(e) => set({ stock: { ...f.stock, [b.id]: +e.target.value } })} />
            </Field>
          ))}
          <Field label="Low-stock alert at"><input className="input" type="number" value={f.lowStockAt} onChange={(e) => set({ lowStockAt: +e.target.value })} /></Field>
        </div>
      )}
    </Modal>
  );
}

/* ----------------------------- Categories ----------------------------- */

export function Categories() {
  const cats = useDB((d) => [...d.categories].sort((a, b) => a.sort - b.sort));
  const items = useDB((d) => d.items);
  const [name, setName] = useState('');
  const move = (c: Category, dir: -1 | 1) =>
    update((d) => {
      const sorted = [...d.categories].sort((a, b) => a.sort - b.sort);
      const i = sorted.findIndex((x) => x.id === c.id);
      const j = i + dir;
      if (j < 0 || j >= sorted.length) return;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      sorted.forEach((x, k) => (d.categories.find((y) => y.id === x.id)!.sort = k + 1));
    });
  return (
    <>
      <PageHead title="Menu categories" sub="Keep the shop menu tidy as you grow. The order here is the order customers see." />
      <Card>
        <form className="row" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; update((d) => { d.categories.push({ id: uid('cat'), name: name.trim(), sort: d.categories.length + 1, active: true }); }); setName(''); }}>
          <input className="input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary">Add</button>
        </form>
        <div className="stack">
          {cats.map((c, i) => (
            <div key={c.id} className="row" style={{ padding: 10, borderRadius: 12, background: 'var(--fill)' }}>
              <div className="stack" style={{ gap: 0 }}>
                <button className="btn sm icon ghost" disabled={i === 0} onClick={() => move(c, -1)}>▲</button>
                <button className="btn sm icon ghost" disabled={i === cats.length - 1} onClick={() => move(c, 1)}>▼</button>
              </div>
              <input className="input grow" value={c.name} onChange={(e) => update((d) => { d.categories.find((x) => x.id === c.id)!.name = e.target.value; })} />
              <span className="badge">{items.filter((x) => x.categoryId === c.id).length} items</span>
              <Toggle on={c.active} onChange={(v) => update((d) => { d.categories.find((x) => x.id === c.id)!.active = v; })} label="Visible" />
              <button className="btn sm danger" onClick={() => { if (items.some((x) => x.categoryId === c.id)) return toast('Move its items to another category first'); update((d) => { d.categories = d.categories.filter((x) => x.id !== c.id); }); }}>Delete</button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ----------------------------- Add-ons ----------------------------- */

export function Addons() {
  const groups = useDB((d) => d.addonGroups);
  const items = useDB((d) => d.items);
  const [edit, setEdit] = useState<AddonGroup | null>(null);
  return (
    <>
      <PageHead title="Add-ons" sub="Sizes, sweetness levels, extras — reuse them across many items." actions={<button className="btn primary" onClick={() => setEdit({ id: uid('ag'), name: '', required: false, multiple: true, options: [{ id: uid('o'), name: '', price: 0 }] })}>+ New group</button>} />
      <div className="grid g3">
        {groups.map((g) => (
          <div key={g.id} className="card pad stack">
            <div className="row between">
              <h3 style={{ fontSize: 17 }}>{g.name}</h3>
              <button className="btn sm" onClick={() => setEdit(structuredClone(g))}>Edit</button>
            </div>
            <div className="row wrap">
              <span className="badge">{g.required ? 'Required' : 'Optional'}</span>
              <span className="badge">{g.multiple ? 'Pick many' : 'Pick one'}</span>
              <span className="badge blue">Used by {items.filter((i) => i.addonGroupIds.includes(g.id)).length}</span>
            </div>
            {g.options.map((o) => <div key={o.id} className="row between small"><span>{o.name}</span><span className="muted mono">{o.price ? `+${money(o.price)}` : 'Free'}</span></div>)}
          </div>
        ))}
      </div>
      {groups.length === 0 && <Card><Empty title="No add-on groups" /></Card>}
      {edit && (
        <Modal
          title="Add-on group"
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn danger" onClick={() => { update((d) => { d.addonGroups = d.addonGroups.filter((x) => x.id !== edit.id); d.items.forEach((i) => (i.addonGroupIds = i.addonGroupIds.filter((x) => x !== edit.id))); }); setEdit(null); }}>Delete</button>
              <span className="grow" />
              <button className="btn primary" onClick={() => { if (!edit.name.trim()) return toast('Name the group'); update((d) => { const i = d.addonGroups.findIndex((x) => x.id === edit.id); const clean = { ...edit, options: edit.options.filter((o) => o.name.trim()) }; if (i >= 0) d.addonGroups[i] = clean; else d.addonGroups.push(clean); }); setEdit(null); }}>Save</button>
            </>
          }
        >
          <Field label="Group name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Size" /></Field>
          <ToggleRow label="Required" hint="Customer must choose before adding" on={edit.required} onChange={(required) => setEdit({ ...edit, required })} />
          <ToggleRow label="Allow multiple" on={edit.multiple} onChange={(multiple) => setEdit({ ...edit, multiple })} />
          <span className="strong">Options</span>
          {edit.options.map((o, i) => (
            <div key={o.id} className="row">
              <input className="input grow" placeholder="Option name" value={o.name} onChange={(e) => setEdit({ ...edit, options: edit.options.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} />
              <input className="input" style={{ width: 110 }} type="number" placeholder="Price" value={o.price} onChange={(e) => setEdit({ ...edit, options: edit.options.map((x, k) => (k === i ? { ...x, price: +e.target.value } : x)) })} />
              <button className="btn sm icon ghost" onClick={() => setEdit({ ...edit, options: edit.options.filter((_, k) => k !== i) })}>✕</button>
            </div>
          ))}
          <button className="btn sm" onClick={() => setEdit({ ...edit, options: [...edit.options, { id: uid('o'), name: '', price: 0 }] })}>+ Add option</button>
        </Modal>
      )}
    </>
  );
}

/* ----------------------------- Boost sales ----------------------------- */

export function BoostSales() {
  const db = useDB((d) => d);
  const add = () => update((d) => { d.upsells.push({ id: uid('up'), triggerCategoryId: 'any', suggestItemId: d.items[0]?.id ?? '', headline: 'Make it a combo?', active: true }); });
  const set = (id: string, p: Partial<UpsellRule>) => update((d) => { Object.assign(d.upsells.find((u) => u.id === id)!, p); });
  return (
    <>
      <PageHead title="Boost Sales" sub="Suggest an extra item right after a customer adds something to their cart." actions={<button className="btn primary" onClick={add}>+ New suggestion</button>} />
      <div className="stack">
        {db.upsells.map((u) => {
          const it = db.items.find((i) => i.id === u.suggestItemId);
          return (
            <div key={u.id} className="card pad">
              <div className="row wrap" style={{ alignItems: 'flex-end' }}>
                {it && <img className="thumb" src={it.image} alt="" />}
                <Field label="When they add from">
                  <select className="input" value={u.triggerCategoryId} onChange={(e) => set(u.id, { triggerCategoryId: e.target.value })}>
                    <option value="any">Any category</option>
                    {db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Suggest">
                  <select className="input" value={u.suggestItemId} onChange={(e) => set(u.id, { suggestItemId: e.target.value })}>
                    {db.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </Field>
                <div className="grow" style={{ minWidth: 200 }}>
                  <Field label="Headline"><input className="input" value={u.headline} onChange={(e) => set(u.id, { headline: e.target.value })} /></Field>
                </div>
                <Toggle on={u.active} onChange={(active) => set(u.id, { active })} label="Active" />
                <button className="btn sm danger" onClick={() => update((d) => { d.upsells = d.upsells.filter((x) => x.id !== u.id); })}>Remove</button>
              </div>
            </div>
          );
        })}
        {db.upsells.length === 0 && <Card><Empty icon="↗" title="No suggestions yet">Pairing drinks with pastries is a great place to start.</Empty></Card>}
      </div>
    </>
  );
}
