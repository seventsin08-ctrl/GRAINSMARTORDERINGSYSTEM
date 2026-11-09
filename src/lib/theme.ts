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
