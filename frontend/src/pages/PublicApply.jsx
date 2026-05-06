import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../lib/api.js';

export default function PublicApply() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    unit_number: '', mobile: '', email: '', phone: '',
    addr_line1: '', addr_line2: '', addr_line3: '', city: '', state: '', country: 'India', postal_code: '',
    remarks: '',
    applicants: [emptyApplicant()]
  });
  const [files, setFiles] = useState({}); // { 'a1_photo': File, ... }

  useEffect(() => {
    publicApi('/api/public/projects/' + slug)
      .then(setProject)
      .catch(e => setError(e.message));
  }, [slug]);

  function setApplicant(i, field, value) {
    setForm(s => {
      const ap = [...s.applicants];
      ap[i] = { ...ap[i], [field]: value };
      return { ...s, applicants: ap };
    });
  }
  function addApplicant() {
    if (form.applicants.length >= 3) return;
    setForm(s => ({ ...s, applicants: [...s.applicants, emptyApplicant()] }));
  }
  function removeApplicant(i) {
    setForm(s => ({ ...s, applicants: s.applicants.filter((_,idx) => idx !== i) }));
    // also clear files for that applicant
    const seq = i + 1;
    const newFiles = { ...files };
    ['photo','aadhar','pan'].forEach(k => delete newFiles[`a${seq}_${k}`]);
    setFiles(newFiles);
  }
  function setFile(seq, kind, file) {
    setFiles(s => ({ ...s, [`a${seq}_${kind}`]: file }));
  }

  async function submit() {
    setError('');
    if (!form.applicants[0].first_name) { setError('First name is required'); return; }
    if (!form.mobile) { setError('Mobile number is required'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('payload', JSON.stringify({ project_slug: slug, ...form }));
      Object.entries(files).forEach(([k, f]) => fd.append(k, f));
      await publicApi('/api/public/applications', { method: 'POST', formData: fd });
      setSubmitted(true);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (error && !project) return <Centered>Project not found or inactive.<br /><span className="text-sm text-slate-500">{error}</span></Centered>;
  if (!project) return <Centered>Loading…</Centered>;

  if (submitted) return (
    <Centered>
      <div className="text-emerald-600 text-5xl mb-3">✓</div>
      <h2 className="text-2xl font-semibold mb-2">Thank you!</h2>
      <p className="text-slate-600">Your application for <b>{project.name}</b> has been received.</p>
      <p className="text-slate-500 text-sm mt-2">Our team will review and reach out shortly.</p>
    </Centered>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500">RERA: {project.rera_number}</p>
          <p className="text-slate-700 mt-2">Application Form — please fill in your details and upload your KYC documents.</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Unit & basic */}
        <Card title="Property Interest">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preferred Unit Number">
              <input value={form.unit_number} onChange={e=>setForm({...form, unit_number: e.target.value})} className={inp} placeholder="e.g. FF-09 (optional)" />
            </Field>
            <Field label="Notes">
              <input value={form.remarks} onChange={e=>setForm({...form, remarks: e.target.value})} className={inp} />
            </Field>
          </div>
        </Card>

        {/* Applicants */}
        {form.applicants.map((a, i) => (
          <Card key={i} title={i === 0 ? 'Primary Applicant' : `Co-Applicant ${i}`}
            action={i > 0 && <button onClick={() => removeApplicant(i)} className="text-red-500 text-sm">Remove</button>}>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Salutation">
                <select value={a.salutation} onChange={e=>setApplicant(i,'salutation',e.target.value)} className={inp}>
                  <option>Mr.</option><option>Ms.</option><option>Mrs.</option><option>Dr.</option>
                </select>
              </Field>
              <Field label="First Name *"><input value={a.first_name} onChange={e=>setApplicant(i,'first_name',e.target.value)} className={inp} /></Field>
              <Field label="Middle Name"><input value={a.middle_name} onChange={e=>setApplicant(i,'middle_name',e.target.value)} className={inp} /></Field>
              <Field label="Last Name"><input value={a.last_name} onChange={e=>setApplicant(i,'last_name',e.target.value)} className={inp} /></Field>
              <Field label="DOB"><input type="date" value={a.dob} onChange={e=>setApplicant(i,'dob',e.target.value)} className={inp} /></Field>
              <Field label="Gender">
                <select value={a.gender} onChange={e=>setApplicant(i,'gender',e.target.value)} className={inp}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Relationship">
                <select value={a.relationship} onChange={e=>setApplicant(i,'relationship',e.target.value)} className={inp}>
                  <option>S/o</option><option>D/o</option><option>W/o</option><option>H/o</option>
                </select>
              </Field>
              <Field label="Father/Spouse Name"><input value={a.relative_name} onChange={e=>setApplicant(i,'relative_name',e.target.value)} className={inp} /></Field>
              <Field label="PAN" wide><input value={a.pan} onChange={e=>setApplicant(i,'pan',e.target.value.toUpperCase())} className={inp + ' uppercase'} placeholder="ABCDE1234F" /></Field>
              <Field label="Aadhaar" wide><input value={a.aadhar} onChange={e=>setApplicant(i,'aadhar',e.target.value)} className={inp} placeholder="XXXX XXXX XXXX" /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {['photo','aadhar','pan'].map(kind => (
                <FileInput key={kind} label={kind === 'pan' ? 'PAN Card' : kind === 'aadhar' ? 'Aadhaar Card' : 'Photograph'}
                  file={files[`a${i+1}_${kind}`]} onChange={(f) => setFile(i+1, kind, f)} />
              ))}
            </div>
          </Card>
        ))}
        {form.applicants.length < 3 && (
          <button onClick={addApplicant} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">+ Add Co-Applicant</button>
        )}

        <Card title="Address & Contact">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Address Line 1 *" full><input value={form.addr_line1} onChange={e=>setForm({...form, addr_line1: e.target.value})} className={inp} /></Field>
            <Field label="Address Line 2"><input value={form.addr_line2} onChange={e=>setForm({...form, addr_line2: e.target.value})} className={inp} /></Field>
            <Field label="Address Line 3"><input value={form.addr_line3} onChange={e=>setForm({...form, addr_line3: e.target.value})} className={inp} /></Field>
            <Field label="City"><input value={form.city} onChange={e=>setForm({...form, city: e.target.value})} className={inp} /></Field>
            <Field label="State"><input value={form.state} onChange={e=>setForm({...form, state: e.target.value})} className={inp} /></Field>
            <Field label="Postal Code"><input value={form.postal_code} onChange={e=>setForm({...form, postal_code: e.target.value})} className={inp} /></Field>
            <Field label="Country"><input value={form.country} onChange={e=>setForm({...form, country: e.target.value})} className={inp} /></Field>
            <Field label="Mobile *"><input value={form.mobile} onChange={e=>setForm({...form, mobile: e.target.value})} className={inp} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className={inp} /></Field>
            <Field label="Phone (Landline)"><input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className={inp} /></Field>
          </div>
        </Card>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <button onClick={submit} disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium">
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}

function emptyApplicant() {
  return { salutation: 'Mr.', first_name: '', middle_name: '', last_name: '',
    dob: '', gender: '', relationship: 'S/o', relative_name: '', pan: '', aadhar: '' };
}

const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm';

function Centered({ children }) {
  return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-slate-700">{children}</div>;
}
function Card({ title, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children, full, wide }) {
  return (
    <div className={full ? 'col-span-2' : wide ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
function FileInput({ label, file, onChange }) {
  return (
    <label className={`border-2 border-dashed ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50'} rounded-lg p-3 text-center cursor-pointer hover:border-indigo-400 block`}>
      <div className="text-xs font-medium text-slate-700 mb-1">{label}</div>
      <div className="text-xs text-slate-500 truncate">{file ? '✓ ' + file.name : '📎 Choose file'}</div>
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => onChange(e.target.files[0])} />
    </label>
  );
}
