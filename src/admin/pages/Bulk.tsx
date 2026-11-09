import { useState } from 'react';
import { uid, update, useDB } from '../../store/db';
import type { AddonOption } from '../../store/types';
import { PageHead, toast } from '../../components/ui';
import { money } from '../../lib/format';
import { DRINK_PHOTO, art } from '../../store/seed';

interface Row {
  key: string;
  category: string;
  name: string;
  price: number;
  addons: AddonOption[];
  variations: AddonOption[];
  error: string;
}

const EXAMPLE = `Category: Drink
Name: Water
Price: 10
Add-ons: Cup (+5), Bottle (+15)
Variations: Nawasa, Wilkins`;

function parseOptions(s: string): AddonOption[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const m = x.match(/^(.*?)\s*\(\s*\+?\s*(\d+(?:\.\d+)?)\s*\)\s*$/);
      return { id: uid('o'), name: (m ? m[1] : x).trim(), price: m ? Number(m[2]) : 0 };
    });
}

export function parseMenu(text: string): Row[] {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.slice(0, 500).map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const kv: Record<string, string> = {};
    const keyed = lines.every((l) => /^[A-Za-z -]+:/.test(l));
    if (keyed) {
      for (const l of lines) {
        const i = l.indexOf(':');
        kv[l.slice(0, i).trim().toLowerCase().replace(/[^a-z]/g, '')] = l.slice(i + 1).trim();
      }
    } else {
      [kv.category, kv.name, kv.price, kv.addons, kv.variations] = lines;
    }
    const price = Number(String(kv.price ?? '').replace(/[^\d.]/g, ''));
    const error = !kv.category ? 'Missing category' : !kv.name ? 'Missing name' : !price && price !== 0 ? 'Missing price' : isNaN(price) ? 'Price is not a number' : '';
    return {
      key: uid('r'),
      category: kv.category ?? '',
      name: kv.name ?? '',
      price: isNaN(price) ? 0 : price,
      addons: parseOptions(kv.addons ?? ''),
      variations: parseOptions(kv.variations ?? ''),
      error,
    };
  });
}

export default function BulkImport() {
  const cats = useDB((d) => d.categories);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const valid = rows?.filter((r) => !r.error) ?? [];

  const commit = () => {
    update((d) => {
      for (const r of valid) {
        let cat = d.categories.find((c) => c.name.toLowerCase() === r.category.toLowerCase());
        if (!cat) {
          cat = { id: uid('cat'), name: r.category, sort: d.categories.length + 1, active: true };
          d.categories.push(cat);
        }
        const groupIds: string[] = [];
        if (r.variations.length) {
          const g = { id: uid('ag'), name: 'Variation', required: true, multiple: false, options: r.variations };
          d.addonGroups.push(g);
          groupIds.push(g.id);
        }
        if (r.addons.length) {
          const g = { id: uid('ag'), name: 'Add-ons', required: false, multiple: true, options: r.addons };
          d.addonGroups.push(g);
          groupIds.push(g.id);
        }
        const isDrink = /tea|coffee|juice|drink|frapp|latte|matcha/i.test(r.category + r.name);
        d.items.push({
          id: uid('it'), name: r.name, description: '', categoryId: cat.id, price: r.price, cost: 0,
          image: isDrink ? DRINK_PHOTO : art('🍽️', '#f3efe4', '#dfe6d6'), available: true, featured: false, trackStock: false,
          stock: Object.fromEntries(d.branches.map((b) => [b.id, 0])), lowStockAt: 5, addonGroupIds: groupIds,
        });
      }
    });
    toast(`${valid.length} products added to your menu`);
    setRows(null);
    setText('');
  };

  return (
    <>
      <PageHead title="Bulk menu import" sub="Paste 1–500 products. Review and edit the preview before adding them to your menu." />
      <div className="card pad" style={{ maxWidth: 900 }}>
        <h3 className="h-serif" style={{ fontSize: 22, marginBottom: 6 }}>Paste menu text</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Use a blank line between products. Each item needs a category, name, and base price. Option prices are added to the base price.</p>
        <pre style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: 14, borderRadius: 12, fontSize: 12.5, margin: '0 0 8px' }}>{EXAMPLE}</pre>
        <p className="small muted" style={{ marginTop: 0 }}>Or use five lines per product: category, name, price, add-ons, variations. Add a blank line before the next product.</p>
        <textarea className="input mono" rows={10} style={{ fontSize: 13 }} placeholder={'Chicken\nFried chicken\n190\nWings, thigh\nSpicy, sweet, mild'} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row wrap" style={{ marginTop: 14 }}>
          <button className="btn primary lg" disabled={!text.trim()} onClick={() => setRows(parseMenu(text))}>Preview menu</button>
          <span className="small muted">Choices without a price cost {money(0)} extra. Variations require one choice; add-ons can be selected together.</span>
        </div>
      </div>

      {rows && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head">
            <h3>Preview · {valid.length} ready{rows.length - valid.length ? ` · ${rows.length - valid.length} need fixing` : ''}</h3>
            <div className="row">
              <button className="btn" onClick={() => setRows(null)}>Back</button>
              <button className="btn primary" disabled={!valid.length} onClick={commit}>Add {valid.length} to menu</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Category</th><th>Name</th><th>Price</th><th>Variations</th><th>Add-ons</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const set = (p: Partial<Row>) => setRows((rs) => rs!.map((x) => {
                    if (x.key !== r.key) return x;
                    const n = { ...x, ...p };
                    n.error = !n.category ? 'Missing category' : !n.name ? 'Missing name' : '';
                    return n;
                  }));
                  return (
                    <tr key={r.key}>
                      <td>
                        <input className="input" list="bulk-cats" value={r.category} onChange={(e) => set({ category: e.target.value })} />
                        {!cats.some((c) => c.name.toLowerCase() === r.category.toLowerCase()) && r.category && <div className="small faint">New category</div>}
                      </td>
                      <td><input className="input" value={r.name} onChange={(e) => set({ name: e.target.value })} /></td>
                      <td><input className="input" style={{ width: 90 }} type="number" value={r.price} onChange={(e) => set({ price: +e.target.value })} /></td>
                      <td className="small">{r.variations.map((v) => `${v.name}${v.price ? ` +${v.price}` : ''}`).join(', ') || '—'}</td>
                      <td className="small">{r.addons.map((v) => `${v.name}${v.price ? ` +${v.price}` : ''}`).join(', ') || '—'}</td>
                      <td>{r.error ? <span className="badge red">{r.error}</span> : <span className="badge green">Ready</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="bulk-cats">{cats.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          </div>
        </div>
      )}
    </>
  );
}
