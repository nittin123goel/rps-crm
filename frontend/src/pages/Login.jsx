import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
          <div>
            <h1 className="font-semibold text-slate-900">Farvision CRM</h1>
            <p className="text-xs text-slate-500">Operator & admin sign-in</p>
          </div>
        </div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
        <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4" />
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-500 mt-4">Customer link is at <code>/apply/[project-slug]</code> — no login needed.</p>
      </form>
    </div>
  );
}
