import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Projects() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);

  async function load() { setList(await api('/api/projects')); }
  useEffect(() => { load(); }, []);

  function open(p) {
    setEditing(p || { slug: '', name: '', rera_number: '', fiscal_year: '01-04-2025-31-03-2026', is_active: true });
  }

  async function save() {
    if (!editing.slug || !editing.name || !editing.rera_number) return alert('All fields required');
    if (editing.id) {
      await api('/api/projects/' + editing.id, { method: 'PATCH', body: editing });
    } else {
      await api('/api/projects', { method: 'POST', body: editing });
    }
    setEditing(null); load();
  }

  async function remove(p) {
    if (!confirm('Delete project "' + p.name + '"? Existing applications will be orphaned.')) return;
    await api('/api/projects/' + p.id, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Projects</h2>
        <button onClick={() => open(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New Project</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b text-xs text-left text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">RERA</th>
              <th className="px-4 py-3">Fiscal Year</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Public Link</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan="7" className="p-12 text-center text-slate-400">No projects yet — create one to start receiving applications.</td></tr>
            ) : list.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-3 text-xs">{p.rera_number}</td>
                <td className="px-4 py-3 text-xs">{p.fiscal_year}</td>
                <td className="px-4 py-3">{p.is_active ? '✓' : '✗'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/apply/${p.slug}`); alert('Copied'); }}
                    className="text-indigo-600 text-xs hover:underline">📋 Copy</button>
                </td>
                <td className="px-4 py-3 text-right text-xs space-x-3">
                  <button onClick={() => open(p)} className="text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => remove(p)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="font-semibold">{editing.id ? 'Edit Project' : 'New Project'}</h3>
            </div>
            <div className="p-5 space-y-3">
              <FormField label="Project Name *">
                <input value={editing.name} onChange={e=>setEditing({...editing, name: e.target.value})} className={inp} placeholder="e.g. 12th Avenue" />
              </FormField>
              <FormField label="Slug (URL identifier) *">
                <input value={editing.slug} onChange={e=>setEditing({...editing, slug: e.target.value.toLowerCase().replace(/\s+/g,'-')})} className={inp} placeholder="e.g. 12th-avenue" />
                <p className="text-xs text-slate-500 mt-1">Public link: <code>/apply/{editing.slug || '...'}</code></p>
              </FormField>
              <FormField label="RERA Number *">
                <input value={editing.rera_number} onChange={e=>setEditing({...editing, rera_number: e.target.value})} className={inp} />
              </FormField>
              <FormField label="Fiscal Year">
                <input value={editing.fiscal_year} onChange={e=>setEditing({...editing, fiscal_year: e.target.value})} className={inp} />
              </FormField>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={e=>setEditing({...editing, is_active: e.target.checked})} />
                Active (accepts public submissions)
              </label>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm">Cancel</button>
              <button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';
function FormField({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}
