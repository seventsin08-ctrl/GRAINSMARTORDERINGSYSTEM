import { useEffect, useMemo, useRef, useState } from 'react';
import { update, useDB } from '../../store/db';
import type { Branding, ProductCard, ShopButton, ShopLayout, ShopSection } from '../../store/types';
import Shop from '../../shop/Shop';
import Kiosk, { type KioskScreen } from '../../kiosk/Kiosk';
import { Field, ImagePicker, Seg, ToggleRow, toast } from '../../components/ui';
import { FONT_PAIRS, LOOKS } from '../../lib/theme';
import { DEFAULT_BRANDING, btn } from '../../store/seed';
import { uid } from '../../store/db';

const LAYOUTS: { id: ShopLayout; label: string; desc: string; thumb: string }[] = [
  { id: 'default', label: 'Default', desc: 'Classic layout with horizontal category tabs', thumb: 'g:1fr 1fr 1fr / tabs' },
  { id: 'sidebar', label: 'Sidebar', desc: 'Left sidebar navigation with compact grid', thumb: 'side' },
  { id: 'magazine', label: 'Magazine', desc: 'Editorial style with featured item and grid', thumb: 'mag' },
  { id: 'gridfocus', label: 'Grid Focus', desc: 'Photo-forward dense grid, no hero section', thumb: 'dense' },
  { id: 'list', label: 'List', desc: 'Ultra-minimal single-column list rows', thumb: 'list' },
  { id: 'mosaic', label: 'Mosaic', desc: 'Pinterest-style masonry with organic spacing', thumb: 'mosaic' },
  { id: 'storefront', label: 'Storefront', desc: 'Shop-style collection with a sticky category bar', thumb: 'store' },
  { id: 'kiosk', label: 'Kiosk', desc: 'Fast-food kiosk with big category tiles', thumb: 'kiosk' },
];

const CARDS: { id: ProductCard; label: string }[] = [
  { id: 'classic', label: 'Classic' }, { id: 'soft', label: 'Soft' }, { id: 'minimal', label: 'Minimal' }, { id: 'framed', label: 'Framed' },
  { id: 'editorial', label: 'Editorial' }, { id: 'accent', label: 'Accent' }, { id: 'floating', label: 'Floating' }, { id: 'compact', label: 'Compact' },
  { id: 'rounded', label: 'Rounded' }, { id: 'imagefirst', label: 'Image first' },
];

const ACTIONS: { value: ShopButton['action']; label: string }[] = [
  { value: 'menu', label: 'Open menu' }, { value: 'bag', label: 'Open basket' }, { value: 'track', label: 'Track order' }, { value: 'story', label: 'Our café' }, { value: 'kiosk', label: 'Kiosk mode' },
];

const SECTION_LABEL: Record<ShopSection, string> = { intro: 'Intro strip', menu: 'Menu', story: 'Story' };

