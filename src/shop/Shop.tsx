import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lineTotal, useDB } from '../store/db';
import type { Branding, CartLine, MenuItem, Order, ShopButton } from '../store/types';
import { shopVars } from '../lib/theme';
import { money } from '../lib/format';
import { CartView, Checkout, Done, ItemSheet, makeLine } from '../kiosk/Kiosk';

type View = 'home' | 'cart' | 'checkout' | 'done';

const CART_KEY = 'gs.bag';
function loadBag(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** The customer-facing website. Also rendered inside the Branding page as a live preview. */
export default function Shop({ branding, preview }: { branding?: Branding; preview?: boolean }) {
  const db = useDB((d) => d);
  const b = branding ?? db.branding;
  const nav = useNavigate();
  const [view, setView] = useState<View>('home');
  const [bag, setBag] = useState<CartLine[]>(() => (preview ? [] : loadBag()));
  const [open, setOpen] = useState<MenuItem | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [track, setTrack] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [upsell, setUpsell] = useState<{ item: MenuItem; headline: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(bag));
    } catch {
      /* ignore */
    }
  }, [bag, preview]);

  useEffect(() => {
    root.current?.closest('.design-frame')?.scrollTo({ top: 0 });
    if (!preview) window.scrollTo({ top: 0 });
  }, [view, preview]);

  const count = bag.reduce((s, l) => s + l.qty, 0);
  const total = bag.reduce((s, l) => s + lineTotal(l), 0);

  const act = (a: ShopButton['action']) => {
    if (a === 'menu') {
      setView('home');
      setTimeout(() => menuRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
    } else if (a === 'bag') setBagOpen(true);
    else if (a === 'track') setTrack(true);
    else if (a === 'story') storyRef.current?.scrollIntoView({ behavior: 'smooth' });
    else if (a === 'kiosk' && !preview) nav('/kiosk');
  };

  const add = (line: CartLine, item: MenuItem) => {
    setBag((c) => {
      const same = c.find((x) => x.key === line.key);
      return same ? c.map((x) => (x.key === line.key ? { ...x, qty: x.qty + line.qty } : x)) : [...c, line];
    });
    const rule = db.upsells.find((u) => u.active && (u.triggerCategoryId === 'any' || u.triggerCategoryId === item.categoryId) && u.suggestItemId !== item.id && !bag.some((l) => l.itemId === u.suggestItemId));
    const sug = rule && db.items.find((i) => i.id === rule.suggestItemId && i.available);
    if (sug && rule) setUpsell({ item: sug, headline: rule.headline });
  };

  const sections = {
    intro: <Strip key="intro" b={b} />,
    menu: (
      <div key="menu" ref={menuRef}>
        <MenuSection b={b} onOpen={setOpen} bag={bag} />
      </div>
    ),
    story: (
      <div key="story" ref={storyRef}>
        <Story b={b} act={act} />
      </div>
    ),
  };

  return (
    <div className="shop kiosk" style={shopVars(b)} ref={root}>
      {b.announcementOn && b.announcement && <div className="k-announce">{b.announcement}</div>}
      <header className={`s-head ${b.logoPosition === 'center' ? 'center' : ''}`}>
        <div className="s-wrap">
          <button className="s-brand" onClick={() => setView('home')}>
            <span className="lg">{b.logo ? <img src={b.logo} alt="" /> : '🍃'}</span>
            <span>
              <b>{b.storeName}</b>
              <small>{b.tagline}</small>
            </span>
          </button>
          <nav className="s-nav">
            <button className="lnk" onClick={() => act('menu')}>Menu</button>
            <button className="lnk" onClick={() => { setView('home'); setTimeout(() => act('story'), 30); }}>Our café</button>
            <button className="s-pill" onClick={() => setTrack(true)}>Track your order</button>
            <button className="s-pill" onClick={() => setBagOpen(true)} aria-label={`Bag, ${count} items`}>
              Bag <span className="n">{count}</span>
            </button>
          </nav>
        </div>
      </header>

      {view === 'home' && (
        <>
          {b.shopLayout !== 'gridfocus' && <Hero b={b} act={act} />}
          {b.sectionOrder.map((s) => sections[s])}
          <footer className="s-foot">
            <div className="s-wrap">
              <div className="s-brand" style={{ cursor: 'default' }}>
                <span className="lg">{b.logo ? <img src={b.logo} alt="" /> : '🍃'}</span>
                <b>{b.storeName}</b>
              </div>
              <span>{b.footerText} · <a href="#/loyalty">Loyalty card</a> · <a href="#/kiosk">Kiosk mode</a></span>
            </div>
          </footer>
        </>
      )}

      {view === 'cart' && <CartView b={b} cart={bag} setCart={setBag} onBack={() => setView('home')} onNext={() => setView('checkout')} onOpen={setOpen} />}
      {view === 'checkout' && (
        <Checkout
          cart={bag}
          orderTypeId=""
          preview={preview}
          onBack={() => setView('cart')}
          onPlaced={(o) => {
            setPlaced(o);
            setBag([]);
            setView('done');
          }}
        />
      )}
      {view === 'done' && <Done b={b} order={placed} onNew={() => { setPlaced(null); setView('home'); }} />}

      {bagOpen && (
        <div className="s-drawer-wrap" onClick={(e) => e.target === e.currentTarget && setBagOpen(false)}>
          <aside className="s-drawer" aria-label="Your bag">
            <header>
              <h3>Your bag</h3>
              <button className="s-x" style={{ position: 'static' }} onClick={() => setBagOpen(false)} aria-label="Close">✕</button>
            </header>
            <div className="items">
              {bag.length === 0 && <p className="k-muted" style={{ padding: '30px 0', textAlign: 'center' }}>Your bag is empty. Something sweet, perhaps?</p>}
              {bag.map((l) => (
                <div className="k-line" key={l.key}>
                  <img src={db.items.find((i) => i.id === l.itemId)?.image} alt="" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 17 }}>{l.name}</div>
                    {l.addons.length > 0 && <div className="k-muted" style={{ fontSize: 13 }}>{l.addons.map((a) => a.name).join(' · ')}</div>}
                    <div style={{ fontWeight: 700, marginTop: 2 }}>{money(lineTotal(l))}</div>
                  </div>
                  <div className="qty">
                    <button onClick={() => setBag((c) => (l.qty <= 1 ? c.filter((x) => x.key !== l.key) : c.map((x) => (x.key === l.key ? { ...x, qty: x.qty - 1 } : x))))} aria-label="Less">−</button>
                    <span>{l.qty}</span>
                    <button onClick={() => setBag((c) => c.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))} aria-label="More">+</button>
                  </div>
                </div>
              ))}
            </div>
            <footer>
              <div className="k-sum total" style={{ borderTop: 0, marginTop: 0, paddingTop: 0, marginBottom: 14 }}>
                <span>Subtotal</span>
                <span>{money(total)}</span>
              </div>
              <button className="kbtn block" disabled={!bag.length} onClick={() => { setBagOpen(false); setView('checkout'); }}>
                Checkout
              </button>
            </footer>
          </aside>
        </div>
      )}

      {track && <TrackModal onClose={() => setTrack(false)} onGo={(code) => { setTrack(false); if (!preview) nav(`/order/${code}`); }} />}

      {open && <ItemSheet item={open} b={b} onClose={() => setOpen(null)} onAdd={(l) => { add(l, open); setOpen(null); }} />}

      {upsell && !open && (
        <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && setUpsell(null)}>
          <div className="sheet" style={{ maxWidth: 440 }}>
            <img className="sheet-img" src={upsell.item.image} alt="" />
            <div className="sheet-body" style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 30 }}>{upsell.headline}</h2>
              <p className="k-muted" style={{ margin: 0 }}>{upsell.item.name} · {money(upsell.item.price)}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="kbtn soft block" onClick={() => setUpsell(null)}>No thanks</button>
                <button className="kbtn block" onClick={() => { const it = upsell.item; setUpsell(null); if (it.addonGroupIds.length) setOpen(it); else add(makeLine(it, [], 1, ''), it); }}>Add it</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ b, act }: { b: ShopButton; act: (a: ShopButton['action']) => void }) {
  return (
    <button className={`s-btn ${b.style}`} onClick={() => act(b.action)}>
      {b.label} <span aria-hidden>↗</span>
    </button>
  );
}

