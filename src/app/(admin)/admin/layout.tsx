import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdminEmail } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar email={user.email ?? ""} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
