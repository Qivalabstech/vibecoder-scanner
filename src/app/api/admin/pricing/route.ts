import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const bodySchema = z.object({ proPriceUsd: z.number().min(0) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Never trust the layout's redirect alone — this route is reachable
  // directly, so it re-checks admin status itself (same pattern as every
  // other server-validated write in this app).
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("pricing_config")
    .update({ pro_price_usd: parsed.data.proPriceUsd, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    userId: user.id,
    action: "admin.pricing.updated",
    metadata: { proPriceUsd: parsed.data.proPriceUsd },
  });

  return NextResponse.json({ ok: true });
}
