import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDB, useDB } from '../../store/db';

export default function Login() {
  const b = useDB((d) => d.branding);
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/admin';

  const tryPin = (p: string) => {
    const db = getDB();
    const ok = p === db.settings.adminPin || db.staff.some((s) => s.active && s.pin === p && (s.role === 'owner' || s.role === 'manager' || s.role === 'cashier' || s.role === 'kitchen'));
    if (ok) {
      sessionStorage.setItem('gs.admin', '1');
      nav(from, { replace: true });
    } else {
      setBad(true);
      setTimeout(() => { setBad(false); setPin(''); }, 450);
    }
  };

  const press = (k: string) => {
    if (bad) return;
    const next = k === '⌫' ? pin.slice(0, -1) : (pin + k).slice(0, 8);
    setPin(next);
    if (next.length >= 4 && next.length === getDB().settings.adminPin.length) tryPin(next);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter' && pin.length >= 4) tryPin(pin);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const len = Math.max(4, getDB().settings.adminPin.length);
  return (
    <div className="login">
      <div style={{ textAlign: 'center' }}>
        <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px', fontSize: 30 }}>{b.logo ? <img src={b.logo} alt="" /> : '🌾'}</div>
        <h1 style={{ fontSize: 28 }}>{b.storeName}</h1>
        <p className="muted">Enter your PIN to open the dashboard</p>
        <div className={`pin-dots ${bad ? 'shake' : ''}`}>
          {Array.from({ length: len }, (_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k ? <button key={i} onClick={() => press(k)}>{k}</button> : <span key={i} />,
          )}
        </div>
        {pin.length >= 4 && pin.length !== getDB().settings.adminPin.length && (
          <button className="btn primary" style={{ marginTop: 20 }} onClick={() => tryPin(pin)}>Sign in</button>
        )}
        <p className="small faint" style={{ marginTop: 28 }}>Demo PIN: 1234</p>
        <a href="/kiosk" className="small">Go to kiosk →</a>
      </div>
    </div>
  );
}
