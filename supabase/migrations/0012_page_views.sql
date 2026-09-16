-- First-party traffic-source logging. GA (gtag.js, added in
-- layout.tsx) covers "look at analytics.google.com" but nothing in
-- this app can pull live numbers *out* of Google Analytics into our
-- own admin panel without GA Data API credentials, which nothing here
-- has — this table is a much smaller, honest substitute: log every
-- real page navigation's path/referrer/UTM params server-side in
-- proxy.ts, then aggregate "where did this hit come from" directly in
-- the admin console.
create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_page_views_created_at on public.page_views (created_at desc);
create index idx_page_views_referrer_host on public.page_views (referrer_host);

alter table public.page_views enable row level security;

-- Same lock-down pattern as every table since migration 0007: written
-- only from proxy.ts via the service-role client (fire-and-forget, not
-- awaited on the response path — see waitUntil in proxy.ts), read only
-- through the admin page's own service-role query after its
-- is-super-admin check. Nothing for authenticated/anon to do here.
revoke all on public.page_views from authenticated, anon;
grant all on public.page_views to service_role;
