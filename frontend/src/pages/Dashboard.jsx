import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const STATUS_BADGE = {
  pending:  'bg-amber-100 text-amber-700',
  review:   'bg-sky-100 text-sky-700',
  complete: 'bg-emerald-100 text-emerald-700',
  exported: 'bg-slate-200 text-slate-700'
};

export default function Dashboard({ user }) {
  const [apps, setApps] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState({ status: '', project_id: '', q: '' });
  const [selected, setSelected] = useState(new Set());
  const navigate = useNavigate();

  async function load() {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k,v]) => v && params.set(k, v));
    const list = await api('/api/applications?' + params);
    setApps(list);
    setSelected(new Set());
  }
  useEffect(() => { load(); }, [filter.status, filter.project_id]);
  useEffect(() => { api('/api/projects').then(setProjects); }, []);

  function toggle(id) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  async function newApp() {
    if (!projects.length) return alert('Create a project first (Admin → Projects)');
    const proj = projects.length === 1 ? projects[0] : projects.find(p => p.id === prompt(
      'Project for new application?\n\n' + projects.map((p,i) => `${i+1}. ${p.name}`).join('\n'),
      ''));
    if (!proj) return;
    const a = await api('/api/applications', { method: 'POST', body: { project_id: proj.id } });
    navigate('/applications/' + a.id);
  }

  async function exportSelected() {
    if (!selected.size) return alert('Select applications to export');
    const blob = await api('/api/applications/export', { method: 'POST', body: { ids: [...selected] }, asBlob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Farvision_export.xlsx'; a.click();
    URL.revokeObjectURL(url);
    load();
  }

  async function copyPublicLink(slug) {
    const url = `${location.origin}/apply/${slug}`;
    await navigator.clipboard.writeText(url);
    alert('Copied: ' + url);
  }

  const filtered = filter.q ? apps.filter(a => {
    const hay = [a.unit_number, a.mobile, a.email,
      ...(a.applicants||[]).flatMap(x => [x.first_name, x.last_name, x.pan, x.aadhar])
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(filter.q.toLowerCase());
  }) : apps;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Applications</h2>
          <p className="text-sm text-slate-500">{apps.length} total · {selected.size} selected</p>
        </div>
        <div className="flex gap-2">
          <input placeholder="Search..." value={filter.q} onChange={e=>setFilter({...filter, q: e.target.value})}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" />
          <select value={filter.status} onChange={e=>setFilter({...filter, status: e.target.value})}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="review">In Review</option>
            <option value="complete">Complete</option>
            <option value="exported">Exported</option>
          </select>
          <select value={filter.project_id} onChange={e=>setFilter({...filter, project_id: e.target.value})}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm">
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={exportSelected} disabled={!selected.size}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ Export {selected.size || ''}
          </button>
          <button onClick={newApp} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + New
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex items-center gap-3 text-sm">
          <span className="text-slate-600">Public application links:</span>
          {projects.filter(p => p.is_active).map(p => (
            <button key={p.id} onClick={() => copyPublicLink(p.slug)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-mono">
              📋 /apply/{p.slug}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Project / Unit</th>
              <th className="px-4 py-3">Primary Applicant</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan="8" className="p-12 text-center text-slate-400">No applications</td></tr>
            ) : filtered.map(a => {
              const p = (a.applicants || []).find(x => x.is_primary) || a.applicants?.[0] || {};
              const name = [p.salutation, p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/applications/' + a.id)}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.project?.name || '—'}</div>
                    <div className="text-xs text-slate-500">{a.unit_number || 'No unit'}</div>
                  </td>
                  <td className="px-4 py-3">{name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.mobile || ''}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500">{a.source}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_BADGE[a.status]||''}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-xs"><span className="text-indigo-600">Edit →</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
