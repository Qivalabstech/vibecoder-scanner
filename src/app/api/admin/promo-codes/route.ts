import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { createPaypalPlan, getCurrentProPriceUsd } from "@/lib/paypal";

const bodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "letters, numbers, - and _ only"),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  maxRedemptions: z.number().int().positive(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Re-checked here, not just trusted from the admin layout's redirect —
  // same pattern as every other server-validated admin write in this app.
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const { discountType, discountValue, maxRedemptions } = parsed.data;

  if (discountType === "percent" && discountValue >= 100) {
    return NextResponse.json(
      { error: "invalid_discount", message: "A percent discount has to be less than 100." },
      { status: 400 }
    );
  }

  // Real write against live PayPal: computes the discounted price from
  // PayPal's own current price (not pricing_config, which is
  // display-only and can drift), then creates a real, immediately-
  // active plan under the same product as the standard Pro plan. This
  // plan exists and is subscribable the moment this call succeeds,
  // whether or not the promo code row below ends up getting created.
  let planId: string;
  try {
    const basePrice = await getCurrentProPriceUsd();
    const discountedPrice =
      discountType === "percent" ? basePrice * (1 - discountValue / 100) : Math.max(0, basePrice - discountValue);
    const plan = await createPaypalPlan(
      `Pro — ${code}`,
      `Promo plan for code ${code}: ${
        discountType === "percent" ? `${discountValue}% off` : `$${discountValue} off`
      } the standard Pro price.`,
      Math.round(discountedPrice * 100) / 100
    );
    planId = plan.id;
  } catch (err) {
    return NextResponse.json(
      {
        error: "paypal_plan_create_failed",
        message: err instanceof Error ? err.message : "Couldn't create the PayPal plan for this code.",
      },
      { status: 502 }
    );
  }

  const service = createServiceClient();
  const { data: promo, error } = await service
    .from("promo_codes")
    .insert({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      paypal_plan_id: planId,
      max_redemptions: maxRedemptions,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: "code_taken",
          message: `That code already exists. (A live PayPal plan (${planId}) was already created for this attempt — deactivate it manually in the PayPal dashboard if you're not reusing it.)`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    userId: user.id,
    action: "admin.promo_code.created",
    metadata: { code: promo.code, paypalPlanId: promo.paypal_plan_id, maxRedemptions: promo.max_redemptions },
  });

  return NextResponse.json({ promo }, { status: 201 });
}
