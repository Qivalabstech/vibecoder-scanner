import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: promo, error } = await service
    .from("promo_codes")
    .update({ active: parsed.data.active })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    userId: user.id,
    action: parsed.data.active ? "admin.promo_code.reactivated" : "admin.promo_code.deactivated",
    metadata: { code: promo.code },
  });

  return NextResponse.json({ promo });
}
