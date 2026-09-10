import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRazorpayClient, SUBSCRIPTION_TOTAL_COUNT } from "@/lib/razorpay";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).single();
  if (profile?.plan === "paid") {
    return NextResponse.json({ error: "already_paid", message: "You're already on the paid plan." }, { status: 409 });
  }

  const planId = process.env.RAZORPAY_PLAN_ID;
  if (!planId) {
    return NextResponse.json(
      { error: "billing_not_configured", message: "Billing isn't configured yet." },
      { status: 503 }
    );
  }

  // Razorpay links the customer during checkout, not at creation time — the
  // subscription starts unattached to a customer_id until the user pays.
  const subscription = await getRazorpayClient().subscriptions.create({
    plan_id: planId,
    total_count: SUBSCRIPTION_TOTAL_COUNT,
    customer_notify: 1,
    notes: { supabase_user_id: user.id },
  });

  const service = createServiceClient();
  await service.from("users").update({ razorpay_subscription_id: subscription.id }).eq("id", user.id);

  await logAudit({
    userId: user.id,
    action: "billing.subscription.created",
    metadata: { subscriptionId: subscription.id },
  });

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    prefillEmail: user.email,
  });
}
