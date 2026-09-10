import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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
