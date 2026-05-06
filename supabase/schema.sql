-- =====================================================================
-- Farvision CRM — Supabase schema + RLS
-- Run this in Supabase SQL editor (one shot).
-- =====================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- profiles: extends auth.users, holds role
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Auto-create profile when a new auth user is created
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- projects: hardcoded project settings (name + RERA)
-- ---------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,                            -- "12th Avenue"
  rera_number text not null,
  fiscal_year text default '01-04-2025-31-03-2026',
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

-- ---------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------
create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),

  -- operator-filled
  unit_number text,
  entry_type text default 'FLAT APPLICATION',
  document_date date default current_date,
  broker_name text,
  remarks text,

  -- contact (primary applicant's correspondence)
  mobile text,
  email text,
  phone text,

  -- address
  addr_line1 text, addr_line2 text, addr_line3 text,
  city text, state text, country text default 'India', postal_code text,

  -- payment
  payment_amount numeric(14,2),
  payment_mode text,
  payment_ref text,
  payment_bank text,
  payment_date date,
  receipt_no text,
  receipt_path text,

  -- meta
  status text default 'pending' check (status in ('pending','review','complete','exported')),
  source text default 'operator' check (source in ('operator','customer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references profiles(id),
  reviewed_by uuid references profiles(id)
);

create index if not exists applications_project_idx on applications(project_id);
create index if not exists applications_status_idx on applications(status);

-- ---------------------------------------------------------------------
-- applicants (1-3 per application)
-- ---------------------------------------------------------------------
create table if not exists applicants (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  is_primary boolean default false,
  display_seq int not null,

  salutation text,
  first_name text,
  middle_name text,
  last_name text,
  dob date,
  gender text,
  relationship text,
  relative_name text,
  pan text,
  aadhar text,

  photo_path text,
  aadhar_path text,
  pan_path text,

  created_at timestamptz default now()
);

create index if not exists applicants_app_idx on applicants(application_id);

-- ---------------------------------------------------------------------
-- documents (name-change papers, supporting docs)
-- ---------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references applications(id) on delete cascade,
  label text,
  file_path text not null,
  uploaded_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  actor_email text,
  action text not null,
  entity text,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_apps_updated on applications;
create trigger trg_apps_updated before update on applications
  for each row execute function set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table profiles      enable row level security;
alter table projects      enable row level security;
alter table applications  enable row level security;
alter table applicants    enable row level security;
alter table documents     enable row level security;
alter table audit_log     enable row level security;

-- Helper: is current user an admin?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: users see own row, admins see all
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all
  using (is_admin()) with check (is_admin());

-- projects: any logged-in user can read; only admin can write
drop policy if exists projects_read on projects;
create policy projects_read on projects for select
  using (auth.uid() is not null);

drop policy if exists projects_admin_write on projects;
create policy projects_admin_write on projects for all
  using (is_admin()) with check (is_admin());

-- applications/applicants/documents: any logged-in user can read+write.
-- (Backend uses service_role for public submissions, bypassing RLS.)
drop policy if exists apps_user_all on applications;
create policy apps_user_all on applications for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists applicants_user_all on applicants;
create policy applicants_user_all on applicants for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists docs_user_all on documents;
create policy docs_user_all on documents for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- audit_log: admin-only read; insert is via backend service_role
drop policy if exists audit_admin_read on audit_log;
create policy audit_admin_read on audit_log for select using (is_admin());

-- =====================================================================
-- STORAGE BUCKET
-- Run this manually in Supabase Storage UI, or via dashboard:
--   Bucket name: 'kyc'   Public: false
-- Then add these policies:
-- =====================================================================
-- (Storage policies are in the Supabase Storage policies section, not here.
--  Recommended: bucket is private; backend uses service_role to upload/sign
--  download URLs. The frontend never talks to Storage directly.)