function Hero({ b, act }: { b: Branding; act: (a: ShopButton['action']) => void }) {
  const img = b.hero.image;
  return (
    <section
      className={`s-hero ${b.hero.align === 'center' ? 'center' : ''}`}
      style={img ? { backgroundImage: `linear-gradient(90deg, rgba(10,25,15,${0.35 + b.hero.overlay / 200}), rgba(10,25,15,${b.hero.overlay / 200})), url(${img})` } : { backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06), transparent 40%), linear-gradient(90deg, rgba(0,0,0,0.12), transparent)' }}
    >
      <div className="s-wrap">
        {b.heroEyebrow && <div className="eyebrow">{b.heroEyebrow}</div>}
        <h1>{b.hero.title}</h1>
        <p>{b.hero.subtitle}</p>
        <div className="s-btns" style={b.hero.align === 'center' ? { justifyContent: 'center' } : undefined}>
          {b.heroButtons.map((x) => <Btn key={x.id} b={x} act={act} />)}
        </div>
      </div>
      {b.heroBadge && (
        <div className="s-badge">
          <div>
            <div style={{ fontSize: 20 }}>✳</div>
            {b.heroBadge}
          </div>
        </div>
      )}
    </section>
  );
}

function Strip({ b }: { b: Branding }) {
  const items = b.introStrip.filter(Boolean);
  if (!items.length) return null;
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="s-strip" aria-label={items.join(', ')}>
      <div className="run">
        {[...row, ...row].map((t, i) => (
          <span key={i}>
            {t} <i>✳</i>
          </span>
        ))}
      </div>
    </div>
  );
}

