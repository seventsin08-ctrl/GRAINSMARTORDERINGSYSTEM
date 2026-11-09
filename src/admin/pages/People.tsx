import { useState } from 'react';
import { can, currentUser, uid, update, useDB, useUser } from '../../store/db';
import type { Perm, Staff, StaffRole } from '../../store/types';
import { ALL_PERMS } from '../../store/seed';
import { Empty, Field, PageHead, confirmAction, toast } from '../../components/ui';
import { fmtDate, fmtDateTime, today } from '../../lib/format';
import { applyAdminTheme, roleLabel } from '../AdminLayout';

export function StaffPage() {
  const db = useDB((d) => d);
  const me = useUser();
  const blank = (): Staff => ({ id: uid('st'), name: '', username: '', password: '', role: 'staff', perms: ['orders', 'payment', 'cash_remits'], pin: '', branchId: db.settings.activeBranchId, active: true });
  const [f, setF] = useState<Staff>(blank);
  const editing = db.staff.some((s) => s.id === f.id);
  const isOwner = me?.role === 'owner';
  const canEdit = isOwner || me?.role === 'admin';

  const save = () => {
    const username = f.username.trim().toLowerCase();
    if (!username) return toast('Enter a username');
    if (!editing && f.password.length < 6) return toast('Temporary password needs at least 6 characters');
    if (db.staff.some((s) => s.username.toLowerCase() === username && s.id !== f.id)) return toast('That username is taken');
    if (f.role === 'owner' && !isOwner) return toast('Only an Owner/Superadmin can create owners');
    update((d) => {
      const i = d.staff.findIndex((s) => s.id === f.id);
      const prev = i >= 0 ? d.staff[i] : null;
      const next = { ...f, username, name: f.name.trim() || username, password: f.password || prev?.password || '' };
      if (i >= 0) d.staff[i] = next;
      else d.staff.push(next);
    });
    toast(editing ? 'Account updated' : 'Account created');
    setF(blank());
  };

  return (
    <>
      <PageHead title="Staff & admin accounts" sub="Owner/Superadmin accounts manage access and approve sign-ins. Admin accounts have full store controls. Staff access is selected below." />
      <div className="card pad" style={{ marginBottom: 24 }}>
        {db.staff.map((s) => (
          <div key={s.id} className="row between" style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="h-serif" style={{ fontSize: 18 }}>{s.name}</div>
              <div className="small muted">{roleLabel(s.role)} · {s.active ? 'Active' : 'Disabled'} · @{s.username} {s.role === 'staff' && `· ${s.perms.join(', ')}`}</div>
            </div>
            {canEdit && s.id !== me?.id && (s.role !== 'owner' || isOwner) && (
              <div className="row">
                <button className="btn sm outline" onClick={() => setF({ ...s, password: '' })}>Edit</button>
                <button className="btn sm outline" onClick={() => update((d) => { const x = d.staff.find((y) => y.id === s.id)!; x.active = !x.active; })}>{s.active ? 'Disable' : 'Enable'}</button>
                {isOwner && <button className="btn sm ghost" onClick={() => confirmAction(`Delete ${s.name}'s account?`) && update((d) => { d.staff = d.staff.filter((y) => y.id !== s.id); })}>✕</button>}
              </div>
            )}
            {s.id === me?.id && <span className="badge green">You</span>}
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ maxWidth: 720 }}>
          <h2 className="h-serif" style={{ fontSize: 26, marginBottom: 14 }}>{editing ? `Edit ${f.name}` : 'Create an account'}</h2>
          <div className="stack">
            <Field label="Display name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Jessica" /></Field>
            <Field label="Username"><input className="input" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, '') })} autoComplete="off" /></Field>
            <Field label={editing ? 'New password (leave blank to keep)' : 'Temporary password'}><input className="input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
            <Field label="Account category">
              <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                {isOwner && <option value="owner">Owner/Superadmin</option>}
              </select>
            </Field>
            {f.role === 'staff' ? (
              <div className="grid g2" style={{ gap: 10 }}>
                {ALL_PERMS.map((p) => (
                  <label key={p.id} className="chk small">
                    <input type="checkbox" checked={f.perms.includes(p.id)} onChange={(e) => setF({ ...f, perms: e.target.checked ? [...f.perms, p.id] : f.perms.filter((x: Perm) => x !== p.id) })} />
                    {p.label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>{f.role === 'admin' ? 'Admins have full store controls.' : 'Owners can do everything, including managing other admins.'}</p>
            )}
            <div className="row">
              <button className="btn primary lg" onClick={save}>Save account</button>
              {editing && <button className="btn lg" onClick={() => setF(blank())}>Cancel</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Attendance() {
  const db = useDB((d) => d);
  const u = useUser();
  const mine = db.shifts.find((s) => s.staffId === u?.id && !s.clockOut);
  const team = can(u, 'attendance_team');
  const list = db.shifts.filter((s) => team || s.staffId === u?.id).sort((a, b) => b.clockIn - a.clockIn);
  const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? '—';
  const hrs = (a: number, b?: number) => (((b ?? Date.now()) - a) / 3600000).toFixed(2);
  return (
    <>
      <PageHead title="Staff attendance" sub={`Record your shift start and finish. Times are shown in ${db.settings.timezone}.`} />
      <div className="card pad row between" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">Your shift</div>
          <div className="strong" style={{ fontSize: 20 }}>{mine ? `Clocked in since ${new Date(mine.clockIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${hrs(mine.clockIn)} hrs` : 'No active shift'}</div>
        </div>
        {mine ? (
          <button className="btn solid-red lg" onClick={() => { update((d) => { d.shifts.find((s) => s.id === mine.id)!.clockOut = Date.now(); }); toast('Clocked out'); }}>Clock out</button>
        ) : (
          <button className="btn primary lg" onClick={() => { update((d) => { d.shifts.push({ id: uid('sh'), staffId: currentUser()!.id, clockIn: Date.now() }); }); toast('Clocked in'); }}>Clock in</button>
        )}
      </div>
      <div className="card">
        <div className="card-head"><h3>{team ? 'Team attendance' : 'Your attendance'}</h3><span className="small muted">{list.length} recent shifts</span></div>
        <table className="table">
          <thead><tr><th>Staff member</th><th>Clock in</th><th>Clock out</th><th>Duration</th></tr></thead>
          <tbody>{list.slice(0, 100).map((s) => <tr key={s.id}><td>{name(s.staffId)}</td><td>{fmtDateTime(s.clockIn)}</td><td>{s.clockOut ? fmtDateTime(s.clockOut) : <span className="badge green">On shift</span>}</td><td>{hrs(s.clockIn, s.clockOut)} hrs</td></tr>)}</tbody>
        </table>
        {!list.length && <Empty icon="◷" title="No shifts recorded yet" />}
      </div>
    </>
  );
}

export function Schedule() {
  const db = useDB((d) => d);
  const u = useUser();
  const team = can(u, 'schedule_team');
  const [f, setF] = useState({ staffId: '', date: today(), start: '09:00', end: '17:00', note: '' });
  const list = db.planned.filter((p) => (team || p.staffId === u?.id) && p.date >= today()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const name = (id: string) => db.staff.find((s) => s.id === id)?.name ?? '—';
  return (
    <>
      <PageHead title="Staff schedule" sub={`Planned shifts are separate from actual attendance. All times use ${db.settings.timezone}.`} />
      {team && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <div className="grid g2">
            <Field label="Staff member"><select className="input" value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })}><option value="">Select staff</option>{db.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Date"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Start"><input className="input" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="End"><input className="input" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
            <Field label="Note"><input className="input" placeholder="Optional shift note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
            <button className="btn primary lg" style={{ alignSelf: 'end', height: 48 }} disabled={!f.staffId || f.end <= f.start} onClick={() => { update((d) => { d.planned.push({ id: uid('pl'), ...f }); }); toast('Shift assigned'); setF({ ...f, note: '' }); }}>Assign shift</button>
          </div>
        </div>
      )}
      {list.length ? (
        <div className="card">
          <table className="table">
            <thead><tr><th>Date</th><th>Staff</th><th>Time</th><th>Note</th>{team && <th />}</tr></thead>
            <tbody>{list.map((p) => <tr key={p.id}><td>{fmtDate(new Date(p.date + 'T00:00:00').getTime())}</td><td>{name(p.staffId)}</td><td>{p.start} – {p.end}</td><td className="muted">{p.note}</td>{team && <td className="right"><button className="btn sm ghost" onClick={() => update((d) => { d.planned = d.planned.filter((x) => x.id !== p.id); })}>✕</button></td>}</tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="card pad" style={{ background: 'var(--surface-2)', textAlign: 'center' }}><span className="small muted">No planned shifts in this view.</span></div>
      )}
    </>
  );
}

export function Appearance() {
  const u = useUser();
  const key = `gs.theme.${u?.id ?? 'anon'}`;
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(key) ?? 'light';
    } catch {
      return 'light';
    }
  });
  const pick = (m: string) => {
    setMode(m);
    try {
      localStorage.setItem(key, m);
    } catch {
      /* ignore */
    }
    applyAdminTheme();
  };
  return (
    <>
      <PageHead title="Appearance" sub="Choose a comfortable look for your admin workspace on this device." />
      <div className="card pad" style={{ maxWidth: 640 }}>
        <b style={{ fontSize: 17 }}>Color mode</b>
        <p className="muted" style={{ marginTop: 4 }}>Only the private admin system changes. Customer storefront colors stay the same.</p>
        <div className="row">
          <button className={`btn lg ${mode === 'light' ? 'primary' : 'outline'}`} style={{ borderRadius: 12 }} onClick={() => pick('light')}>✺ Light</button>
          <button className={`btn lg ${mode === 'dark' ? 'primary' : 'outline'}`} style={{ borderRadius: 12 }} onClick={() => pick('dark')}>☾ Dark</button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Your choice is saved separately for each signed-in account on this device.</p>
      </div>
    </>
  );
}
