import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPaypalSubscription } from "@/lib/paypal";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ promoCode: z.string().trim().min(1).optional() });

const PROMO_ERROR_MESSAGES: Record<string, string> = {
  invalid_promo_code: "That promo code isn't valid.",
  promo_code_exhausted: "That promo code has already been fully redeemed.",
  promo_code_already_redeemed: "You've already used that promo code.",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).single();
  if (profile?.plan === "paid") {
    return NextResponse.json({ error: "already_paid", message: "You're already on the paid plan." }, { status: 409 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createServiceClient();

  let planId = process.env.PAYPAL_PLAN_ID;
  let redeemedPromo: { promoCodeId: string } | null = null;

  if (parsed.data.promoCode) {
    // Reserves the redemption slot atomically (row-locked, so two people
    // racing for the last slot on the same code can't both succeed) —
    // see redeem_promo_code() in migration 0011 for why this has to be a
    // single DB call rather than a read-then-write from here.
    const code = parsed.data.promoCode.trim().toUpperCase();
    const { data: redemption, error: redeemError } = await service
      .rpc("redeem_promo_code", { p_code: code, p_user_id: user.id })
      .single<{ out_paypal_plan_id: string; out_promo_code_id: string }>();

    if (redeemError) {
      const message = PROMO_ERROR_MESSAGES[redeemError.message] ?? "Couldn't apply that promo code.";
      return NextResponse.json({ error: redeemError.message, message }, { status: 400 });
    }

    planId = redemption.out_paypal_plan_id;
    redeemedPromo = { promoCodeId: redemption.out_promo_code_id };
  }

  if (!planId) {
    // Release the slot we just reserved above — billing being
    // unconfigured shouldn't cost the user their one redemption.
    if (redeemedPromo) {
      await service.rpc("release_promo_redemption", {
        p_promo_code_id: redeemedPromo.promoCodeId,
        p_user_id: user.id,
      });
    }
    return NextResponse.json(
      { error: "billing_not_configured", message: "Billing isn't configured yet." },
      { status: 503 }
    );
  }

  let subscription;
  try {
    subscription = await createPaypalSubscription(planId, user.id);
  } catch (err) {
    // Same compensation — a PayPal-side failure shouldn't burn the
    // redemption either, since the user never actually got the discount.
    if (redeemedPromo) {
      await service.rpc("release_promo_redemption", {
        p_promo_code_id: redeemedPromo.promoCodeId,
        p_user_id: user.id,
      });
    }
    return NextResponse.json(
      { error: "paypal_error", message: err instanceof Error ? err.message : "Couldn't start checkout." },
      { status: 502 }
    );
  }

  await service.from("users").update({ paypal_subscription_id: subscription.id }).eq("id", user.id);

  if (redeemedPromo) {
    await service
      .from("promo_redemptions")
      .update({ paypal_subscription_id: subscription.id })
      .eq("promo_code_id", redeemedPromo.promoCodeId)
      .eq("user_id", user.id);
  }

  await logAudit({
    userId: user.id,
    action: "billing.subscription.created",
    metadata: {
      subscriptionId: subscription.id,
      planId,
      ...(redeemedPromo ? { promoCodeId: redeemedPromo.promoCodeId } : {}),
    },
  });

  return NextResponse.json({
    subscriptionId: subscription.id,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    prefillEmail: user.email,
  });
}
