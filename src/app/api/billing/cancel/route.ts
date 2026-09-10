import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRazorpayClient } from "@/lib/razorpay";
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
    .select("razorpay_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.razorpay_subscription_id) {
    return NextResponse.json({ error: "no_subscription", message: "No active subscription found." }, { status: 404 });
  }

  // cancel_at_cycle_end: true — let the current paid period run out rather
  // than yanking access immediately after the user already paid for it.
  await getRazorpayClient().subscriptions.cancel(profile.razorpay_subscription_id, true);

  await logAudit({
    userId: user.id,
    action: "billing.subscription.cancel_requested",
    metadata: { subscriptionId: profile.razorpay_subscription_id },
  });

  return NextResponse.json({
    message: "Your subscription will end at the close of the current billing period.",
  });
}
