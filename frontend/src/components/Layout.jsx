import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Layout({ user }) {
  const navigate = useNavigate();
  async function logout() { await supabase.auth.signOut(); navigate('/login'); }
  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm rounded-md ${isActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:text-slate-900'}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">F</div>
              <span className="font-semibold text-slate-900">Farvision CRM</span>
            </Link>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>Applications</NavLink>
              {user.role === 'admin' && <>
                <NavLink to="/admin/projects" className={linkClass}>Projects</NavLink>
                <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
              </>}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="text-slate-700 font-medium">{user.full_name || user.email}</div>
              <div className="text-xs text-slate-500 uppercase">{user.role}</div>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-slate-900 text-sm">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6"><Outlet /></main>
    </div>
  );
}
