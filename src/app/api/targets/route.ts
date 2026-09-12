import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyRepoAccess } from "@/lib/github";
import { generateVerificationToken, normalizeSiteIdentifier } from "@/lib/verification";
import { logAudit } from "@/lib/audit";
import { isSuperAdminEmail } from "@/lib/admin";

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("repo"),
    fullName: z.string().regex(/^[^/\s]+\/[^/\s]+$/, "expected 'owner/repo'"),
    authorizationAttested: z.literal(true),
  }),
  z.object({
    type: z.literal("site"),
    url: z.string().min(3),
    authorizationAttested: z.literal(true),
  }),
]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ targets: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  const service = createServiceClient();

  // Free tier: 1 target (Phase 7 pricing gate, enforced here rather than trusting the UI).
  // Super admins (env-allowlisted, see src/lib/admin.ts) are exempt — they need to
  // connect arbitrary repos to verify scans without going through billing.
  const isAdmin = isSuperAdminEmail(user.email);
  const { data: profile } = await service.from("users").select("plan").eq("id", user.id).single();
  const { count } = await supabase.from("targets").select("*", { count: "exact", head: true });
  if (!isAdmin && profile?.plan === "free" && (count ?? 0) >= 1) {
    return NextResponse.json(
      { error: "plan_limit", message: "Free plan allows 1 target. Upgrade to add more." },
      { status: 402 }
    );
  }

  if (body.type === "repo") {
    const { data: connection } = await service
      .from("github_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json(
        { error: "no_github_connection", message: "Connect GitHub before adding a repo." },
        { status: 409 }
      );
    }

    // Never trust that the client only submitted a repo it was shown —
    // re-check admin/push access against the live GitHub API.
    const hasAccess = await verifyRepoAccess(connection.access_token, body.fullName);
    if (!hasAccess) {
      await logAudit({
        userId: user.id,
        action: "target.verify.denied",
        metadata: { type: "repo", identifier: body.fullName, reason: "no_admin_access" },
      });
      return NextResponse.json(
        { error: "not_authorized", message: "You don't have admin/write access to this repo." },
        { status: 403 }
      );
    }

    // Written via the service-role client, not the RLS-scoped one: `verified`
    // and `verification_method` are server-determined by the GitHub check
    // just above, not client input — and as of migration 0007,
    // `authenticated` has no INSERT privilege on `targets` at all.
    const { data: target, error } = await service
      .from("targets")
      .insert({
        user_id: user.id,
        type: "repo",
        identifier: body.fullName,
        verified: true,
        verified_at: new Date().toISOString(),
        verification_method: "github_oauth",
        authorization_attested: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      userId: user.id,
      targetId: target.id,
      action: "target.verify.success",
      metadata: { type: "repo", identifier: body.fullName, method: "github_oauth" },
    });

    return NextResponse.json({ target }, { status: 201 });
  }

  // type === "site" — created unverified, pending DNS TXT / meta-tag challenge
  const identifier = normalizeSiteIdentifier(body.url);
  const token = generateVerificationToken();

  // Service-role client — see the repo-branch comment above; `authenticated`
  // has no INSERT privilege on `targets` as of migration 0007.
  const { data: target, error } = await service
    .from("targets")
    .insert({
      user_id: user.id,
      type: "site",
      identifier,
      verified: false,
      verification_token: token,
      authorization_attested: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    userId: user.id,
    targetId: target.id,
    action: "target.create.pending_verification",
    metadata: { type: "site", identifier },
  });

  return NextResponse.json({ target }, { status: 201 });
}
