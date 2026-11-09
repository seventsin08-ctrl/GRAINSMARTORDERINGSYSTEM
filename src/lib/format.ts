import { getDB } from '../store/db';

export function money(n: number): string {
  const c = getDB().settings.currency;
  return `${n < 0 ? '-' : ''}${c}${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function moneyShort(n: number): string {
  const c = getDB().settings.currency;
  return `${c}${Math.round(n).toLocaleString('en-PH')}`;
}

export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (t: number) => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
export const fmtDateTime = (t: number) => `${fmtDate(t)} · ${fmtTime(t)}`;
export const today = () => new Date().toISOString().slice(0, 10);

export function rangeStart(range: string): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const days = range === 'today' ? 0 : range === '7d' ? 6 : range === '30d' ? 29 : 89;
  return d.getTime() - days * 86400000;
}

export function rangeDays(range: string): number {
  return range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
}

export function pctChange(cur: number, prev: number): string {
  if (prev === 0) return cur === 0 ? '0%' : '+100%';
  const p = Math.round(((cur - prev) / prev) * 100);
  return `${p > 0 ? '+' : ''}${p}%`;
}

export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function fileToDataURL(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const src = reader.result as string;
      if (file.type === 'image/svg+xml') return resolve(src);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/webp', 0.85));
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
