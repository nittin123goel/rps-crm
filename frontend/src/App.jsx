import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import { api } from './lib/api.js';
import PublicApply from './pages/PublicApply.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ApplicationEdit from './pages/ApplicationEdit.jsx';
import Projects from './pages/Projects.jsx';
import Users from './pages/Users.jsx';
import Layout from './components/Layout.jsx';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let active = true;
    let timer = setTimeout(() => { if (active) { console.warn('Auth check timed out'); setUser(null); } }, 8000);

    async function load() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) { clearTimeout(timer); if (active) setUser(null); return; }
        const me = await api('/api/users/me');
        clearTimeout(timer);
        if (active) setUser(me);
      } catch (e) {
        console.error('Auth load failed:', e.message);
        clearTimeout(timer);
        try { await supabase.auth.signOut(); } catch {}
        if (active) setUser(null);
      }
    }
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUser(null); return; }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') load();
    });
    return () => { active = false; clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500">
        <div className="text-sm">Loading…</div>
        <div className="text-xs text-slate-400 mt-2">If this persists for 10+ seconds, the backend may be waking up.</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/apply/:slug" element={<PublicApply />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/applications/:id" element={<ApplicationEdit user={user} />} />
        <Route path="/admin/projects" element={user?.role === 'admin' ? <Projects /> : <Navigate to="/" />} />
        <Route path="/admin/users" element={user?.role === 'admin' ? <Users /> : <Navigate to="/" />} />
      </Route>
    </Routes>
  );
}