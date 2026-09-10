import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listAdminRepos } from "@/lib/github";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: connection } = await service
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json(
      { error: "no_github_connection", message: "Sign in with GitHub to list repos." },
      { status: 409 }
    );
  }

  try {
    const repos = await listAdminRepos(connection.access_token);
    return NextResponse.json({
      repos: repos.map((r) => ({
        fullName: r.full_name,
        private: r.private,
        htmlUrl: r.html_url,
      })),
    });
  } catch {
    return NextResponse.json({ error: "github_api_error" }, { status: 502 });
  }
}
