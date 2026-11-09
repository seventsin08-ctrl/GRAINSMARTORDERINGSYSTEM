import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { update, useDB } from '../../store/db';
import type { Branding } from '../../store/types';
import Kiosk, { type KioskScreen } from '../../kiosk/Kiosk';
import { Field, ImagePicker, Seg, ToggleRow, toast } from '../../components/ui';
import { PRESETS } from '../../lib/theme';
import { isAuthed } from '../AdminLayout';

const SCREENS: { value: KioskScreen; label: string }[] = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'type', label: 'Order type' },
  { value: 'menu', label: 'Menu' },
  { value: 'cart', label: 'Cart' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'done', label: 'Order sent' },
];

type SectionId = 'theme' | 'brand' | 'easy' | 'announce' | 'hero' | 'layout' | 'welcome';

function Section({ id, title, open, onToggle, children }: { id: SectionId; title: string; open: boolean; onToggle: (id: SectionId) => void; children: ReactNode }) {
  return (
    <div className="studio-sec">
      <button onClick={() => onToggle(id)}>
        {title}
        <span className="muted" style={{ fontSize: 11 }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="inner">{children}</div>}
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="row between">
      <span>{label}</span>
      <div className="row" style={{ gap: 6 }}>
        <input className="input mono" style={{ width: 92, height: 32, fontSize: 12 }} value={value} onChange={(e) => onChange(e.target.value)} />
        <input type="color" className="input" style={{ height: 32, width: 40 }} value={value.length === 7 ? value : '#000000'} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export default function BrandingStudio({ initial = 'brand' }: { initial?: SectionId }) {
  const saved = useDB((d) => d.branding);
  const nav = useNavigate();
  const [history, setHistory] = useState<Branding[]>([saved]);
  const [pos, setPos] = useState(0);
  const draft = history[pos];
  const [screen, setScreen] = useState<KioskScreen>(initial === 'welcome' ? 'welcome' : 'menu');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tryIt, setTryIt] = useState(false);
  const [open, setOpen] = useState<SectionId | null>(initial);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!isAuthed()) nav('/admin/login', { replace: true });
  }, [nav]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const set = (p: Partial<Branding>) => {
    const next = { ...draft, ...p };
    setHistory((h) => [...h.slice(0, pos + 1), next].slice(-60));
    setPos((p0) => Math.min(p0 + 1, 59));
  };
  const setHero = (p: Partial<Branding['hero']>) => set({ hero: { ...draft.hero, ...p } });
  const setWelcome = (p: Partial<Branding['welcome']>) => set({ welcome: { ...draft.welcome, ...p } });
  const toggle = (id: SectionId) => setOpen((o) => (o === id ? null : id));
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const isOpen = (id: SectionId, keywords: string) => open === id || (!!q && match(keywords));

  return (
    <div className="studio">
      <aside className="studio-side">
        <div className="studio-top">
          <Link to="/admin" className="btn sm ghost">← Admin</Link>
          <b className="grow">Branding Studio</b>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <input className="input" placeholder="Find a setting" value={q} onChange={(e) => setQ(e.target.value)} />
          <p className="small muted" style={{ margin: '8px 0 0' }}>Changes preview instantly. Nothing is saved until you publish.</p>
        </div>

        {match('theme presets colors') && (
          <Section id="theme" title="Theme presets" open={isOpen('theme', 'theme presets colors')} onToggle={toggle}>
            <div className="swatches">
              {PRESETS.map((p) => (
                <button key={p.name} className="swatch" onClick={() => set(p.values)}>
                  <div className="dots">{[p.values.background, p.values.surface, p.values.accent, p.values.text].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
                  {p.name}
                </button>
              ))}
            </div>
          </Section>
        )}

        {match('global brand logo name colors font radius store tagline') && (
          <Section id="brand" title="Global brand" open={isOpen('brand', 'global brand logo name colors font radius store tagline')} onToggle={toggle}>
            <ImagePicker label="Logo" value={draft.logo} onChange={(logo) => set({ logo })} size={400} />
            <Field label="Store name"><input className="input" value={draft.storeName} onChange={(e) => set({ storeName: e.target.value })} /></Field>
            <Field label="Tagline"><input className="input" value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} /></Field>
            <Color label="Accent" value={draft.accent} onChange={(accent) => set({ accent })} />
            <Color label="Text on accent" value={draft.accentText} onChange={(accentText) => set({ accentText })} />
            <Color label="Background" value={draft.background} onChange={(background) => set({ background })} />
            <Color label="Cards" value={draft.surface} onChange={(surface) => set({ surface })} />
            <Color label="Text" value={draft.text} onChange={(text) => set({ text })} />
            <Field label="Font">
              <select className="input" value={draft.font} onChange={(e) => set({ font: e.target.value as Branding['font'] })}>
                <option value="system">San Francisco / System</option>
                <option value="serif">Serif (New York)</option>
                <option value="rounded">Rounded</option>
                <option value="mono">Monospace</option>
              </select>
            </Field>
            <Field label={`Corner roundness · ${draft.radius}px`}><input type="range" min={0} max={32} value={draft.radius} onChange={(e) => set({ radius: +e.target.value })} /></Field>
          </Section>
        )}

        {match('easy ordering senior friendly') && (
          <Section id="easy" title="Easy ordering" open={isOpen('easy', 'easy ordering senior friendly')} onToggle={toggle}>
            <ToggleRow label="Senior-friendly mode" on={draft.seniorMode} onChange={(seniorMode) => set({ seniorMode })} />
            <p className="small muted" style={{ margin: 0, background: 'var(--fill)', padding: 12, borderRadius: 12 }}>
              For stores with older customers. Makes text and buttons larger, labels the cart and back buttons, and adds step numbers (1 Choose food → 2 Check cart → 3 Your details → 4 Order sent).
            </p>
          </Section>
        )}

        {match('announcement promotions banner') && (
          <Section id="announce" title="Announcement & promotions" open={isOpen('announce', 'announcement promotions banner')} onToggle={toggle}>
            <ToggleRow label="Show announcement bar" on={draft.announcementOn} onChange={(announcementOn) => set({ announcementOn })} />
            <Field label="Message"><input className="input" value={draft.announcement} onChange={(e) => set({ announcement: e.target.value })} /></Field>
          </Section>
        )}

        {match('hero header title image banner') && (
          <Section id="hero" title="Hero" open={isOpen('hero', 'hero header title image banner')} onToggle={toggle}>
            <Field label="Title"><input className="input" value={draft.hero.title} onChange={(e) => setHero({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><input className="input" value={draft.hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} /></Field>
            <ImagePicker label="Background image" value={draft.hero.image} onChange={(image) => setHero({ image })} size={1600} />
            <Field label="Alignment"><Seg value={draft.hero.align} onChange={(align) => setHero({ align })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]} /></Field>
            {draft.hero.image && <Field label={`Darken image · ${draft.hero.overlay}%`}><input type="range" min={0} max={80} value={draft.hero.overlay} onChange={(e) => setHero({ overlay: +e.target.value })} /></Field>}
          </Section>
        )}

        {match('layout menu cards grid list columns card style descriptions') && (
          <Section id="layout" title="Layout & menu cards" open={isOpen('layout', 'layout menu cards grid list columns card style descriptions')} onToggle={toggle}>
            <Field label="Layout"><Seg value={draft.menuLayout} onChange={(menuLayout) => set({ menuLayout })} options={[{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} /></Field>
            {draft.menuLayout === 'grid' && <Field label="Card size"><Seg value={draft.columns} onChange={(columns) => set({ columns })} options={[{ value: 2, label: 'Large' }, { value: 3, label: 'Medium' }, { value: 4, label: 'Small' }]} /></Field>}
            <Field label="Card style"><Seg value={draft.cardStyle} onChange={(cardStyle) => set({ cardStyle })} options={[{ value: 'elevated', label: 'Shadow' }, { value: 'outline', label: 'Outline' }, { value: 'flat', label: 'Flat' }]} /></Field>
            <ToggleRow label="Show descriptions" on={draft.showDescriptions} onChange={(showDescriptions) => set({ showDescriptions })} />
          </Section>
        )}

        {match('welcome page attract screen idle') && (
          <Section id="welcome" title="Welcome page" open={isOpen('welcome', 'welcome page attract screen idle')} onToggle={toggle}>
            <Field label="Headline"><input className="input" value={draft.welcome.title} onChange={(e) => setWelcome({ title: e.target.value })} /></Field>
            <Field label="Subtitle"><input className="input" value={draft.welcome.subtitle} onChange={(e) => setWelcome({ subtitle: e.target.value })} /></Field>
            <Field label="Button"><input className="input" value={draft.welcome.button} onChange={(e) => setWelcome({ button: e.target.value })} /></Field>
            <ImagePicker label="Background image" value={draft.welcome.image} onChange={(image) => setWelcome({ image })} size={1600} />
            <Field label="Return to welcome after (seconds idle)"><input className="input" type="number" min={20} value={draft.welcome.idleSeconds} onChange={(e) => setWelcome({ idleSeconds: +e.target.value })} /></Field>
          </Section>
        )}
      </aside>

      <section className="studio-main">
        <div className="studio-bar">
          <button className="btn sm icon" disabled={pos === 0} onClick={() => setPos(pos - 1)} title="Undo">↶</button>
          <button className="btn sm icon" disabled={pos >= history.length - 1} onClick={() => setPos(pos + 1)} title="Redo">↷</button>
          <Seg value={tryIt ? 'try' : 'edit'} onChange={(v) => setTryIt(v === 'try')} options={[{ value: 'edit', label: 'Edit' }, { value: 'try', label: 'Try it' }]} />
          <Seg value={device} onChange={setDevice} options={[{ value: 'desktop', label: 'Desktop' }, { value: 'tablet', label: 'Tablet' }, { value: 'mobile', label: 'Mobile' }]} />
          <span className="small muted">{dirty ? 'Unpublished changes' : 'No changes'}</span>
          <button className="btn sm" disabled={!dirty} onClick={() => { setHistory([saved]); setPos(0); }}>Discard</button>
          <button className="btn sm primary" disabled={!dirty} onClick={() => { update((d) => { d.branding = draft; }); setHistory([draft]); setPos(0); toast('Published to the kiosk'); }}>Publish</button>
        </div>
        {!tryIt && (
          <div className="studio-bar" style={{ paddingTop: 0 }}>
            <Seg value={screen} onChange={setScreen} options={SCREENS} />
          </div>
        )}
        <div className="studio-frame" style={{ maxWidth: device === 'desktop' ? 'calc(100% - 40px)' : device === 'tablet' ? 820 : 400 }}>
          <Kiosk key={tryIt ? 'try' : 'edit'} branding={draft} screen={tryIt ? undefined : screen} preview />
        </div>
        <p className="small muted" style={{ textAlign: 'center', margin: '0 0 12px' }}>Live preview · orders can't be placed from the preview</p>
      </section>
    </div>
  );
}
