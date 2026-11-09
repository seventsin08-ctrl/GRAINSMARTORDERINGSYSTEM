import type { CSSProperties } from 'react';
import type { Branding } from '../store/types';

const FONTS: Record<Branding['font'], string> = {
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: '"New York", "Iowan Old Style", Georgia, "Times New Roman", serif',
  rounded: '"SF Pro Rounded", ui-rounded, "Nunito", "Varela Round", system-ui, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, Consolas, monospace',
};

export const PRESETS: { name: string; values: Partial<Branding> }[] = [
  { name: 'Classic', values: { mode: 'light', accent: '#0071e3', accentText: '#ffffff', background: '#f5f5f7', surface: '#ffffff', text: '#1d1d1f' } },
  { name: 'Midnight', values: { mode: 'dark', accent: '#2997ff', accentText: '#ffffff', background: '#000000', surface: '#1c1c1e', text: '#f5f5f7' } },
  { name: 'Espresso', values: { mode: 'dark', accent: '#c8a27a', accentText: '#1b130d', background: '#16110d', surface: '#241b15', text: '#f4ebe1' } },
  { name: 'Matcha', values: { mode: 'light', accent: '#3a7d44', accentText: '#ffffff', background: '#f3f5ee', surface: '#ffffff', text: '#1f2a1f' } },
  { name: 'Sunset', values: { mode: 'light', accent: '#e8590c', accentText: '#ffffff', background: '#fff7f0', surface: '#ffffff', text: '#2b1a10' } },
  { name: 'Berry', values: { mode: 'light', accent: '#c2255c', accentText: '#ffffff', background: '#fbf3f6', surface: '#ffffff', text: '#2a1520' } },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number) {
  try {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch {
    return hex;
  }
}

export function brandVars(b: Branding): CSSProperties {
  return {
    '--k-accent': b.accent,
    '--k-accent-text': b.accentText,
    '--k-accent-soft': rgba(b.accent, 0.12),
    '--k-bg': b.background,
    '--k-surface': b.surface,
    '--k-text': b.text,
    '--k-muted': rgba(b.text, 0.56),
    '--k-line': rgba(b.text, 0.1),
    '--k-fill': rgba(b.text, 0.05),
    '--k-radius': `${b.radius}px`,
    '--k-font': FONTS[b.font],
    '--k-scale': b.seniorMode ? '1.2' : '1',
    colorScheme: b.mode,
  } as CSSProperties;
}

export const FONT_PAIRS: { id: Branding['fontPair']; label: string; head: string; body: string; weight: number }[] = [
  { id: 'warm', label: 'Warm classic', head: "'Newsreader', Georgia, 'Times New Roman', serif", body: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif", weight: 500 },
  { id: 'modern', label: 'Clean modern', head: "'Inter', -apple-system, 'Segoe UI', sans-serif", body: "'Inter', -apple-system, 'Segoe UI', sans-serif", weight: 700 },
  { id: 'editorial', label: 'Editorial', head: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', -apple-system, sans-serif", weight: 600 },
  { id: 'rounded', label: 'Friendly rounded', head: "'Nunito', ui-rounded, 'Segoe UI', sans-serif", body: "'Nunito', ui-rounded, sans-serif", weight: 800 },
  { id: 'humanist', label: 'Humanist', head: "'Source Sans 3', -apple-system, sans-serif", body: "'Source Sans 3', -apple-system, sans-serif", weight: 700 },
  { id: 'geometric', label: 'Geometric', head: "'DM Sans', -apple-system, sans-serif", body: "'DM Sans', -apple-system, sans-serif", weight: 700 },
  { id: 'softdisplay', label: 'Soft display', head: "'Fraunces', Georgia, serif", body: "-apple-system, 'Inter', sans-serif", weight: 500 },
  { id: 'compact', label: 'Compact', head: "'Inter', -apple-system, sans-serif", body: "'Inter', -apple-system, sans-serif", weight: 600 },
];

export const LOOKS: { id: Branding['look']; label: string; values: Partial<Branding> }[] = [
  { id: 'garden', label: 'Garden', values: { mode: 'light', accent: '#2f5640', accentText: '#ffffff', background: '#fbfaf6', surface: '#ffffff', text: '#1f2a22' } },
  { id: 'sunday', label: 'Sunday café', values: { mode: 'light', accent: '#8a5a2b', accentText: '#ffffff', background: '#fbf5ec', surface: '#ffffff', text: '#2b2118' } },
  { id: 'afterdark', label: 'After dark', values: { mode: 'dark', accent: '#c9a26b', accentText: '#1a1712', background: '#161512', surface: '#211f1b', text: '#f1ece2' } },
];

export function shopVars(b: Branding): CSSProperties {
  const fp = FONT_PAIRS.find((f) => f.id === b.fontPair) ?? FONT_PAIRS[0];
  return {
    ...brandVars(b),
    '--k-font': fp.head,
    '--s-head': fp.head,
    '--s-body': fp.body,
    '--s-head-weight': fp.weight,
    fontFamily: fp.body,
    fontSize: b.fontPair === 'compact' ? 14 : 15,
  } as CSSProperties;
}
