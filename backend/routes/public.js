import { Router } from 'express';
import multer from 'multer';
import { supaAdmin, BUCKET } from '../lib/supabase.js';
import { audit } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/public/projects/:slug — fetch project info for the public form
router.get('/projects/:slug', async (req, res) => {
  const { data, error } = await supaAdmin
    .from('projects')
    .select('id, slug, name, rera_number')
    .eq('slug', req.params.slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Project not found' });
  res.json(data);
});

// POST /api/public/applications — customer submits a new application.
// multipart/form-data with: payload (JSON string), and files: a1_photo, a1_aadhar, a1_pan, a2_*, a3_*
router.post('/applications', upload.any(), async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload || '{}');
    const { project_slug, applicants = [], ...rest } = payload;

    if (!project_slug) return res.status(400).json({ error: 'project_slug required' });
    if (!applicants.length) return res.status(400).json({ error: 'At least one applicant required' });

    const { data: project } = await supaAdmin.from('projects')
      .select('id, slug').eq('slug', project_slug).eq('is_active', true).maybeSingle();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Insert application as 'pending' from customer source
    const { data: app, error: appErr } = await supaAdmin.from('applications').insert({
      project_id: project.id,
      unit_number: rest.unit_number || null,
      document_date: rest.document_date || new Date().toISOString().slice(0,10),
      mobile: rest.mobile, email: rest.email, phone: rest.phone,
      addr_line1: rest.addr_line1, addr_line2: rest.addr_line2, addr_line3: rest.addr_line3,
      city: rest.city, state: rest.state, country: rest.country || 'India', postal_code: rest.postal_code,
      remarks: rest.remarks,
      status: 'pending',
      source: 'customer'
    }).select('id').single();
    if (appErr) throw appErr;

    // Insert applicants and upload their files
    const files = req.files || [];
    for (let i = 0; i < applicants.length; i++) {
      const a = applicants[i];
      const seq = i + 1;
      // Upload files for this applicant
      const paths = {};
      for (const docType of ['photo','aadhar','pan']) {
        const file = files.find(f => f.fieldname === `a${seq}_${docType}`);
        if (file) {
          const key = `${app.id}/applicant_${seq}_${docType}_${Date.now()}_${file.originalname}`;
          const { error: upErr } = await supaAdmin.storage.from(BUCKET)
            .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });
          if (upErr) throw upErr;
          paths[`${docType}_path`] = key;
        }
      }
      const { error: aErr } = await supaAdmin.from('applicants').insert({
        application_id: app.id,
        is_primary: i === 0,
        display_seq: seq,
        salutation: a.salutation,
        first_name: a.first_name,
        middle_name: a.middle_name,
        last_name: a.last_name,
        dob: a.dob || null,
        gender: a.gender,
        relationship: a.relationship,
        relative_name: a.relative_name,
        pan: a.pan,
        aadhar: a.aadhar,
        ...paths
      });
      if (aErr) throw aErr;
    }

    await audit(null, 'public.submit', 'application', app.id, { project_slug });
    res.json({ ok: true, id: app.id, message: 'Application submitted. Our team will be in touch.' });
  } catch (e) {
    console.error('public submit failed', e);
    res.status(500).json({ error: e.message || 'Submission failed' });
  }
});

export default router;
