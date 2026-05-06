import { supaAnon, supaAdmin } from '../lib/supabase.js';

// Extract Bearer token from request
function getToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Verify JWT, attach req.user = { id, email, role }
export async function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const { data, error } = await supaAnon.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });
    const { data: profile } = await supaAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', data.user.id)
      .single();
    if (!profile || !profile.is_active) return res.status(403).json({ error: 'Account disabled' });
    req.user = profile;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Auth failed' });
  }
}

// Gate: admin only
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// Helper: log to audit_log
export async function audit(actor, action, entity, entityId, detail = {}) {
  try {
    await supaAdmin.from('audit_log').insert({
      actor_id: actor?.id || null,
      actor_email: actor?.email || null,
      action, entity, entity_id: entityId, detail
    });
  } catch (e) { console.error('audit log failed', e.message); }
}
