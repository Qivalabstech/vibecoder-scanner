-- Editable *display* price for the Pro tier, shown on the public marketing
-- page. This does NOT change what Razorpay actually charges — that's still
-- governed entirely by the Razorpay Plan referenced by RAZORPAY_PLAN_ID.
-- Changing this value updates the number the marketing page shows; to
-- change what a new subscriber is actually billed, the Razorpay Plan's own
-- amount (or a new plan + updated RAZORPAY_PLAN_ID env var) must be updated
-- too. The admin pricing page spells this out.
create table public.pricing_config (
  id smallint primary key default 1 check (id = 1),
  pro_price_inr integer not null default 1999 check (pro_price_inr >= 0),
  updated_at timestamptz not null default now()
);

insert into public.pricing_config (id, pro_price_inr) values (1, 1999);

alter table public.pricing_config enable row level security;

create policy "pricing is publicly readable"
  on public.pricing_config for select
  using (true);

-- Same pattern as every other table in this project (see migration 0007 /
-- rules.md): REVOKE first, then GRANT back only the narrow thing that's
-- safe. Anyone (including anon, unauthenticated marketing-page visitors)
-- can read the price; nobody but service_role can write it — the admin
-- route enforces the is-super-admin check server-side before using the
-- service-role client to update this row.
revoke insert, update, delete on public.pricing_config from authenticated, anon;
grant select on public.pricing_config to authenticated, anon;
grant all on public.pricing_config to service_role;
