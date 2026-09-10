-- The existing RLS "update own row"/"update own targets" policies only check
-- row ownership, not which columns are being written — meaning an
-- authenticated client could currently call
--   supabase.from('targets').update({ verified: true }).eq('id', myTargetId)
-- from the browser and bypass the entire ownership-verification gate, or
--   supabase.from('users').update({ plan: 'paid' }).eq('id', myUserId)
-- and bypass billing entirely. Column-level REVOKE closes this: the
-- `authenticated` role can no longer touch these columns via UPDATE at all,
-- regardless of RLS, while the service-role client (used by the verify
-- route, the worker, and the billing webhook) is unaffected — it runs as a
-- separate Postgres role that was never granted from here.
revoke update (
  verified,
  verified_at,
  verification_method,
  verification_token,
  authorization_attested
) on public.targets from authenticated;

revoke update (
  plan,
  razorpay_customer_id,
  razorpay_subscription_id,
  plan_renews_at
) on public.users from authenticated;
