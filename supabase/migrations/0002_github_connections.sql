-- Stores the GitHub OAuth access token captured at login so the app can list
-- repos-with-permissions server-side later (Supabase doesn't persist provider
-- tokens across sessions). Service-role only — never exposed to the client.
create table public.github_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  access_token text not null,
  github_login text,
  updated_at timestamptz not null default now()
);

alter table public.github_connections enable row level security;

-- No policies granted to `authenticated` — this table is written/read only via
-- the service-role client in trusted route handlers.
