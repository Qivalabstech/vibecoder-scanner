import { NextResponse } from "next/server";
import { verifyPaypalWebhookSignature } from "@/lib/paypal";
import { createServiceClient } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";

interface PaypalSubscriptionResource {
  id: string;
  status: string;
  custom_id?: string;
  subscriber?: { payer_id?: string };
  billing_info?: { next_billing_time?: string };
}

interface PaypalWebhookPayload {
  event_type: string;
  resource: PaypalSubscriptionResource;
}

const ACTIVE_EVENTS = new Set(["BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"]);
const INACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
]);

export async function POST(request: Request) {
  if (!process.env.PAYPAL_WEBHOOK_ID || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  // Signature verification needs the exact raw bytes PayPal sent —
  // parsing first would let whitespace/key-order differences break it.
  const rawBody = await request.text();

  const valid = await verifyPaypalWebhookSignature(
    {
      transmissionId: request.headers.get("paypal-transmission-id"),
      transmissionTime: request.headers.get("paypal-transmission-time"),
      certUrl: request.headers.get("paypal-cert-url"),
      authAlgo: request.headers.get("paypal-auth-algo"),
      transmissionSig: request.headers.get("paypal-transmission-sig"),
    },
    rawBody
  );

  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as PaypalWebhookPayload;
  const subscriptionId = body.resource?.id;

  if (!subscriptionId) {
    // Not a subscription-lifecycle event — nothing to do.
    return NextResponse.json({ received: true });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("users")
    .select("id")
    .eq("paypal_subscription_id", subscriptionId)
    .maybeSingle();

  if (!profile) {
    await logAudit({
      userId: null,
      action: "billing.webhook.unknown_subscription",
      metadata: { event: body.event_type, subscriptionId },
    });
    return NextResponse.json({ received: true });
  }

  if (ACTIVE_EVENTS.has(body.event_type)) {
    await service
      .from("users")
      .update({
        plan: "paid",
        paypal_payer_id: body.resource.subscriber?.payer_id ?? null,
        plan_renews_at: body.resource.billing_info?.next_billing_time ?? null,
      })
      .eq("id", profile.id);
  } else if (INACTIVE_EVENTS.has(body.event_type)) {
    await service
      .from("users")
      .update({ plan: "free", plan_renews_at: null })
      .eq("id", profile.id);
  }

  await logAudit({
    userId: profile.id,
    action: "billing.webhook.processed",
    metadata: { event: body.event_type, subscriptionId, status: body.resource.status },
  });

  return NextResponse.json({ received: true });
}
