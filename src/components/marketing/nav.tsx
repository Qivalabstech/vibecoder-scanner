"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MarketingNav() {
  const navRef = useRef<HTMLDivElement>(null);
  const [spotlightX, setSpotlightX] = useState<number | null>(null);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      {/* status strip — the "this is a console" tell before anything else loads */}
      <div className="border-b border-border/60 bg-secondary/40 px-6 py-1">
        <div className="mx-auto flex max-w-6xl items-center gap-2 font-heading text-[11px] tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary animate-pulse" />
          <span>OPERATOR CONSOLE // STATUS: ONLINE</span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading font-medium tracking-tight">
          <img src="/brand/mark.svg" alt="" width={20} height={20} className="size-5" />
          <span>HAKSCAN</span>
        </Link>
        <nav
          ref={navRef}
          onMouseMove={(e) => {
            const rect = navRef.current?.getBoundingClientRect();
            if (rect) setSpotlightX(e.clientX - rect.left);
          }}
          onMouseLeave={() => setSpotlightX(null)}
          className="relative hidden items-center gap-8 rounded-full font-heading text-xs tracking-wide text-muted-foreground md:flex"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300"
            style={{
              opacity: spotlightX === null ? 0 : 1,
              background: `radial-gradient(80px circle at ${spotlightX ?? 0}px 0%, var(--color-primary) 0%, transparent 70%)`,
            }}
          />
          <Link href="#how-it-works" className="hover:text-primary transition-colors">
            [ HOW_IT_WORKS ]
          </Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">
            [ PRICING ]
          </Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle className="max-sm:size-7" />
          <Button variant="ghost" className="max-sm:h-7 max-sm:px-2 max-sm:text-xs" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button className="max-sm:h-7 max-sm:px-2 max-sm:text-xs" render={<Link href="/signup" />}>
            <span className="sm:hidden">Scan free</span>
            <span className="hidden sm:inline">Start a free scan</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
