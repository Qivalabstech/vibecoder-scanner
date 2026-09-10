-- Razorpay subscription state. Written only via the service-role client
-- (webhook handler + billing routes) — no insert/update policy for
-- `authenticated` on these columns beyond what 0001's existing policy
-- already grants, and that policy only covers rows the user owns.
alter table public.users
  add column razorpay_customer_id text,
  add column razorpay_subscription_id text,
  add column plan_renews_at timestamptz;

create index idx_users_razorpay_subscription_id on public.users (razorpay_subscription_id);
