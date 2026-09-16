"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Target, CreditCard, Lock, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export function DashboardMobileNav({ email, isAdmin }: { email: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 md:hidden">
      <Link href="/" className="font-heading font-medium tracking-tight">
        Hakscan
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col p-4">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>Hakscan</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-1 flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary bg-accent text-accent-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-severity-medium transition-colors hover:bg-severity-medium/10"
              >
                <Lock className="size-4" />
                Admin console
              </Link>
            )}
          </nav>
          <div className="mt-auto space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between gap-2 px-2">
              <p className="truncate text-xs text-muted-foreground">{email}</p>
              <ThemeToggle />
            </div>
            <SignOutButton />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
