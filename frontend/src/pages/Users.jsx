import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState('users');
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({ email: '', full_name: '', role: 'user', password: '' });
  const [tempCreds, setTempCreds] = useState(null);

  async function load() {
    setUsers(await api('/api/users'));
    setAudit(await api('/api/users/audit/log'));
  }
  useEffect(() => { load(); }, []);

  async function submitInvite() {
    if (!invite.email) return alert('Email required');
    try {
      const result = await api('/api/users/invite', { method: 'POST', body: invite });
      setTempCreds(result);
      setInviting(false);
      setInvite({ email: '', full_name: '', role: 'user', password: '' });
      load();
    } catch (e) { alert('Failed: ' + e.message); }
  }

  async function setRole(u, role) {
    if (!confirm(`Change ${u.email} to ${role}?`)) return;
    await api('/api/users/' + u.id, { method: 'PATCH', body: { role } });
    load();
  }
  async function toggleActive(u) {
    await api('/api/users/' + u.id, { method: 'PATCH', body: { is_active: !u.is_active } });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 border-b border-slate-200">
          <button onClick={() => setTab('users')} className={`py-2 px-1 ${tab==='users' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500'}`}>Users</button>
          <button onClick={() => setTab('audit')} className={`py-2 px-1 ${tab==='audit' ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500'}`}>Audit Log</button>
        </div>
        {tab === 'users' && <button onClick={() => setInviting(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Invite User</button>}
      </div>

      {tab === 'users' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-xs text-left text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3">{u.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.role==='admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'active' : 'disabled'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-xs space-x-2">
                    {u.role === 'user' ? <button onClick={() => setRole(u, 'admin')} className="text-indigo-600 hover:underline">Make Admin</button>
                      : <button onClick={() => setRole(u, 'user')} className="text-slate-600 hover:underline">Make User</button>}
                    <button onClick={() => toggleActive(u)} className="text-red-500 hover:underline">{u.is_active ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-xs text-left text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{a.actor_email || <span className="text-slate-400">public</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-3 text-xs">{a.entity}{a.entity_id ? ' #' + a.entity_id.slice(0,8) : ''}</td>
                  <td className="px-4 py-3 text-xs text-slate-500"><pre className="text-xs">{JSON.stringify(a.detail)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inviting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b"><h3 className="font-semibold">Invite User</h3></div>
            <div className="p-5 space-y-3">
              <Field label="Email *"><input value={invite.email} onChange={e=>setInvite({...invite, email: e.target.value})} className={inp} /></Field>
              <Field label="Full Name"><input value={invite.full_name} onChange={e=>setInvite({...invite, full_name: e.target.value})} className={inp} /></Field>
              <Field label="Role">
                <select value={invite.role} onChange={e=>setInvite({...invite, role: e.target.value})} className={inp}>
                  <option value="user">User (operator)</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Initial Password (leave blank to auto-generate)">
                <input value={invite.password} onChange={e=>setInvite({...invite, password: e.target.value})} className={inp} />
              </Field>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setInviting(false)} className="px-4 py-2 text-sm">Cancel</button>
              <button onClick={submitInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Invite</button>
            </div>
          </div>
        </div>
      )}

      {tempCreds && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-semibold mb-3">User created</h3>
            <p className="text-sm mb-3">Send these credentials to the user (they'll change password on first login):</p>
            <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
              <div>Email: {tempCreds.email}</div>
              <div>Password: <span className="bg-yellow-100 px-1">{tempCreds.temp_password}</span></div>
            </div>
            <button onClick={() => setTempCreds(null)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}
