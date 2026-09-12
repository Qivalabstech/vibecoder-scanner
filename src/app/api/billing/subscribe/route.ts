import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPaypalSubscription } from "@/lib/paypal";
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

  const planId = process.env.PAYPAL_PLAN_ID;
  if (!planId) {
    return NextResponse.json(
      { error: "billing_not_configured", message: "Billing isn't configured yet." },
      { status: 503 }
    );
  }

  const subscription = await createPaypalSubscription(planId, user.id);

  const service = createServiceClient();
  await service.from("users").update({ paypal_subscription_id: subscription.id }).eq("id", user.id);

  await logAudit({
    userId: user.id,
    action: "billing.subscription.created",
    metadata: { subscriptionId: subscription.id },
  });

  return NextResponse.json({
    subscriptionId: subscription.id,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    prefillEmail: user.email,
  });
}