function Thumb({ kind }: { kind: string }) {
  const I = ({ g, s }: { g?: boolean; s?: React.CSSProperties }) => <i className={g ? 'g' : ''} style={s} />;
  const map: Record<string, JSX.Element> = {
    'g:1fr 1fr 1fr / tabs': <div className="layout-thumb" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '6px 1fr 1fr' }}><I g /><I /><I /><I /><I /><I /><I /></div>,
    side: <div className="layout-thumb" style={{ gridTemplateColumns: '14px 1fr', gridTemplateRows: '1fr 1fr 1fr' }}><I g /><I s={{ gridRow: 'span 3' }} /><I /><I /></div>,
    mag: <div className="layout-thumb" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' }}><I g s={{ gridColumn: 'span 2' }} /><I /><I /></div>,
    dense: <div className="layout-thumb" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '6px 1fr 1fr' }}><I g /><I /><I /><I /><I /><I /><I /><I /><I /></div>,
    list: <div className="layout-thumb" style={{ gridTemplateColumns: '10px 1fr', gridTemplateRows: 'repeat(4,1fr)' }}><I g /><I /><I /><I /><I /><I /><I /><I /></div>,
    mosaic: <div className="layout-thumb" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr 1fr 1fr' }}><I g s={{ gridRow: 'span 2' }} /><I /><I s={{ gridRow: 'span 2' }} /><I /><I /><I /></div>,
    store: <div className="layout-thumb" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '6px 1fr' }}><I g /><I /><I /><I /><I /><I /></div>,
    kiosk: <div className="layout-thumb" style={{ gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr' }}><I g /><I /><I /></div>,
  };
  return map[kind];
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="row" style={{ gap: 6 }}>
        <input type="color" className="input" style={{ height: 38, width: '100%', padding: 3 }} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input className="input mono" style={{ width: 100, fontSize: 12 }} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function Buttons({ list, onChange }: { list: ShopButton[]; onChange: (l: ShopButton[]) => void }) {
  const set = (i: number, p: Partial<ShopButton>) => onChange(list.map((b, k) => (k === i ? { ...b, ...p } : b)));
  const move = (i: number, d: number) => {
    const n = [...list];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      {list.map((b, i) => (
        <div key={b.id} className="row" style={{ gap: 6 }}>
          <input className="input" value={b.label} onChange={(e) => set(i, { label: e.target.value })} />
          <select className="input" value={b.action} onChange={(e) => set(i, { action: e.target.value as ShopButton['action'] })}>{ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
          <select className="input" style={{ width: 130 }} value={b.style} onChange={(e) => set(i, { style: e.target.value as ShopButton['style'] })}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="link">Text link</option></select>
          <button className="btn sm icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
          <button className="btn sm icon" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
          <button className="btn sm icon" onClick={() => onChange(list.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
        </div>
      ))}
      <button className="btn ghost" style={{ alignSelf: 'flex-start', color: 'var(--accent)' }} onClick={() => onChange([...list, btn(uid('b'), 'New button', 'menu', 'secondary')])}>+ Add a button</button>
    </div>
  );
}

const H = ({ children, id }: { children: React.ReactNode; id?: string }) => <h2 id={id} className="h-serif" style={{ fontSize: 24, margin: '34px 0 6px' }}>{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="small muted" style={{ marginTop: 0 }}>{children}</p>;

export default function BrandingPage({ initial }: { initial?: 'hero' | 'welcome' }) {
  const saved = useDB((d) => d.branding);
  const [draft, setDraft] = useState<Branding>(saved);
  const [past, setPast] = useState<Branding[]>([]);
  const [target, setTarget] = useState<'shop' | 'kiosk'>(initial === 'welcome' ? 'kiosk' : 'shop');
  const [screen, setScreen] = useState<KioskScreen>('welcome');
  const top = useRef<HTMLDivElement>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  useEffect(() => {
    if (initial) document.getElementById(`sec-${initial}`)?.scrollIntoView({ behavior: 'smooth' });
  }, [initial]);

  const set = (p: Partial<Branding>) => {
    setPast((h) => [...h.slice(-40), draft]);
    setDraft((d) => ({ ...d, ...p }));
  };

  return (
    <div ref={top}>
      <div className="page-head">
        <div>
          <h1>Shop design</h1>
          <p>Preview your changes, then save once to apply them to the storefront and kiosk.</p>
        </div>
        <div className="row">
          <button className="btn" disabled={!past.length} onClick={() => { setDraft(past[past.length - 1]); setPast((h) => h.slice(0, -1)); }}>↶ Undo</button>
          <button className="btn" disabled={!dirty} onClick={() => { setDraft(saved); setPast([]); }}>Discard</button>
          <button className="btn primary lg" disabled={!dirty} onClick={() => { update((d) => { d.branding = draft; }); toast('Saved — your shop is updated'); }}>Save design</button>
        </div>
      </div>
      <div className="design">
        <div>
          <H>Look and feel</H>
          <div className="row wrap">
            {LOOKS.map((l) => (
              <button key={l.id} className={`btn lg ${draft.look === l.id ? 'primary' : 'outline'}`} onClick={() => set({ ...l.values, look: l.id })}>{l.label}</button>
            ))}
          </div>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <Color label="Shop accent" value={draft.accent} onChange={(accent) => set({ accent, look: 'custom' })} />
            <Color label="Page background" value={draft.background} onChange={(background) => set({ background, look: 'custom' })} />
            <Color label="Cards" value={draft.surface} onChange={(surface) => set({ surface, look: 'custom' })} />
            <Color label="Text" value={draft.text} onChange={(text) => set({ text, look: 'custom' })} />
          </div>

          <H>Font pairing</H>
          <P>Choose a heading and reading style for the customer storefront.</P>
          <div className="choice-grid">
            {FONT_PAIRS.map((f) => (
              <button key={f.id} className={`choice ${draft.fontPair === f.id ? 'on' : ''}`} onClick={() => set({ fontPair: f.id })}>
                <span className="aa" style={{ fontFamily: f.head, fontWeight: f.weight }}>Aa</span>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Logo position"><select className="input" value={draft.logoPosition} onChange={(e) => set({ logoPosition: e.target.value as Branding['logoPosition'] })}><option value="left">Left</option><option value="center">Center</option></select></Field>
          </div>

          <H>Layout &amp; menu cards</H>
          <P>Choose how categories and products are arranged on the shop page.</P>
          <div className="choice-grid">
            {LAYOUTS.map((l) => (
              <button key={l.id} className={`choice ${draft.shopLayout === l.id ? 'on' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', fontWeight: 400 }} onClick={() => set({ shopLayout: l.id })}>
                <Thumb kind={l.thumb} />
                <b>{l.label}</b>
                <span className="small muted">{l.desc}</span>
              </button>
            ))}
          </div>

          <H>Product card style</H>
          <P>Choose how menu items look on the customer storefront. Your selection applies to every product card.</P>
          <div className="choice-grid">
            {CARDS.map((c) => (
              <button key={c.id} className={`choice ${draft.productCard === c.id ? 'on' : ''}`} onClick={() => set({ productCard: c.id })}>
                <span className="aa" style={c.id === 'accent' ? { background: draft.accent, color: '#fff' } : c.id === 'editorial' ? { background: '#ece4d4', fontStyle: 'italic' } : c.id === 'framed' ? { border: '1.5px solid var(--text)', background: 'transparent' } : c.id === 'minimal' ? { background: 'transparent', border: '1px solid var(--line)' } : undefined}>Aa</span>
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><ToggleRow label="Show product descriptions" on={draft.showDescriptions} onChange={(showDescriptions) => set({ showDescriptions })} /></div>

          <H>Shop identity</H>
          <div className="stack">
            <Field label="Shop name"><input className="input" value={draft.storeName} onChange={(e) => set({ storeName: e.target.value })} /></Field>
            <Field label="Tagline"><input className="input" value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} /></Field>
            <ImagePicker label="Shop logo image" value={draft.logo} onChange={(logo) => set({ logo })} size={400} />
            <ImagePicker label="Admin dashboard logo (replaces the logo in the admin sidebar only)" value={draft.adminLogo} onChange={(adminLogo) => set({ adminLogo })} size={300} />
            {draft.logo !== DEFAULT_BRANDING.logo && <button className="btn ghost" style={{ alignSelf: 'flex-start', color: 'var(--accent)' }} onClick={() => set({ logo: DEFAULT_BRANDING.logo })}>Use the GrainSmart mark</button>}
          </div>

          <H id="sec-hero">Hero section</H>
          <div className="stack">
            <Field label="Small heading above"><input className="input" value={draft.heroEyebrow} onChange={(e) => set({ heroEyebrow: e.target.value })} /></Field>
            <Field label="Headline"><textarea className="input" rows={2} value={draft.hero.title} onChange={(e) => set({ hero: { ...draft.hero, title: e.target.value } })} /></Field>
            <Field label="Supporting text"><textarea className="input" rows={2} value={draft.hero.subtitle} onChange={(e) => set({ hero: { ...draft.hero, subtitle: e.target.value } })} /></Field>
            <Field label="Text alignment"><select className="input" value={draft.hero.align} onChange={(e) => set({ hero: { ...draft.hero, align: e.target.value as 'left' | 'center' } })}><option value="left">Left</option><option value="center">Center</option></select></Field>
            <ImagePicker label="Hero photo" value={draft.hero.image} onChange={(image) => set({ hero: { ...draft.hero, image } })} size={1800} />
            {draft.hero.image && <Field label={`Darken photo · ${draft.hero.overlay}%`}><input type="range" min={0} max={90} value={draft.hero.overlay} onChange={(e) => set({ hero: { ...draft.hero, overlay: +e.target.value } })} /></Field>}
            <Field label="Round badge text"><input className="input" value={draft.heroBadge} onChange={(e) => set({ heroBadge: e.target.value })} /></Field>
          </div>

          <H>Hero buttons</H>
          <Buttons list={draft.heroButtons} onChange={(heroButtons) => set({ heroButtons })} />

          <H>Intro strip</H>
          <P>Short phrases that scroll under the hero. One per line.</P>
          <textarea className="input" rows={4} value={draft.introStrip.join('\n')} onChange={(e) => set({ introStrip: e.target.value.split('\n') })} />

          <H>Menu heading</H>
          <div className="grid g2">
            <Field label="Small heading"><input className="input" value={draft.menuEyebrow} onChange={(e) => set({ menuEyebrow: e.target.value })} /></Field>
            <Field label="Title"><input className="input" value={draft.menuTitle} onChange={(e) => set({ menuTitle: e.target.value })} /></Field>
          </div>
          <Field label="Side text"><input className="input" value={draft.menuSubtitle} onChange={(e) => set({ menuSubtitle: e.target.value })} /></Field>

          <H>Story section</H>
          <div className="stack">
            <Field label="Small heading"><input className="input" value={draft.story.eyebrow} onChange={(e) => set({ story: { ...draft.story, eyebrow: e.target.value } })} /></Field>
            <div className="grid g2">
              <Field label="Title"><input className="input" value={draft.story.title} onChange={(e) => set({ story: { ...draft.story, title: e.target.value } })} /></Field>
              <Field label="Title (italic line)"><input className="input" value={draft.story.titleItalic} onChange={(e) => set({ story: { ...draft.story, titleItalic: e.target.value } })} /></Field>
            </div>
            <Field label="Text"><textarea className="input" rows={3} value={draft.story.text} onChange={(e) => set({ story: { ...draft.story, text: e.target.value } })} /></Field>
            <Field label="Bubble text"><input className="input" value={draft.story.bubble} onChange={(e) => set({ story: { ...draft.story, bubble: e.target.value } })} /></Field>
          </div>

          <H>Story buttons</H>
          <Buttons list={draft.storyButtons} onChange={(storyButtons) => set({ storyButtons })} />

          <H>Section order</H>
          <div className="stack" style={{ gap: 6 }}>
            {draft.sectionOrder.map((s, i) => (
              <div key={s} className="row between" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 14px' }}>
                <span>{SECTION_LABEL[s]}</span>
                <div className="row">
                  <button className="btn sm icon" disabled={i === 0} onClick={() => { const n = [...draft.sectionOrder]; [n[i], n[i - 1]] = [n[i - 1], n[i]]; set({ sectionOrder: n }); }} aria-label="Move up">↑</button>
                  <button className="btn sm icon" disabled={i === draft.sectionOrder.length - 1} onClick={() => { const n = [...draft.sectionOrder]; [n[i], n[i + 1]] = [n[i + 1], n[i]]; set({ sectionOrder: n }); }} aria-label="Move down">↓</button>
                </div>
              </div>
            ))}
          </div>

          <H>Announcement &amp; footer</H>
          <div className="stack">
            <ToggleRow label="Show announcement bar" on={draft.announcementOn} onChange={(announcementOn) => set({ announcementOn })} />
            <Field label="Announcement"><input className="input" value={draft.announcement} onChange={(e) => set({ announcement: e.target.value })} /></Field>
            <Field label="Footer text"><input className="input" value={draft.footerText} onChange={(e) => set({ footerText: e.target.value })} /></Field>
          </div>

          <H id="sec-welcome">In-store kiosk</H>
          <P>The touch-screen ordering mode at /kiosk uses the same colors and fonts.</P>
          <div className="stack">
            <Field label="Welcome headline"><input className="input" value={draft.welcome.title} onChange={(e) => set({ welcome: { ...draft.welcome, title: e.target.value } })} /></Field>
            <Field label="Welcome subtitle"><input className="input" value={draft.welcome.subtitle} onChange={(e) => set({ welcome: { ...draft.welcome, subtitle: e.target.value } })} /></Field>
            <Field label="Button"><input className="input" value={draft.welcome.button} onChange={(e) => set({ welcome: { ...draft.welcome, button: e.target.value } })} /></Field>
            <ImagePicker label="Welcome background" value={draft.welcome.image} onChange={(image) => set({ welcome: { ...draft.welcome, image } })} size={1800} />
            <Field label="Return to welcome after (seconds idle)"><input className="input" type="number" min={20} value={draft.welcome.idleSeconds} onChange={(e) => set({ welcome: { ...draft.welcome, idleSeconds: +e.target.value } })} /></Field>
            <ToggleRow label="Senior-friendly mode" hint="Larger text and buttons, labelled back buttons and step numbers." on={draft.seniorMode} onChange={(seniorMode) => set({ seniorMode })} />
          </div>
        </div>

        <aside className="design-preview">
          <div className="row between" style={{ marginBottom: 10 }}>
            <span className="eyebrow" style={{ margin: 0 }}>Live store preview</span>
            <div className="row">
              <Seg value={target} onChange={setTarget} options={[{ value: 'shop', label: 'Website' }, { value: 'kiosk', label: 'Kiosk' }]} />
              <a className="btn sm outline" href={target === 'shop' ? '#/' : '#/kiosk'} target="_blank" rel="noreferrer">Open live ↗</a>
            </div>
          </div>
          {target === 'kiosk' && (
            <div style={{ marginBottom: 8, overflowX: 'auto' }}>
              <Seg value={screen} onChange={setScreen} options={[{ value: 'welcome', label: 'Welcome' }, { value: 'menu', label: 'Menu' }, { value: 'cart', label: 'Cart' }, { value: 'checkout', label: 'Checkout' }, { value: 'done', label: 'Done' }]} />
            </div>
          )}
          <div className="small faint" style={{ background: 'var(--surface-2)', padding: '4px 10px', borderRadius: '10px 10px 0 0' }}>Draft preview · changes here are not saved</div>
          <div className="design-frame">
            {target === 'shop' ? <Shop branding={draft} preview /> : <Kiosk branding={draft} screen={screen} preview />}
          </div>
        </aside>
      </div>
    </div>
  );
}
