import { NextResponse } from "next/server";
import { Razorpay } from "@/lib/razorpay";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  customer_id: string | null;
  current_end: number | null; // unix seconds
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
}

const ACTIVE_STATUSES = new Set(["activated", "charged"]);
const INACTIVE_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.completed",
  "subscription.halted",
  "subscription.expired",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const valid = Razorpay.validateWebhookSignature(rawBody, signature, secret);
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const subscriptionEntity = body.payload.subscription?.entity;

  if (!subscriptionEntity) {
    // Not a subscription-lifecycle event (e.g. a bare payment.* event) — nothing to do.
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("id")
    .eq("razorpay_subscription_id", subscriptionEntity.id)
    .maybeSingle();

  if (!profile) {
    // Webhook for a subscription we don't recognize — log and move on rather
    // than 500ing, so Razorpay doesn't retry forever.
    await logAudit({
      userId: null,
      action: "billing.webhook.unknown_subscription",
      metadata: { event: body.event, subscriptionId: subscriptionEntity.id },
    });
    return NextResponse.json({ received: true });
  }

  if (ACTIVE_STATUSES.has(subscriptionEntity.status) || body.event === "subscription.charged") {
    await service
      .from("users")
      .update({
        plan: "paid",
        razorpay_customer_id: subscriptionEntity.customer_id,
        plan_renews_at: subscriptionEntity.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : null,
      })
      .eq("id", profile.id);
  } else if (INACTIVE_EVENTS.has(body.event)) {
    await service
      .from("users")
      .update({ plan: "free", plan_renews_at: null })
      .eq("id", profile.id);
  }

  await logAudit({
    userId: profile.id,
    action: "billing.webhook.processed",
    metadata: { event: body.event, subscriptionId: subscriptionEntity.id, status: subscriptionEntity.status },
  });

  return NextResponse.json({ received: true });
}
