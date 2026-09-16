import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isOverPromoValidateRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ code: z.string().trim().min(1) });

// Read-only check so the checkout UI can show "20% off" before the user
// commits — does not reserve a redemption slot. The slot is only
// actually claimed atomically inside /api/billing/subscribe at the
// moment of checkout, via the redeem_promo_code() DB function, so
// validating a code here can't itself burn it or race another redeemer.
// Still rate-limited per user: without a cap this endpoint is a free
// enumeration oracle for discovering unpublished codes and their
// discount value, gated by nothing but having any real account.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (await isOverPromoValidateRateLimit(user.id)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many promo code checks — try again in a bit." },
      { status: 429 }
    );
  }
  await logAudit({ userId: user.id, action: "billing.promo.validate_attempt" });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createServiceClient();
  const code = parsed.data.code.trim().toUpperCase();
  const { data: promo } = await service
    .from("promo_codes")
    .select("id, discount_type, discount_value, max_redemptions, redemption_count, active")
    .eq("code", code)
    .maybeSingle();

  if (!promo || !promo.active) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 200 });
  }
  if (promo.redemption_count >= promo.max_redemptions) {
    return NextResponse.json({ valid: false, reason: "exhausted" }, { status: 200 });
  }

  const { data: existing } = await service
    .from("promo_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ valid: false, reason: "already_redeemed" }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
  });
}
