import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { lineTotal, placeOrder, priceOrder, useDB, getDB } from '../store/db';
import type { AddonOption, Branding, CartLine, MenuItem, Order } from '../store/types';
import { shopVars } from '../lib/theme';
import { fileToDataURL, money } from '../lib/format';

export type KioskScreen = 'welcome' | 'type' | 'menu' | 'cart' | 'checkout' | 'done';

interface Props {
  /** override branding (used by the Branding Studio live preview) */
  branding?: Branding;
  /** force a screen (preview) */
  screen?: KioskScreen;
  preview?: boolean;
}

export function Logo({ b, cls }: { b: Branding; cls: string }) {
  return <div className={cls}>{b.logo ? <img src={b.logo} alt="" /> : <span>🍃</span>}</div>;
}

export default function Kiosk({ branding: brandingOverride, screen: forced, preview }: Props) {
  const db = useDB((d) => d);
  const b = brandingOverride ?? db.branding;
  const [screen, setScreen] = useState<KioskScreen>(forced ?? 'welcome');
  const [orderTypeId, setOrderTypeId] = useState('');
  const [cart, setCart] = useState<CartLine[]>(() => (preview ? demoCart(db.items) : []));
  const [open, setOpen] = useState<MenuItem | null>(null);
  const [upsell, setUpsell] = useState<{ item: MenuItem; headline: string } | null>(null);
  const [placed, setPlaced] = useState<Order | null>(null);

  useEffect(() => {
    if (forced) setScreen(forced);
  }, [forced]);

  // idle reset
  const idle = useRef<number>();
  useEffect(() => {
    if (preview) return;
    const reset = () => {
      window.clearTimeout(idle.current);
      if (screen === 'welcome') return;
      idle.current = window.setTimeout(() => restart(), Math.max(20, b.welcome.idleSeconds) * 1000);
    };
    reset();
    const evs = ['pointerdown', 'keydown', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(idle.current);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, preview, b.welcome.idleSeconds]);

  function restart() {
    setCart([]);
    setOrderTypeId('');
    setPlaced(null);
    setOpen(null);
    setUpsell(null);
    setScreen('welcome');
  }

  function addLine(line: CartLine, item: MenuItem) {
    setCart((c) => {
      const same = c.find((x) => x.key === line.key);
      if (same) return c.map((x) => (x.key === line.key ? { ...x, qty: x.qty + line.qty } : x));
      return [...c, line];
    });
    const rule = db.upsells.find(
      (u) => u.active && (u.triggerCategoryId === 'any' || u.triggerCategoryId === item.categoryId) && u.suggestItemId !== item.id && !cart.some((l) => l.itemId === u.suggestItemId),
    );
    const sug = rule && db.items.find((i) => i.id === rule.suggestItemId && i.available);
    if (sug && rule) setUpsell({ item: sug, headline: rule.headline });
  }

  const count = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const ot = db.orderTypes.find((o) => o.id === orderTypeId);

  return (
    <div className="kiosk" style={shopVars(b)}>
      {screen === 'welcome' && (
        <div
          className="k-welcome"
          style={b.welcome.image ? { backgroundImage: `linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.35)), url(${b.welcome.image})`, color: '#fff' } : undefined}
          onClick={() => setScreen(db.orderTypes.filter((o) => o.active).length > 1 ? 'type' : (setOrderTypeId(db.orderTypes.find((o) => o.active)?.id ?? ''), 'menu'))}
        >
          {!b.welcome.image && <div className="glow" />}
          <div className="inner">
            <Logo b={b} cls="k-logo" />
            <h1>{b.welcome.title}</h1>
            <p style={b.welcome.image ? { color: 'rgba(255,255,255,.85)' } : undefined}>{b.welcome.subtitle}</p>
            <button className="kbtn pulse">{b.welcome.button}</button>
            {b.seniorMode && <p className="k-muted" style={{ marginTop: 24, fontSize: 15 }}>1 Choose food → 2 Check cart → 3 Your details → 4 Order sent</p>}
          </div>
        </div>
      )}

      {screen === 'type' && (
        <div className="k-choose">
          <Logo b={b} cls="k-logo" />
          <h2>Where will you be eating today?</h2>
          <div className="k-types">
            {db.orderTypes
              .filter((o) => o.active)
              .map((o) => (
                <button
                  key={o.id}
                  className="k-type"
                  onClick={() => {
                    setOrderTypeId(o.id);
                    setScreen('menu');
                  }}
                >
                  <div className="e">{o.icon}</div>
                  <b>{o.name}</b>
                </button>
              ))}
          </div>
          <button className="kbtn soft sm" onClick={restart}>
            ← Back
          </button>
        </div>
      )}

      {(screen === 'menu' || screen === 'cart' || screen === 'checkout') && (
        <TopBar b={b} orderType={ot?.name} onHome={restart} onType={() => setScreen('type')} senior={b.seniorMode} step={screen === 'menu' ? 1 : screen === 'cart' ? 2 : 3} />
      )}

      {screen === 'menu' && <MenuView b={b} onOpen={setOpen} cart={cart} />}

      {screen === 'menu' && count > 0 && (
        <div className="k-cartbar" onClick={() => setScreen('cart')}>
          <div className="cnt">{count}</div>
          <div className="grow" style={{ fontWeight: 600, fontSize: 17 }}>
            {b.seniorMode ? 'View cart' : 'Review order'}
          </div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{money(subtotal)}</div>
          <button className="kbtn sm">Checkout →</button>
        </div>
      )}

      {screen === 'cart' && <CartView b={b} cart={cart} setCart={setCart} onBack={() => setScreen('menu')} onNext={() => setScreen('checkout')} onOpen={setOpen} />}

      {screen === 'checkout' && (
        <Checkout
          cart={cart}
          orderTypeId={orderTypeId || db.orderTypes[0]?.id}
          preview={preview}
          onBack={() => setScreen('cart')}
          onPlaced={(o) => {
            setPlaced(o);
            setCart([]);
            setScreen('done');
          }}
        />
      )}

      {screen === 'done' && <Done b={b} order={placed ?? (preview ? demoOrder(cart) : null)} onNew={preview ? () => setScreen('welcome') : restart} />}

      {open && (
        <ItemSheet
          item={open}
          b={b}
          onClose={() => setOpen(null)}
          onAdd={(line) => {
            addLine(line, open);
            setOpen(null);
          }}
        />
      )}

      {upsell && !open && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setUpsell(null)}>
          <div className="sheet" style={{ maxWidth: 480 }}>
            <img className="sheet-img" src={upsell.item.image} alt="" />
            <div className="sheet-body" style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{upsell.headline}</h2>
              <p className="k-muted" style={{ margin: 0 }}>
                {upsell.item.name} · {money(upsell.item.price)}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="kbtn soft block" onClick={() => setUpsell(null)}>
                  No thanks
                </button>
                <button
                  className="kbtn block"
                  onClick={() => {
                    const it = upsell.item;
                    setUpsell(null);
                    if (it.addonGroupIds.length) setOpen(it);
                    else addLine(makeLine(it, [], 1, ''), it);
                  }}
                >
                  Add it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function demoCart(items: MenuItem[]): CartLine[] {
  return items.slice(0, 2).map((i, k) => makeLine(i, [], k + 1, ''));
}

function demoOrder(cart: CartLine[]): Order {
  const total = cart.reduce((s, l) => s + lineTotal(l), 0);
  return {
    id: 'preview', number: 123, createdAt: Date.now(), updatedAt: Date.now(), branchId: '', orderTypeId: '', orderTypeName: 'Dine in',
    customerName: 'Juan', customerPhone: '', lines: cart, subtotal: total, discount: 0, discountLabel: '', voucherCode: '', serviceCharge: 0,
    total, cost: 0, paymentMethodId: '', paymentMethodName: 'Cash', paid: false, status: 'pending', tableNo: '', stampsEarned: 0,
    code: '3372', paymentStatus: 'due', proofImage: '', loyaltyCardCode: '',
  };
}

function TopBar({ b, orderType, onHome, onType, senior, step }: { b: Branding; orderType?: string; onHome: () => void; onType: () => void; senior: boolean; step: number }) {
  return (
    <div className="k-top">
      {b.announcementOn && b.announcement && <div className="k-announce">{b.announcement}</div>}
      <div className="k-bar">
        <button className="k-pill" onClick={onHome} aria-label="Start over" style={{ padding: 0, background: 'transparent' }}>
          <Logo b={b} cls="k-mini-logo" />
        </button>
        <div className="name grow">{b.storeName}</div>
        {orderType && (
          <button className="k-pill" onClick={onType}>
            {orderType} ▾
          </button>
        )}
        <button className="k-pill" onClick={onHome}>
          {senior ? '← Start over' : 'Start over'}
        </button>
      </div>
      {senior && (
        <div className="k-steps">
          {['1 Choose food', '2 Check cart', '3 Your details', '4 Order sent'].map((s, i) => (
            <span key={s} className={i + 1 === step ? 'on' : ''}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuView({ b, onOpen, cart }: { b: Branding; onOpen: (i: MenuItem) => void; cart: CartLine[] }) {
  const db = useDB((d) => d);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cats = [...db.categories].filter((c) => c.active).sort((a, b) => a.sort - b.sort);
  const branch = db.settings.kioskBranchId;
  const items = db.items.filter((i) => cats.some((c) => c.id === i.categoryId));
  const featured = items.filter((i) => i.featured && i.available);
  const filtered = items.filter((i) => (cat === 'all' || i.categoryId === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const cols = b.menuLayout === 'list' ? 1 : b.columns;

  const card = (i: MenuItem) => {
    const soldOut = !i.available || (i.trackStock && (i.stock[branch] ?? 0) <= 0);
    const inCart = cart.filter((l) => l.itemId === i.id).reduce((s, l) => s + l.qty, 0);
    return (
      <button key={i.id} className={`k-card ${b.cardStyle} ${b.menuLayout === 'list' ? 'list' : ''} ${soldOut ? 'sold' : ''}`} onClick={() => !soldOut && onOpen(i)} disabled={soldOut}>
        <img src={i.image} alt="" loading="lazy" />
        {soldOut ? <span className="tag">Sold out</span> : i.featured ? <span className="tag">★ Popular</span> : null}
        <div className="body">
          <div className="nm">{i.name}</div>
          {b.showDescriptions && i.description && <div className="ds">{i.description}</div>}
          <div className="pr">
            {money(i.price)} {inCart > 0 && <span style={{ color: 'var(--k-accent)', fontSize: 13 }}>· {inCart} in cart</span>}
          </div>
        </div>
        {!soldOut && b.menuLayout !== 'list' && <span className="plus">+</span>}
      </button>
    );
  };

  return (
    <>
      <div className="k-top" style={{ top: 'auto', position: 'relative', borderBottom: 0, background: 'transparent', backdropFilter: 'none' }}>
        <div
          className={`k-hero ${b.hero.image ? 'img' : ''}`}
          style={{
            textAlign: b.hero.align,
            ...(b.hero.image ? { backgroundImage: `linear-gradient(rgba(0,0,0,${b.hero.overlay / 100}), rgba(0,0,0,${b.hero.overlay / 100})), url(${b.hero.image})` } : {}),
          }}
        >
          <h1>{b.hero.title}</h1>
          <p>{b.hero.subtitle}</p>
        </div>
      </div>
      <div style={{ position: 'sticky', top: 64, zIndex: 20, background: 'var(--k-bg)', paddingTop: 8 }}>
        <div className="k-cats" style={{ paddingBottom: 8 }}>
          <input className="kin" style={{ maxWidth: 240, height: 40, flex: 'none', borderRadius: 999 }} placeholder="Search menu" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={`k-cat ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} className={`k-cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="k-menu">
        {cat === 'all' && !q && featured.length > 0 && (
          <div className="k-section">
            <h2>Popular right now</h2>
            <div className="k-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cols >= 4 ? 200 : 240}px, 1fr))` }}>
              {featured.map(card)}
            </div>
          </div>
        )}
        {(cat === 'all' ? cats : cats.filter((c) => c.id === cat)).map((c) => {
          const list = filtered.filter((i) => i.categoryId === c.id);
          if (!list.length) return null;
          return (
            <div className="k-section" key={c.id}>
              <h2>{c.name}</h2>
              <div className="k-grid" style={{ gridTemplateColumns: b.menuLayout === 'list' ? '1fr' : `repeat(auto-fill, minmax(${cols >= 4 ? 200 : cols === 3 ? 240 : 320}px, 1fr))` }}>
                {list.map(card)}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="k-muted" style={{ textAlign: 'center', padding: 60 }}>Nothing matches “{q}”.</p>}
      </div>
    </>
  );
}

export const trackUrl = (code: string) => `${location.href.split('#')[0]}#/order/${code}`;

export function makeLine(item: MenuItem, addons: CartLine['addons'], qty: number, note: string): CartLine {
  return {
    key: `${item.id}|${addons.map((a) => a.name).join(',')}|${note}`,
    itemId: item.id,
    name: item.name,
    unitPrice: item.price,
    unitCost: item.cost,
    qty,
    addons,
    note,
  };
}

export function ItemSheet({ item, b, onClose, onAdd }: { item: MenuItem; b: Branding; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const groups = useDB((d) => d.addonGroups.filter((g) => item.addonGroupIds.includes(g.id)));
  const [sel, setSel] = useState<Record<string, string[]>>(() => Object.fromEntries(groups.filter((g) => g.required && !g.multiple).map((g) => [g.id, [g.options[0]?.id].filter(Boolean)])));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const chosen = groups.flatMap((g) => g.options.filter((o) => sel[g.id]?.includes(o.id)).map((o: AddonOption) => ({ groupName: g.name, name: o.name, price: o.price })));
  const missing = groups.filter((g) => g.required && !(sel[g.id]?.length));
  const unit = item.price + chosen.reduce((s, a) => s + a.price, 0);

  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <img className="sheet-img" src={item.image} alt="" />
        <div className="sheet-body">
          <div>
            <h2 style={{ fontSize: 30, letterSpacing: '-0.03em' }}>{item.name}</h2>
            {item.description && <p className="k-muted" style={{ margin: '6px 0 0' }}>{item.description}</p>}
            <p style={{ fontWeight: 600, fontSize: 18, margin: '8px 0 0' }}>{money(item.price)}</p>
          </div>
          {groups.map((g) => (
            <div className="opt-group" key={g.id}>
              <h4>
                {g.name}
                <span className="k-muted" style={{ fontWeight: 400, fontSize: 13 }}>
                  {g.required ? 'Required' : 'Optional'} {g.multiple ? '· choose any' : '· choose one'}
                </span>
              </h4>
              <div className="opts">
                {g.options.map((o) => {
                  const on = sel[g.id]?.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      className={`opt ${on ? 'on' : ''}`}
                      onClick={() =>
                        setSel((s) => {
                          const cur = s[g.id] ?? [];
                          if (g.multiple) return { ...s, [g.id]: on ? cur.filter((x) => x !== o.id) : [...cur, o.id] };
                          return { ...s, [g.id]: on && !g.required ? [] : [o.id] };
                        })
                      }
                    >
                      {o.name}
                      {o.price > 0 && <small>+{money(o.price)}</small>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="opt-group">
            <h4>Special instructions</h4>
            <input className="kin" placeholder="e.g. less ice, no onions" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="sheet-foot">
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">
              −
            </button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="More">
              +
            </button>
          </div>
          <button className="kbtn block" disabled={missing.length > 0} onClick={() => onAdd(makeLine(item, chosen, qty, note.trim()))}>
            {missing.length ? `Choose ${missing[0].name.toLowerCase()}` : `Add to order · ${money(unit * qty)}`}
          </button>
        </div>
        {b.seniorMode && (
          <div style={{ padding: '0 28px 20px' }}>
            <button className="kbtn soft block" onClick={onClose}>
              ← Back to menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CartView({ b, cart, setCart, onBack, onNext }: { b: Branding; cart: CartLine[]; setCart: (f: (c: CartLine[]) => CartLine[]) => void; onBack: () => void; onNext: () => void; onOpen: (i: MenuItem) => void }) {
  const items = useDB((d) => d.items);
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0);
  const setQty = (key: string, q: number) => setCart((c) => (q <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty: q } : l))));
  return (
    <div className="k-page">
      <h1>Your order</h1>
      {cart.length === 0 ? (
        <div className="k-box" style={{ textAlign: 'center', padding: 40 }}>
          <p className="k-muted">Your cart is empty.</p>
          <button className="kbtn" onClick={onBack}>
            Browse menu
          </button>
        </div>
      ) : (
        <>
          <div className="k-box">
            {cart.map((l) => (
              <div className="k-line" key={l.key}>
                <img src={items.find((i) => i.id === l.itemId)?.image} alt="" />
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{l.name}</div>
                  {l.addons.length > 0 && <div className="k-muted" style={{ fontSize: 14 }}>{l.addons.map((a) => a.name).join(', ')}</div>}
                  {l.note && <div className="k-muted" style={{ fontSize: 14 }}>“{l.note}”</div>}
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{money(lineTotal(l))}</div>
                </div>
                <div className="qty">
                  <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Less">
                    {l.qty === 1 ? '🗑' : '−'}
                  </button>
                  <span>{l.qty}</span>
                  <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="More">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="k-box">
            <div className="k-sum total" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="kbtn soft block" onClick={onBack}>
              {b.seniorMode ? '← Back to menu' : 'Add more'}
            </button>
            <button className="kbtn block" onClick={onNext}>
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Checkout({ cart, orderTypeId: initialType, onBack, onPlaced, preview }: { cart: CartLine[]; orderTypeId: string; onBack: () => void; onPlaced: (o: Order) => void; preview?: boolean }) {
  const db = useDB((d) => d);
  const types = db.orderTypes.filter((o) => o.active);
  const [orderTypeId, setOrderTypeId] = useState(initialType || types[0]?.id || '');
  const ot = db.orderTypes.find((o) => o.id === orderTypeId);
  const single = db.paymentMethods.find((p) => p.id === db.settings.singlePaymentId && p.active);
  const pms = single ? [single] : db.paymentMethods.filter((p) => p.active);
  const [proof, setProof] = useState('');
  const [card, setCard] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState('');
  const [pm, setPm] = useState(pms[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const [gov, setGov] = useState<'' | 'senior' | 'pwd'>('');
  const [govId, setGovId] = useState('');
  const [govName, setGovName] = useState('');

  const govDiscount = gov ? { type: gov, idNumber: govId, name: govName } : undefined;
  const pricing = useMemo(() => priceOrder(db, { lines: cart, voucherCode: applied, orderTypeId, govDiscount }), [db, cart, applied, orderTypeId, gov, govId, govName]); // eslint-disable-line
  const customer = phone.replace(/\D/g, '').length >= 10 ? db.customers.find((c) => c.phone === phone.replace(/\D/g, '')) : undefined;
  const canPlace = cart.length > 0 && pm && (!ot?.askTable || table.trim()) && (!gov || (govId.trim() && govName.trim()));

  return (
    <div className="k-page">
      <h1>Almost there</h1>
      {types.length > 1 && (
        <div className="k-box">
          <b style={{ fontSize: 18, display: 'block', marginBottom: 12 }}>Order method</b>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {types.map((t) => (
              <button key={t.id} className={`opt ${orderTypeId === t.id ? 'on' : ''}`} onClick={() => setOrderTypeId(t.id)}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="k-box stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <b style={{ fontSize: 18 }}>Your details</b>
        <input className="kin" placeholder="Name (for calling your order)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="kin" inputMode="tel" placeholder="Mobile number (optional — earn stamps)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {customer && db.loyalty.enabled && (
          <div className="k-muted" style={{ fontSize: 14 }}>
            Welcome back, {customer.name}! You have {customer.stamps % db.loyalty.stampsForReward} of {db.loyalty.stampsForReward} stamps.
          </div>
        )}
        {ot?.askTable && <input className="kin" placeholder="Table number" value={table} onChange={(e) => setTable(e.target.value)} />}
        {db.loyalty.enabled && <input className="kin" placeholder="Loyalty card code (optional)" value={card} onChange={(e) => setCard(e.target.value.toUpperCase())} />}
      </div>

      <div className="k-box">
        <b style={{ fontSize: 18, display: 'block', marginBottom: 12 }}>How will you pay?</b>
        {pms.map((p) => (
          <button key={p.id} className={`k-choice ${pm === p.id ? 'on' : ''}`} onClick={() => setPm(p.id)}>
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 17 }}>{p.name}</div>
              <div className="k-muted" style={{ fontSize: 14 }}>{p.instructions}</div>
            </div>
            <span style={{ fontSize: 22 }}>{pm === p.id ? '●' : '○'}</span>
          </button>
        ))}
        {(() => {
          const sel = pms.find((p) => p.id === pm);
          if (!sel || (!sel.qr && !sel.allowProof)) return null;
          return (
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
              {sel.qr && <div className="qr-box"><img src={sel.qr} alt={`${sel.name} QR`} /></div>}
              {sel.allowProof && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                  <b>Proof of payment (optional)</b>
                  <span className="k-muted" style={{ fontSize: 14 }}>Upload a screenshot of your transfer.</span>
                  {proof ? <img src={proof} alt="" style={{ width: 90, borderRadius: 10 }} /> : <span className="kbtn soft sm">Choose image</span>}
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setProof(await fileToDataURL(f, 900)); }} />
                </label>
              )}
            </div>
          );
        })()}
      </div>

      <div className="k-box" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <b style={{ fontSize: 18 }}>Discounts</b>
        {!gov && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="kin" placeholder="Voucher code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button className="kbtn soft" onClick={() => setApplied(code)}>
              Apply
            </button>
          </div>
        )}
        {applied && pricing.voucherError && <div style={{ color: '#d70015', fontSize: 14 }}>{pricing.voucherError}</div>}
        {applied && !pricing.voucherError && pricing.discount > 0 && <div style={{ color: '#1d9a4b', fontSize: 14 }}>✓ {pricing.discountLabel} applied</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['', 'senior', 'pwd'] as const).map((g) => (
            <button key={g || 'none'} className={`opt ${gov === g ? 'on' : ''}`} onClick={() => { setGov(g); if (g) setApplied(''); }}>
              {g === '' ? 'No ID discount' : g === 'senior' ? 'Senior citizen' : 'PWD'}
            </button>
          ))}
        </div>
        {gov && (
          <>
            <input className="kin" placeholder="Name on ID" value={govName} onChange={(e) => setGovName(e.target.value)} />
            <input className="kin" placeholder="ID number" value={govId} onChange={(e) => setGovId(e.target.value)} />
            <div className="k-muted" style={{ fontSize: 13 }}>Please show your ID to the cashier.</div>
          </>
        )}
      </div>

      <div className="k-box">
        <div className="k-sum"><span className="k-muted">Subtotal</span><span>{money(pricing.subtotal)}</span></div>
        {pricing.discount > 0 && <div className="k-sum"><span className="k-muted">{pricing.discountLabel}</span><span>−{money(pricing.discount)}</span></div>}
        {pricing.serviceCharge > 0 && <div className="k-sum"><span className="k-muted">Service charge</span><span>{money(pricing.serviceCharge)}</span></div>}
        <div className="k-sum total"><span>Total</span><span>{money(pricing.total)}</span></div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="kbtn soft block" onClick={onBack}>Back</button>
        <button
          className="kbtn block"
          disabled={!canPlace || !!preview}
          onClick={() => onPlaced(placeOrder({ orderTypeId, customerName: name.trim(), customerPhone: phone, lines: cart, voucherCode: pricing.voucherError ? '' : applied, paymentMethodId: pm, tableNo: table.trim(), govDiscount, proofImage: proof, loyaltyCardCode: card }))}
        >
          Place order · {money(pricing.total)}
        </button>
      </div>
    </div>
  );
}

export function Done({ b, order, onNew }: { b: Branding; order: Order | null; onNew: () => void }) {
  const [qr, setQr] = useState('');
  const [left, setLeft] = useState(30);
  const live = useDB((d) => d.orders.find((o) => o.id === order?.id));
  const pm = useDB((d) => d.paymentMethods.find((p) => p.id === order?.paymentMethodId));
  useEffect(() => {
    if (!order) return;
    QRCode.toDataURL(trackUrl(order.code), { margin: 1, width: 240 }).then(setQr).catch(() => {});
  }, [order]);
  useEffect(() => {
    if (!order || order.id === 'preview') return;
    const t = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(t);
  }, [order]);
  useEffect(() => {
    if (left === 0) onNew();
  }, [left, onNew]);
  const o = live ?? order;
  const loyalty = getDB().loyalty;
  return (
    <div className="k-page k-done">
      <div className="check">✓</div>
      <p className="k-muted" style={{ fontSize: 18, margin: 0 }}>Your order code</p>
      <div className="big">{o ? `#${o.code}` : '#—'}</div>
      <h1 style={{ marginTop: 18 }}>Thank you{o?.customerName && o.customerName !== 'Guest' ? `, ${o.customerName}` : ''}!</h1>
      <p className="k-muted" style={{ fontSize: 17 }}>{pm?.instructions ?? 'Please proceed to the counter.'} Total: <b style={{ color: 'var(--k-text)' }}>{o ? money(o.total) : ''}</b></p>
      {o && o.stampsEarned > 0 && loyalty.enabled && <p style={{ fontSize: 16 }}>⭐ You'll earn {o.stampsEarned} loyalty point{o.stampsEarned > 1 ? 's' : ''} once your order is paid.</p>}
      {qr && (
        <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', background: 'var(--k-surface)', padding: 16, borderRadius: 20, margin: '12px 0 24px', textAlign: 'left' }}>
          <img src={qr} alt="QR to track order" width={110} height={110} style={{ borderRadius: 8 }} />
          <div style={{ maxWidth: 220 }}>
            <b>Track on your phone</b>
            <div className="k-muted" style={{ fontSize: 14 }}>Scan to see when your order is ready.</div>
          </div>
        </div>
      )}
      <div>
        <button className="kbtn" onClick={onNew}>New order ({left})</button>
      </div>
      {b.seniorMode && <p className="k-muted">Step 4 of 4 · Order sent</p>}
    </div>
  );
}
