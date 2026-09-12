"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, DollarSign, ShieldHalf, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/pricing", label: "Pricing", icon: DollarSign },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 md:flex">
      <Link href="/admin" className="mb-1 flex items-center gap-2 px-2 font-heading font-medium tracking-tight">
        <ShieldHalf className="size-5 text-primary" strokeWidth={1.75} />
        ADMIN_CONSOLE
      </Link>
      <p className="mb-6 px-2 font-heading text-[10px] tracking-widest text-severity-medium">
        SUPER_ADMIN ACCESS
      </p>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 font-heading text-xs tracking-wide transition-colors",
                active
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard"
          className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </nav>
      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        <SignOutButton />
      </div>
    </aside>
  );
}
