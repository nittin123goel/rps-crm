import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const blankApplicant = (seq) => ({
  is_primary: seq === 1, display_seq: seq,
  salutation: 'Mr.', first_name: '', middle_name: '', last_name: '',
  dob: '', gender: '', relationship: 'S/o', relative_name: '',
  pan: '', aadhar: '',
  photo_path: null, aadhar_path: null, pan_path: null
});

export default function ApplicationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [tab, setTab] = useState('project');
  const [saving, setSaving] = useState(false);

  async function load() {
    const a = await api('/api/applications/' + id);
    if (!a.applicants?.length) a.applicants = [blankApplicant(1)];
    a.applicants.sort((x,y) => x.display_seq - y.display_seq);
    setApp(a);
  }
  useEffect(() => { load(); }, [id]);

  function set(field, value) { setApp(s => ({ ...s, [field]: value })); }
  function setApplicant(i, field, value) {
    setApp(s => {
      const ap = [...s.applicants];
      ap[i] = { ...ap[i], [field]: value };
      return { ...s, applicants: ap };
    });
  }
  function addApplicant() {
    if (app.applicants.length >= 3) return;
    setApp(s => ({ ...s, applicants: [...s.applicants, blankApplicant(s.applicants.length + 1)] }));
  }
  function removeApplicant(i) {
    setApp(s => ({ ...s, applicants: s.applicants.filter((_,idx) => idx !== i)
      .map((a,idx) => ({ ...a, is_primary: idx === 0, display_seq: idx + 1 })) }));
  }

  async function save() {
    setSaving(true);
    try {
      await api('/api/applications/' + id, { method: 'PATCH', body: app });
    } finally { setSaving(false); }
    await load();
    alert('Saved');
  }

  async function finalize() {
    if (!confirm('Mark this application as Complete? You can still edit and re-export later.')) return;
    await save();
    await api(`/api/applications/${id}/finalize`, { method: 'POST' });
    navigate('/');
  }

  async function exportThis() {
    await save();
    const blob = await api('/api/applications/export', { method: 'POST', body: { ids: [id] }, asBlob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Farvision_${app.unit_number || id.slice(0,8)}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadFile(kind, applicant_id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*,application/pdf';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      if (applicant_id) fd.append('applicant_id', applicant_id);
      await api(`/api/applications/${id}/upload`, { formData: fd, method: 'POST' });
      await load();
    };
    inp.click();
  }

  async function viewFile(path) {
    const { url } = await api('/api/applications/file/signed?path=' + encodeURIComponent(path));
    window.open(url, '_blank');
  }

  if (!app) return <div>Loading…</div>;
  const tabs = [['project','1. Project & Unit'],['applicants','2. Applicants'],['address','3. Address & Contact'],['payment','4. Payment']];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-900">← Back</button>
          <div>
            <h2 className="text-xl font-semibold">Application #{id.slice(0,8)}</h2>
            <p className="text-xs text-slate-500">
              {app.project?.name} · RERA {app.project?.rera_number} ·
              <span className="ml-1 px-2 py-0.5 rounded bg-slate-100 text-xs">{app.status}</span>
              <span className="ml-1 px-2 py-0.5 rounded bg-slate-100 text-xs">from {app.source}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg text-sm">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={finalize} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Mark Complete
          </button>
          <button onClick={exportThis} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ Export
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6 flex gap-6 text-sm">
        {tabs.map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2 ${tab===t ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'project' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4">
          <Field label="Unit Number *">
            <input value={app.unit_number || ''} onChange={e=>set('unit_number', e.target.value)} className={inp} placeholder="e.g. FF-09" />
          </Field>
          <Field label="Document Date">
            <input type="date" value={app.document_date || ''} onChange={e=>set('document_date', e.target.value)} className={inp} />
          </Field>
          <Field label="Entry Type">
            <input value={app.entry_type || ''} onChange={e=>set('entry_type', e.target.value)} className={inp} />
          </Field>
          <Field label="Broker Name"><input value={app.broker_name || ''} onChange={e=>set('broker_name', e.target.value)} className={inp} /></Field>
          <Field label="Remarks" full><textarea rows="2" value={app.remarks || ''} onChange={e=>set('remarks', e.target.value)} className={inp}></textarea></Field>
        </div>
      )}

      {tab === 'applicants' && (
        <div className="space-y-4">
          {app.applicants.map((a, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">{i === 0 ? '🟢 Primary Applicant' : `👥 Co-Applicant ${i}`}</h4>
                {i > 0 && <button onClick={() => removeApplicant(i)} className="text-red-500 text-sm">Remove</button>}
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Field label="Salutation">
                  <select value={a.salutation || 'Mr.'} onChange={e=>setApplicant(i,'salutation',e.target.value)} className={inp}>
                    <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>M/s</option><option>Dr.</option>
                  </select>
                </Field>
                <Field label="First Name *"><input value={a.first_name||''} onChange={e=>setApplicant(i,'first_name',e.target.value)} className={inp} /></Field>
                <Field label="Middle Name"><input value={a.middle_name||''} onChange={e=>setApplicant(i,'middle_name',e.target.value)} className={inp} /></Field>
                <Field label="Last Name"><input value={a.last_name||''} onChange={e=>setApplicant(i,'last_name',e.target.value)} className={inp} /></Field>
                <Field label="DOB"><input type="date" value={a.dob||''} onChange={e=>setApplicant(i,'dob',e.target.value)} className={inp} /></Field>
                <Field label="Gender">
                  <select value={a.gender||''} onChange={e=>setApplicant(i,'gender',e.target.value)} className={inp}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Relationship">
                  <select value={a.relationship||'S/o'} onChange={e=>setApplicant(i,'relationship',e.target.value)} className={inp}>
                    <option>S/o</option><option>D/o</option><option>W/o</option><option>H/o</option>
                  </select>
                </Field>
                <Field label="Father/Spouse"><input value={a.relative_name||''} onChange={e=>setApplicant(i,'relative_name',e.target.value)} className={inp} /></Field>
                <Field label="PAN"><input value={a.pan||''} onChange={e=>setApplicant(i,'pan',e.target.value.toUpperCase())} className={inp + ' uppercase'} /></Field>
                <Field label="Aadhaar" wide><input value={a.aadhar||''} onChange={e=>setApplicant(i,'aadhar',e.target.value)} className={inp} /></Field>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-slate-700 uppercase mb-2">Documents</div>
                <div className="grid grid-cols-3 gap-3">
                  {[['photo_path','Photograph','photo'],['aadhar_path','Aadhaar Card','aadhar'],['pan_path','PAN Card','pan']].map(([col,label,kind]) => (
                    <DocCell key={kind} label={label} path={a[col]} onUpload={() => uploadFile(kind, a.id)} onView={() => viewFile(a[col])} />
                  ))}
                </div>
              </div>
            </div>
          ))}
          {app.applicants.length < 3 && (
            <button onClick={addApplicant} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">+ Add Co-Applicant</button>
          )}
        </div>
      )}

      {tab === 'address' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4">
          <Field label="Address Line 1" full><input value={app.addr_line1||''} onChange={e=>set('addr_line1',e.target.value)} className={inp} /></Field>
          <Field label="Address Line 2"><input value={app.addr_line2||''} onChange={e=>set('addr_line2',e.target.value)} className={inp} /></Field>
          <Field label="Address Line 3"><input value={app.addr_line3||''} onChange={e=>set('addr_line3',e.target.value)} className={inp} /></Field>
          <Field label="City"><input value={app.city||''} onChange={e=>set('city',e.target.value)} className={inp} /></Field>
          <Field label="State"><input value={app.state||''} onChange={e=>set('state',e.target.value)} className={inp} /></Field>
          <Field label="Country"><input value={app.country||'India'} onChange={e=>set('country',e.target.value)} className={inp} /></Field>
          <Field label="Postal Code"><input value={app.postal_code||''} onChange={e=>set('postal_code',e.target.value)} className={inp} /></Field>
          <Field label="Mobile *"><input value={app.mobile||''} onChange={e=>set('mobile',e.target.value)} className={inp} /></Field>
          <Field label="Email"><input type="email" value={app.email||''} onChange={e=>set('email',e.target.value)} className={inp} /></Field>
          <Field label="Phone (Landline)"><input value={app.phone||''} onChange={e=>set('phone',e.target.value)} className={inp} /></Field>
        </div>
      )}

      {tab === 'payment' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4">
          <Field label="Booking Amount (₹)"><input type="number" value={app.payment_amount||''} onChange={e=>set('payment_amount',e.target.value)} className={inp} /></Field>
          <Field label="Payment Mode">
            <select value={app.payment_mode||''} onChange={e=>set('payment_mode',e.target.value)} className={inp}>
              <option value="">Select</option>
              <option>Cheque</option><option>RTGS/NEFT</option><option>UPI</option><option>Cash</option><option>Demand Draft</option>
            </select>
          </Field>
          <Field label="Cheque/Ref No."><input value={app.payment_ref||''} onChange={e=>set('payment_ref',e.target.value)} className={inp} /></Field>
          <Field label="Bank"><input value={app.payment_bank||''} onChange={e=>set('payment_bank',e.target.value)} className={inp} /></Field>
          <Field label="Payment Date"><input type="date" value={app.payment_date||''} onChange={e=>set('payment_date',e.target.value)} className={inp} /></Field>
          <Field label="Receipt No."><input value={app.receipt_no||''} onChange={e=>set('receipt_no',e.target.value)} className={inp} /></Field>
          <Field label="Receipt / Cheque Image" full>
            <DocCell label="Receipt" path={app.receipt_path} onUpload={() => uploadFile('receipt')} onView={() => viewFile(app.receipt_path)} />
          </Field>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';

function Field({ label, children, full, wide }) {
  return (
    <div className={full ? 'col-span-2' : wide ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function DocCell({ label, path, onUpload, onView }) {
  return (
    <div onClick={path ? onView : onUpload}
         className={`border-2 ${path ? 'border-emerald-400 bg-emerald-50' : 'border-dashed border-slate-300 bg-slate-50'} rounded-lg p-3 cursor-pointer hover:border-indigo-400 text-center`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      {path ? <>
        <div className="text-emerald-700 font-medium text-sm">📄 Uploaded</div>
        <div className="text-xs text-indigo-600 mt-1">Click to view</div>
        <button onClick={(e) => { e.stopPropagation(); onUpload(); }} className="text-xs text-slate-500 hover:underline mt-1">Replace</button>
      </> : <div className="text-slate-400 text-sm py-2">📎 Click to upload</div>}
    </div>
  );
}