function Story({ b, act }: { b: Branding; act: (a: ShopButton['action']) => void }) {
  const words = b.story.bubble.split(' ');
  const last = words.pop();
  return (
    <section className="s-story">
      <div className="s-wrap">
        <div className="s-blob">
          <span className="st">✳</span>
          <div className="in">
            <span>
              {words.join(' ')} <em>{last}</em>
            </span>
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--k-muted)' }}>{b.story.eyebrow}</div>
          <h2>
            {b.story.title}
            <br />
            <em>{b.story.titleItalic}</em>
          </h2>
          <p>{b.story.text}</p>
          <div className="s-btns" style={{ marginTop: 22 }}>
            {b.storyButtons.map((x) => <Btn key={x.id} b={x} act={act} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuSection({ b, onOpen, bag }: { b: Branding; onOpen: (i: MenuItem) => void; bag: CartLine[] }) {
  const db = useDB((d) => d);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cats = [...db.categories].filter((c) => c.active).sort((a, c) => a.sort - c.sort);
  const items = db.items.filter((i) => cats.some((c) => c.id === i.categoryId) && (cat === 'all' || i.categoryId === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const L = b.shopLayout;
  const branch = db.settings.kioskBranchId;
  const soldOut = (i: MenuItem) => !i.available || (i.trackStock && (i.stock[branch] ?? 0) <= 0);

  const card = (i: MenuItem) => {
    const so = soldOut(i);
    const inBag = bag.filter((l) => l.itemId === i.id).reduce((s, l) => s + l.qty, 0);
    if (L === 'list')
      return (
        <button key={i.id} className="row-item" onClick={() => !so && onOpen(i)} disabled={so} style={so ? { opacity: 0.5 } : undefined}>
          <div style={{ flex: 1 }}>
            <b>{i.name}</b>
            {b.showDescriptions && <div className="k-muted" style={{ fontSize: 13 }}>{i.description}</div>}
          </div>
          <span style={{ fontWeight: 700 }}>{so ? 'Sold out' : money(i.price)}</span>
          <span className="s-pill" style={{ height: 32 }}>+</span>
        </button>
      );
    return (
      <button key={i.id} className={`pc ${b.productCard} ${so ? 'sold' : ''}`} onClick={() => !so && onOpen(i)} disabled={so}>
        <div className="im">
          <img src={i.image} alt="" loading="lazy" style={L === 'mosaic' ? { aspectRatio: [1, 0.8, 1.25][i.name.length % 3] } : undefined} />
          {so ? <span className="tag">Sold out</span> : i.featured ? <span className="tag">★ Favourite</span> : null}
          {!so && <span className="add">+</span>}
        </div>
        <div className="bd">
          <div className="nm">
            <b>{i.name}</b>
            <span>{money(i.price)}</span>
          </div>
          {b.showDescriptions && i.description && <div className="ds">{i.description}</div>}
          <div className="cta">{inBag ? `${inBag} in bag · Add another` : 'Add to bag'}</div>
        </div>
      </button>
    );
  };

  const catButtons = (cls: string) => (
    <div className={`s-cats ${cls}`} role="tablist">
      <button className={`s-cat ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>Everything</button>
      {cats.map((c) => (
        <button key={c.id} className={`s-cat ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>
      ))}
    </div>
  );

  const featured = db.items.find((i) => i.featured && !soldOut(i));
  const gridCls = L === 'gridfocus' ? 'dense' : L === 'mosaic' ? 'mosaic' : L === 'kiosk' ? 'kiosk' : '';
  const grid = L === 'list' ? <div className="s-list">{items.map(card)}</div> : <div className={`s-grid ${gridCls}`}>{items.map(card)}</div>;

  return (
    <section className="s-menu">
      <div className="s-wrap">
        <div className="top">
          <div>
            <div className="eyebrow">{b.menuEyebrow}</div>
            <h2>{b.menuTitle}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <p className="sub" style={{ margin: 0 }}>{b.menuSubtitle}</p>
            <input className="kin" style={{ height: 40, width: 240, borderRadius: 999 }} placeholder="Search the menu" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {L === 'magazine' && featured && cat === 'all' && !q && (
          <button className="s-feature" onClick={() => onOpen(featured)}>
            <img src={featured.image} alt="" />
            <div>
              <span style={{ letterSpacing: '0.16em', fontSize: 12, textTransform: 'uppercase', opacity: 0.8 }}>House favourite</span>
              <h3 className="serif">{featured.name}</h3>
              <p style={{ opacity: 0.85, margin: 0 }}>{featured.description}</p>
              <span style={{ fontWeight: 700 }}>{money(featured.price)} · Add to bag ↗</span>
            </div>
          </button>
        )}
        {L === 'sidebar' ? (
          <div className="s-body sidebar">
            {catButtons('vertical')}
            {grid}
          </div>
        ) : L === 'kiosk' ? (
          <div className="s-body">
            <div className="s-grid dense" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {[{ id: 'all', name: 'Everything' }, ...cats].map((c) => (
                <button key={c.id} className={`s-cat ${cat === c.id ? 'on' : ''}`} style={{ height: 76, fontSize: 16, fontWeight: 700, textAlign: 'center', whiteSpace: 'normal' }} onClick={() => setCat(c.id)}>{c.name}</button>
              ))}
            </div>
            {grid}
          </div>
        ) : (
          <div className="s-body">
            {catButtons(L === 'storefront' ? 'sticky' : '')}
            {grid}
          </div>
        )}
        {!items.length && <p className="k-muted" style={{ textAlign: 'center', padding: 40 }}>Nothing here yet.</p>}
      </div>
    </section>
  );
}

function TrackModal({ onClose, onGo }: { onClose: () => void; onGo: (code: string) => void }) {
  const [code, setCode] = useState('');
  const orders = useDB((d) => d.orders);
  const clean = code.replace(/\D/g, '');
  const found = orders.find((o) => o.code === clean);
  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="s-modal" onSubmit={(e) => { e.preventDefault(); if (clean.length === 4) onGo(clean); }}>
        <button type="button" className="s-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="eyebrow" style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--k-muted)' }}>Order tracking</div>
        <h3 className="serif">Track your order</h3>
        <p className="k-muted" style={{ marginTop: 0 }}>Paste the four digit code from your receipt to see the latest update.</p>
        <label style={{ fontWeight: 700, fontSize: 13 }}>Order code</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <input className="kin" autoFocus inputMode="numeric" placeholder="#9692" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="kbtn" disabled={clean.length !== 4} style={{ flex: 'none' }}>Track order →</button>
        </div>
        {clean.length === 4 && !found && <p className="k-muted" style={{ fontSize: 13, marginBottom: 0 }}>We couldn't find that code on this device yet.</p>}
      </form>
    </div>
  );
}
