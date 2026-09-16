import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSuperAdminEmail } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

// Deletes via the Supabase Admin API (auth.users), not a plain table
// delete — public.users.id references auth.users(id) on delete
// cascade, and targets/scans/findings/github_connections all cascade
// from there (migration 0001/0002), so this one call tears down
// everything the user owns. Lets them sign up again from scratch with
// the same email/GitHub account instead of being stuck on whatever
// the free-plan single-target limit already used up.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: target } = await service.from("users").select("email").eq("id", id).single();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Never let this delete another admin's account, including your own —
  // the allowlist is an env var, not something recoverable from inside
  // the app if the wrong account got deleted.
  if (isSuperAdminEmail(target.email)) {
    return NextResponse.json(
      { error: "cannot_delete_admin", message: "Can't delete an admin account from here." },
      { status: 403 }
    );
  }

  const { error } = await service.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit({
    userId: null,
    action: "admin.user.deleted",
    metadata: { deletedUserId: id, deletedUserEmail: target.email, byUserId: user.id, byUserEmail: user.email },
  });

  return NextResponse.json({ ok: true });
}
