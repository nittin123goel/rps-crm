# Farvision CRM

Customer-acquisition CRM for real estate. Three surfaces:

- **`/apply/:slug`** — public, no login. Customer fills personal details and uploads Aadhaar/PAN/photo.
- **`/`** (operator dashboard) — logged-in users review submissions, fill unit/payment/broker, finalize, export to Farvision xlsx.
- **`/admin/...`** — admins manage projects (Project Name + RERA), invite operators, view audit log.

## Stack
- **DB + Auth + Storage:** Supabase
- **Backend:** Node.js + Express (Render)
- **Frontend:** React + Vite + Tailwind (Render)

---

## Setup

### 1. Supabase

1. Create a new Supabase project at supabase.com
2. SQL editor → paste `supabase/schema.sql` → Run
3. Storage → create bucket named `kyc` (Private; not Public)
4. Project Settings → API → grab:
   - `Project URL`
   - `anon` (public) key
   - `service_role` key (keep this secret)
5. Authentication → Providers → make sure **Email** is enabled, **disable** "Confirm email" for faster onboarding (optional)

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, CORS_ORIGINS
npm install
npm run dev
```

Server runs on `http://localhost:4000`. Health check: `GET /api/health`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 4. Seed first admin

After running the backend at least once, the `profiles` trigger is in place. To create the first admin:

**Option A — via Supabase Dashboard:**
1. Authentication → Users → "Add user" → enter email + password
2. SQL editor:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log in at `/login`. You can now invite other users from `/admin/users`.

**Option B — via API:** make any signup request, then bump role to admin via SQL as above.

### 5. Test the flow

1. Log in as admin
2. **Projects** → Create one (e.g. name="12th Avenue", slug="12th-avenue", rera_number="...")
3. Copy the public link → open in incognito → submit an application as a customer
4. Back in the dashboard → see the pending application → edit, fill broker/payment, mark Complete
5. Select it → Export → downloads a Farvision-compatible xlsx

---

## Deployment (Render)

### Backend (Web Service)
- Repo: this folder, root `backend/`
- Build command: `npm install`
- Start command: `npm start`
- Env vars: copy from `backend/.env.example`
- After deploy, copy the URL — you'll need it as `VITE_API_URL` for the frontend

### Frontend (Static Site)
- Repo: this folder, root `frontend/`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Env vars: copy from `frontend/.env.example` with the real backend URL
- Add a redirect rule for SPA routing: `/* /index.html 200`

### CORS
Update backend's `CORS_ORIGINS` env var with your frontend's deployed URL after first deploy.

---

## API surface

```
PUBLIC (no auth)
  GET  /api/public/projects/:slug          → project info
  POST /api/public/applications            → submit (multipart, files: a1_photo, a1_aadhar, a1_pan, a2_*, a3_*; payload JSON)

AUTHENTICATED (Bearer token from Supabase)
  GET    /api/users/me
  GET    /api/applications?status=&project_id=&q=
  GET    /api/applications/:id
  POST   /api/applications                  body: { project_id }
  PATCH  /api/applications/:id              body: { ...fields, applicants:[] }
  POST   /api/applications/:id/finalize
  DELETE /api/applications/:id
  POST   /api/applications/:id/upload       multipart: file, kind, applicant_id?, label?
  GET    /api/applications/file/signed?path=
  POST   /api/applications/export           body: { ids:[] } → xlsx
  GET    /api/projects
  POST   /api/projects                      (admin)
  PATCH  /api/projects/:id                  (admin)
  DELETE /api/projects/:id                  (admin)
  GET    /api/users                         (admin)
  POST   /api/users/invite                  (admin)
  PATCH  /api/users/:id                     (admin)
  GET    /api/users/audit/log               (admin)
```

## Schema overview

```
profiles    — extends auth.users, has role (admin|user)
projects    — Project Name + RERA + slug (the hardcoded values per project)
applications — booking, status (pending|review|complete|exported), source (operator|customer)
applicants  — 1-3 per application, KYC fields + file paths
documents   — name-change papers, supporting docs
audit_log   — every important action
```

Storage layout in the `kyc` bucket:
```
<application_id>/applicant_1_photo_<ts>_<filename>
<application_id>/applicant_1_aadhar_<ts>_<filename>
<application_id>/<kind>_<ts>_<filename>
```

## Roadmap / next steps
- WhatsApp/SMS notification when customer submits (Wati integration; you've already got this for Adventuria)
- Auto-assign incoming submissions to operators round-robin
- Bulk import historical applications from xlsx
- Multi-tenant (separate Adventuria, Terragreen, etc. into orgs)
- Customer-side OTP verification before submission
- Document OCR — auto-extract PAN/Aadhaar number from uploaded image
