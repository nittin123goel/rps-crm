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
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (active) setUser(null); return; }
      try { const me = await api('/api/users/me'); if (active) setUser(me); }
      catch { if (active) setUser(null); }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (user === undefined) return <div className="p-10 text-slate-500">Loading…</div>;

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/apply/:slug" element={<PublicApply />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

      {/* AUTHENTICATED */}
      <Route element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/applications/:id" element={<ApplicationEdit user={user} />} />
        <Route path="/admin/projects" element={user?.role === 'admin' ? <Projects /> : <Navigate to="/" />} />
        <Route path="/admin/users" element={user?.role === 'admin' ? <Users /> : <Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
