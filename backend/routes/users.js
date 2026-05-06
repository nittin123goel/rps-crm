import { Router } from 'express';
import { supaAdmin } from '../lib/supabase.js';
import { requireAuth, requireAdmin, audit } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Current user
router.get('/me', (req, res) => res.json(req.user));

// Admin: list all users
router.get('/', requireAdmin, async (req, res) => {
  const { data, error } = await supaAdmin.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Admin: invite a user (creates auth + profile)
router.post('/invite', requireAdmin, async (req, res) => {
  const { email, full_name, role = 'user', password } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  // Create auth user with provided password (or random)
  const tempPassword = password || (Math.random().toString(36).slice(2, 10) + 'A1!');
  const { data, error } = await supaAdmin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
    user_metadata: { full_name, role }
  });
  if (error) return res.status(500).json({ error: error.message });
  // Update profile role explicitly (in case trigger raced)
  await supaAdmin.from('profiles').update({ role, full_name }).eq('id', data.user.id);
  await audit(req.user, 'invite', 'user', data.user.id, { email, role });
  res.json({ id: data.user.id, email, role, temp_password: tempPassword });
});

// Admin: change role / disable user
router.patch('/:id', requireAdmin, async (req, res) => {
  const { role, is_active, full_name } = req.body;
  const update = {};
  if (role !== undefined) update.role = role;
  if (is_active !== undefined) update.is_active = is_active;
  if (full_name !== undefined) update.full_name = full_name;
  const { error } = await supaAdmin.from('profiles').update(update).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await audit(req.user, 'update', 'user', req.params.id, update);
  res.json({ ok: true });
});

// Admin: audit log
router.get('/audit/log', requireAdmin, async (req, res) => {
  const { data, error } = await supaAdmin.from('audit_log').select('*')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
