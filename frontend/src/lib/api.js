import { supabase } from './supabase.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function api(path, { method = 'GET', body, formData, asBlob } = {}) {
  const headers = await authHeader();
  const init = { method, headers };
  if (formData) {
    init.body = formData;        // browser sets Content-Type with boundary
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, init);
  if (asBlob) {
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    return res.blob();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

// Public API (no auth)
export async function publicApi(path, opts = {}) {
  const init = { method: opts.method || 'GET' };
  if (opts.formData) {
    init.body = opts.formData;
  } else if (opts.body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}
