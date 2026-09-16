import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import { isSuperAdminEmail } from "@/lib/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = isSuperAdminEmail(user.email);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardMobileNav email={user.email ?? ""} isAdmin={isAdmin} />
      <DashboardSidebar email={user.email ?? ""} isAdmin={isAdmin} />
      <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
