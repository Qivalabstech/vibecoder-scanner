import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// `next` comes from a query param on a link a user could receive from
// anywhere (a phishing email included) — must be a same-origin relative
// path, or this becomes an open redirect for a real, signed-in session
// straight off a legitimate-looking hakscan.online/auth/callback URL.
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/dashboard";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Persist the GitHub provider token server-side — Supabase doesn't keep it
  // around after this redirect, and Phase 2's repo-verification flow needs it
  // to list repos the user actually administers.
  const { provider_token, provider_refresh_token, user } = data.session;
  if (provider_token && user.app_metadata.provider === "github") {
    const service = createServiceClient();
    await service.from("github_connections").upsert({
      user_id: user.id,
      access_token: provider_token,
      github_login: user.user_metadata.user_name ?? null,
      updated_at: new Date().toISOString(),
    });
    void provider_refresh_token; // GitHub OAuth apps don't issue refresh tokens by default
  }

  return NextResponse.redirect(`${origin}${next}`);
}
