-- Promo codes for partners/affiliates. PayPal subscriptions have no
-- coupon API (unlike Stripe) — the only way to actually change what a
-- subscriber is billed is to point their subscription at a different
-- PayPal Plan, same constraint the admin pricing page already documents
-- for plain price changes ("PayPal plans are effectively fixed once
-- subscribers exist — create a new plan at the new amount"). So a promo
-- code doesn't compute a discount itself: the admin creates the real
-- discounted plan in the PayPal dashboard first, then a code here just
-- points at that plan's id. discount_type/discount_value are a display
-- label only (what the admin UI and checkout show the redeemer), not a
-- second, independent source of truth for what's charged.
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  paypal_plan_id text not null,
  max_redemptions integer not null check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  active boolean not null default true,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now()
);

create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id),
  user_id uuid not null references public.users (id),
  paypal_subscription_id text,
  redeemed_at timestamptz not null default now(),
  -- one redemption per user per code — "single-use per code" means the
  -- code as a whole is capped by max_redemptions, and additionally no
  -- single user can claim the same code twice.
  unique (promo_code_id, user_id)
);

create index idx_promo_redemptions_promo_code_id on public.promo_redemptions (promo_code_id);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

-- Same lock-down pattern as every other table since migration 0007:
-- nothing here is meant to be readable or writable directly by
-- authenticated/anon — a promo code's existence, discount, and the
-- PayPal plan it maps to are looked up only through server routes
-- (admin CRUD, and the redeem_promo_code() function below) that run
-- under the service role after their own authorization checks.
revoke all on public.promo_codes from authenticated, anon;
revoke all on public.promo_redemptions from authenticated, anon;
grant all on public.promo_codes to service_role;
grant all on public.promo_redemptions to service_role;

-- Redemption has to be one atomic operation (check active + not
-- exhausted + not already used by this user, then increment + insert)
-- or concurrent redemptions of the same code right at its last slot can
-- both pass a read-then-write check from application code and
-- over-redeem it. `for update` takes a row lock on the promo code for
-- the duration of the transaction, serializing concurrent callers.
create or replace function public.redeem_promo_code(p_code text, p_user_id uuid)
returns table (out_paypal_plan_id text, out_promo_code_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
begin
  select * into v_promo from public.promo_codes
    where code = p_code and active = true
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_promo_code';
  end if;

  if v_promo.redemption_count >= v_promo.max_redemptions then
    raise exception using errcode = 'P0002', message = 'promo_code_exhausted';
  end if;

  if exists (
    select 1 from public.promo_redemptions
    where promo_code_id = v_promo.id and user_id = p_user_id
  ) then
    raise exception using errcode = 'P0003', message = 'promo_code_already_redeemed';
  end if;

  update public.promo_codes set redemption_count = redemption_count + 1 where id = v_promo.id;
  insert into public.promo_redemptions (promo_code_id, user_id) values (v_promo.id, p_user_id);

  return query select v_promo.paypal_plan_id, v_promo.id;
end;
$$;

-- Compensating action for when redeem_promo_code() succeeds but the
-- subsequent PayPal subscription call fails — the two aren't in one
-- transaction (PayPal is a separate system), so the API route calls this
-- to release the slot rather than leaving the user's one redemption
-- silently burned on a subscription that never happened.
create or replace function public.release_promo_redemption(p_promo_code_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.promo_redemptions
    where promo_code_id = p_promo_code_id and user_id = p_user_id;

  update public.promo_codes
    set redemption_count = greatest(0, redemption_count - 1)
    where id = p_promo_code_id;
end;
$$;

revoke all on function public.redeem_promo_code(text, uuid) from public, anon, authenticated;
revoke all on function public.release_promo_redemption(uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_promo_code(text, uuid) to service_role;
grant execute on function public.release_promo_redemption(uuid, uuid) to service_role;
