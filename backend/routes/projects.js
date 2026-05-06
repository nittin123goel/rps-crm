import { Router } from 'express';
import { supaAdmin } from '../lib/supabase.js';
import { requireAuth, requireAdmin, audit } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supaAdmin.from('projects').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin-only: create / update / delete projects
router.post('/', requireAdmin, async (req, res) => {
  const { slug, name, rera_number, fiscal_year, is_active = true } = req.body;
  if (!slug || !name || !rera_number) return res.status(400).json({ error: 'slug, name, rera_number required' });
  const { data, error } = await supaAdmin.from('projects')
    .insert({ slug, name, rera_number, fiscal_year, is_active, created_by: req.user.id })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'create', 'project', data.id, { name });
  res.json(data);
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { error } = await supaAdmin.from('projects').update(req.body).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'update', 'project', req.params.id, {});
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { error } = await supaAdmin.from('projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'delete', 'project', req.params.id, {});
  res.json({ ok: true });
});

export default router;
