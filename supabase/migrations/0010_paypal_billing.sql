-- Switch billing provider from Razorpay to PayPal. Confirmed via a live
-- query before writing this migration: zero users have a non-null
-- razorpay_subscription_id — the feature was never actually used for a
-- real charge, so this is a clean swap, not a live-data migration.

alter table public.users
  add column paypal_subscription_id text,
  add column paypal_payer_id text;

create index idx_users_paypal_subscription_id on public.users (paypal_subscription_id);

drop index if exists idx_users_razorpay_subscription_id;

alter table public.users
  drop column razorpay_customer_id,
  drop column razorpay_subscription_id;

-- Table-level grants from migration 0007 (authenticated has no
-- insert/update/delete on public.users at all) already cover these new
-- columns — no grant changes needed.
