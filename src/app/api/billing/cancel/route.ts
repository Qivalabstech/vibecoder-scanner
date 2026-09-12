import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cancelPaypalSubscription } from "@/lib/paypal";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("paypal_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.paypal_subscription_id) {
    return NextResponse.json({ error: "no_subscription", message: "No active subscription found." }, { status: 404 });
  }

  // PayPal has no "cancel at cycle end" — cancelling stops future billing
  // immediately, so access is revoked immediately too. Deferring the DB
  // downgrade while telling PayPal to stop now would mean losing access
  // with no future charge to justify keeping it; not cancelling with
  // PayPal now would mean the user gets charged again next cycle despite
  // asking to cancel. Immediate on both sides is the only correct option.
  await cancelPaypalSubscription(profile.paypal_subscription_id, "User requested cancellation");

  await service.from("users").update({ plan: "free", plan_renews_at: null }).eq("id", user.id);

  await logAudit({
    userId: user.id,
    action: "billing.subscription.cancelled",
    metadata: { subscriptionId: profile.paypal_subscription_id },
  });

  return NextResponse.json({
    message: "Your subscription has been cancelled and your plan is now Free.",
  });
}
