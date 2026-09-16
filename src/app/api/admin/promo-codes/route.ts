import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "letters, numbers, - and _ only"),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  paypalPlanId: z.string().trim().min(1),
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

  const service = createServiceClient();
  const { data: promo, error } = await service
    .from("promo_codes")
    .insert({
      code: parsed.data.code.toUpperCase(),
      discount_type: parsed.data.discountType,
      discount_value: parsed.data.discountValue,
      paypal_plan_id: parsed.data.paypalPlanId,
      max_redemptions: parsed.data.maxRedemptions,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "code_taken", message: "That code already exists." }, { status: 409 });
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
