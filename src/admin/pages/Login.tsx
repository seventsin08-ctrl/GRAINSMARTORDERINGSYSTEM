import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, useDB } from '../../store/db';

export default function Login() {
  const b = useDB((d) => d.branding);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px clamp(20px, 6vw, 120px)' }}>
      <div className="console-head">
        <div>
          <div className="eyebrow">{b.storeName} · Admin console</div>
          <h1>Welcome to the admin system</h1>
        </div>
        <Link to="/" className="round-x" aria-label="Back to shop">✕</Link>
      </div>
      <div className="grid g2" style={{ alignItems: 'center', gap: 48, marginTop: 40 }}>
        <div>
          <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow)', background: '#f3efe4', marginBottom: 28 }}>
            {b.logo && <img src={b.adminLogo || b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div className="eyebrow">Private · Authorized access</div>
          <h2 className="h-serif" style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
            Welcome to the {b.storeName.charAt(0) + b.storeName.slice(1).toLowerCase()} admin system.
          </h2>
          <p className="muted" style={{ fontSize: 17, maxWidth: 420 }}>This is a private website for the shop owner, admins, and approved staff.</p>
          <div className="row" style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 16px', borderRadius: 14, marginTop: 12 }}>
            <span className="badge green">✦</span>
            <span className="small muted">Your workspace is available only to authorized team members.</span>
          </div>
        </div>
        <form
          className="card"
          style={{ padding: 36, boxShadow: 'var(--shadow)' }}
          onSubmit={(e) => {
            e.preventDefault();
            const u = login(username, password, keep);
            if (u) nav(from, { replace: true });
            else setErr('That username and password don’t match an active account.');
          }}
        >
          <p className="muted" style={{ marginTop: 0 }}>Sign in to manage today’s orders and shop settings. Staff and Admin sign-ins require approval from an Owner/Superadmin.</p>
          <div className="stack">
            <label className="field"><span style={{ color: 'var(--accent)' }}>Username</span><input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></label>
            <label className="field"><span style={{ color: 'var(--accent)' }}>Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <label className="chk small"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Keep me signed in on this device for 30 days</label>
            {err && <div className="small" style={{ color: 'var(--red)' }}>{err}</div>}
            <button className="btn primary lg" style={{ borderRadius: 14 }}>Sign in</button>
            <p className="small faint" style={{ margin: 0, textAlign: 'center' }}>Demo: admin / admin123 · staff1 / staff123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
