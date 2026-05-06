import { Router } from 'express';
import multer from 'multer';
import { supaAdmin, BUCKET } from '../lib/supabase.js';
import { requireAuth, audit } from '../middleware/auth.js';
import { buildFarvisionXlsx } from '../lib/farvision.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

// GET /api/applications — list (with primary applicant joined)
router.get('/', async (req, res) => {
  const { status, project_id, q } = req.query;
  let query = supaAdmin.from('applications')
    .select('*, project:projects(name, slug, rera_number), applicants(*)')
    .order('updated_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (project_id) query = query.eq('project_id', project_id);
  const { data, error } = await query.limit(500);
  if (error) return res.status(500).json({ error: error.message });
  let result = data || [];
  if (q) {
    const needle = q.toLowerCase();
    result = result.filter(a => {
      const hay = [a.unit_number, a.mobile, a.email,
        ...(a.applicants||[]).flatMap(x => [x.first_name, x.last_name, x.pan, x.aadhar])
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(needle);
    });
  }
  res.json(result);
});

// GET /api/applications/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supaAdmin.from('applications')
    .select('*, project:projects(*), applicants(*), documents(*)')
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/applications — operator creates blank app for a project
router.post('/', async (req, res) => {
  const { project_id } = req.body;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  const { data, error } = await supaAdmin.from('applications').insert({
    project_id, source: 'operator', status: 'pending', created_by: req.user.id
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  // Seed primary applicant
  await supaAdmin.from('applicants').insert({
    application_id: data.id, is_primary: true, display_seq: 1, salutation: 'Mr.'
  });
  await audit(req.user, 'create', 'application', data.id, {});
  res.json(data);
});

// PATCH /api/applications/:id — update fields
router.patch('/:id', async (req, res) => {
  const { applicants, ...fields } = req.body;
  const { error } = await supaAdmin.from('applications').update(fields).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  // Replace applicants if provided
  if (Array.isArray(applicants)) {
    await supaAdmin.from('applicants').delete().eq('application_id', req.params.id);
    const rows = applicants.map((a, i) => ({
      application_id: req.params.id,
      is_primary: i === 0,
      display_seq: i + 1,
      salutation: a.salutation, first_name: a.first_name, middle_name: a.middle_name, last_name: a.last_name,
      dob: a.dob || null, gender: a.gender, relationship: a.relationship, relative_name: a.relative_name,
      pan: a.pan, aadhar: a.aadhar,
      photo_path: a.photo_path, aadhar_path: a.aadhar_path, pan_path: a.pan_path
    }));
    if (rows.length) {
      const { error: aErr } = await supaAdmin.from('applicants').insert(rows);
      if (aErr) return res.status(500).json({ error: aErr.message });
    }
  }
  await audit(req.user, 'update', 'application', req.params.id, {});
  res.json({ ok: true });
});

// POST /api/applications/:id/finalize — mark complete
router.post('/:id/finalize', async (req, res) => {
  const { error } = await supaAdmin.from('applications')
    .update({ status: 'complete', reviewed_by: req.user.id })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'finalize', 'application', req.params.id, {});
  res.json({ ok: true });
});

// DELETE /api/applications/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supaAdmin.from('applications').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'delete', 'application', req.params.id, {});
  res.json({ ok: true });
});

// POST /api/applications/:id/upload — upload a file
//   form-data: kind ('photo'|'aadhar'|'pan'|'receipt'|'other'), applicant_id (required for KYC kinds), label, file
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  try {
    const { kind, applicant_id, label } = req.body;
    if (!req.file) return res.status(400).json({ error: 'file missing' });
    const key = `${req.params.id}/${kind}_${Date.now()}_${req.file.originalname}`;
    const { error: upErr } = await supaAdmin.storage.from(BUCKET)
      .upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) throw upErr;

    if (['photo','aadhar','pan'].includes(kind)) {
      if (!applicant_id) return res.status(400).json({ error: 'applicant_id required' });
      const col = `${kind}_path`;
      await supaAdmin.from('applicants').update({ [col]: key }).eq('id', applicant_id);
    } else if (kind === 'receipt') {
      await supaAdmin.from('applications').update({ receipt_path: key }).eq('id', req.params.id);
    } else {
      await supaAdmin.from('documents').insert({
        application_id: req.params.id, label: label || req.file.originalname, file_path: key
      });
    }
    res.json({ ok: true, path: key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/applications/file/signed?path=... — get short-lived signed URL
router.get('/file/signed', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'path required' });
  const { data, error } = await supaAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ url: data.signedUrl });
});

// POST /api/applications/export — generate Farvision xlsx for given ids
router.post('/export', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
  const { data: apps, error } = await supaAdmin.from('applications')
    .select('*, project:projects(*), applicants(*)').in('id', ids);
  if (error) return res.status(500).json({ error: error.message });
  // Sort applicants within each app
  apps.forEach(a => a.applicants?.sort((x,y) => (x.display_seq||0) - (y.display_seq||0)));
  const buf = buildFarvisionXlsx(apps);
  await supaAdmin.from('applications').update({ status: 'exported' }).in('id', ids);
  await audit(req.user, 'export', 'application', null, { count: ids.length });
  const stamp = new Date().toISOString().slice(0,10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Farvision_${apps.length}apps_${stamp}.xlsx"`);
  res.send(buf);
});

export default router;
