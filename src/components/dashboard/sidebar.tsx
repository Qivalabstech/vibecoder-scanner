"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Target, ShieldHalf, CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export function DashboardSidebar({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card/40 p-4 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2 font-heading font-medium tracking-tight">
        <ShieldHalf className="size-5 text-primary" strokeWidth={1.75} />
        Vibecoder Scanner
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-severity-medium transition-colors hover:bg-severity-medium/10"
          >
            <Lock className="size-4" />
            Admin console
          </Link>
        )}
      </nav>
      <div className="mt-auto space-y-2 border-t border-border/60 pt-4">
        <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
