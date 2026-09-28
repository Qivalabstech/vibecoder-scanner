import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDnsTxt, checkMetaTag } from "@/lib/verification";
import { isOverVerifyRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export async function POST(_request: Request, ctx: RouteContext<"/api/targets/[id]/verify">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: target } = await supabase.from("targets").select("*").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (target.type !== "site") {
    return NextResponse.json({ error: "not_a_site_target" }, { status: 400 });
  }
  if (target.verified) {
    return NextResponse.json({ target });
  }
  if (!target.verification_token) {
    return NextResponse.json({ error: "no_pending_token" }, { status: 409 });
  }

  if (await isOverVerifyRateLimit(user.id)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many verification checks in the last hour. Try again later." },
      { status: 429 }
    );
  }

  const [dnsOk, metaOk] = await Promise.all([
    checkDnsTxt(target.identifier, target.verification_token),
    checkMetaTag(target.identifier, target.verification_token),
  ]);

  const method = dnsOk ? "dns_txt" : metaOk ? "meta_tag" : null;

  await logAudit({
    userId: user.id,
    targetId: target.id,
    action: method ? "target.verify.success" : "target.verify.pending",
    metadata: { type: "site", identifier: target.identifier, dnsOk, metaOk },
  });

  if (!method) {
    return NextResponse.json(
      { verified: false, message: "Neither the DNS TXT record nor the meta tag was found yet." },
      { status: 200 }
    );
  }

  // The verified flag itself is server-determined (DNS/meta-tag checks
  // above), never client input — and as of migration 0005, `authenticated`
  // no longer has UPDATE privilege on this column at all, so this write
  // must go through the service-role client. Ownership was already
  // confirmed by the RLS-scoped select above returning this row.
  const service = createServiceClient();
  const { data: updated, error } = await service
    .from("targets")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verification_method: method,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[api/targets/verify] update failed:", error.message);
    return NextResponse.json(
      { error: "internal_error", message: "Verified, but couldn't save it. Try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ verified: true, target: updated });
}
