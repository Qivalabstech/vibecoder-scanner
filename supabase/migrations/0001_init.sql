-- Vibecoder Security Scanner — initial schema
-- Mirrors auth.users via a public profile row created on signup.

create type public.plan_tier as enum ('free', 'paid');
create type public.target_type as enum ('repo', 'site');
create type public.verification_method as enum ('github_oauth', 'dns_txt', 'meta_tag');
create type public.scan_status as enum ('queued', 'running', 'done', 'failed');
create type public.finding_severity as enum ('critical', 'high', 'medium', 'low');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan public.plan_tier not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users can view own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- creates the public.users row whenever someone signs up via Supabase Auth
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- targets
-- ---------------------------------------------------------------------------
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.target_type not null,
  identifier text not null, -- 'owner/repo' for repos, origin URL for sites
  verified boolean not null default false,
  verified_at timestamptz,
  verification_method public.verification_method,
  verification_token text, -- DNS TXT / meta-tag challenge value while pending
  authorization_attested boolean not null default false, -- ToS ownership checkbox
  created_at timestamptz not null default now(),
  unique (user_id, type, identifier)
);

alter table public.targets enable row level security;

create policy "users can view own targets"
  on public.targets for select
  using (auth.uid() = user_id);

create policy "users can insert own targets"
  on public.targets for insert
  with check (auth.uid() = user_id);

create policy "users can update own targets"
  on public.targets for update
  using (auth.uid() = user_id);

create policy "users can delete own targets"
  on public.targets for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.targets (id) on delete cascade,
  status public.scan_status not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.scans enable row level security;

create policy "users can view scans of own targets"
  on public.scans for select
  using (
    exists (
      select 1 from public.targets t
      where t.id = scans.target_id and t.user_id = auth.uid()
    )
  );

create policy "users can insert scans for own targets"
  on public.scans for insert
  with check (
    exists (
      select 1 from public.targets t
      where t.id = scans.target_id and t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- findings
-- ---------------------------------------------------------------------------
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  severity public.finding_severity not null,
  title text not null,
  description text,
  file_path text,
  line_number integer,
  raw_tool_output jsonb,
  ai_explanation text,
  ai_fix_suggestion text,
  created_at timestamptz not null default now()
);

alter table public.findings enable row level security;

create policy "users can view findings of own scans"
  on public.findings for select
  using (
    exists (
      select 1 from public.scans s
      join public.targets t on t.id = s.target_id
      where s.id = findings.scan_id and t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_log — every scan trigger and verification event (Phase 8 requirement)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  target_id uuid references public.targets (id) on delete set null,
  action text not null, -- e.g. 'target.verify.attempt', 'scan.trigger'
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "users can view own audit log"
  on public.audit_log for select
  using (auth.uid() = user_id);

-- writes to audit_log happen via the service-role client only (route handlers),
-- so no insert policy is granted to the authenticated role.

create index idx_targets_user_id on public.targets (user_id);
create index idx_scans_target_id on public.scans (target_id);
create index idx_findings_scan_id on public.findings (scan_id);
create index idx_audit_log_user_id on public.audit_log (user_id);
