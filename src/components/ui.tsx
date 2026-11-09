import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fileToDataURL } from '../lib/format';

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; pad?: boolean }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="card-head">
          <h3>{title}</h3>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {pad ? <div className="card-body">{children}</div> : children}
    </div>
  );
}

export function Stat({ value, label, delta, good }: { value: ReactNode; label: string; delta?: string; good?: boolean }) {
  return (
    <div className="card stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {delta !== undefined && <div className={`d ${good === undefined ? 'muted' : good ? 'up' : 'down'}`}>{delta} vs previous</div>}
    </div>
  );
}

export function Empty({ icon = '✦', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <h4>{title}</h4>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
  );
}

export function ToggleRow({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row between" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <div className="strong">{label}</div>
        {hint && <div className="small muted">{hint}</div>}
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

let toastSetter: ((m: string) => void) | null = null;
export function toast(msg: string) {
  toastSetter?.(msg);
}
export function ToastHost() {
  const [msg, setMsg] = useState('');
  const t = useRef<number>();
  useEffect(() => {
    toastSetter = (m) => {
      setMsg(m);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setMsg(''), 2400);
    };
    return () => {
      toastSetter = null;
    };
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

export function ImagePicker({ value, onChange, label = 'Image', size = 800 }: { value: string; onChange: (v: string) => void; label?: string; size?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <span>{label}</span>
      <div className="row">
        {value ? <img src={value} alt="" className="thumb" style={{ width: 64, height: 64 }} /> : <div className="thumb" style={{ width: 64, height: 64 }} />}
        <div className="stack grow" style={{ gap: 6 }}>
          <div className="row">
            <button type="button" className="btn sm" onClick={() => ref.current?.click()}>
              Upload
            </button>
            {value && (
              <button type="button" className="btn sm ghost" onClick={() => onChange('')}>
                Remove
              </button>
            )}
          </div>
          <input className="input" placeholder="…or paste an image URL" value={value.startsWith('data:') ? '' : value} onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await fileToDataURL(f, size));
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function confirmAction(msg: string) {
  return window.confirm(msg);
}
