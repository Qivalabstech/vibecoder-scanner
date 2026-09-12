import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldHalf } from "lucide-react";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      {/* status strip — the "this is a console" tell before anything else loads */}
      <div className="border-b border-border/60 bg-secondary/40 px-6 py-1">
        <div className="mx-auto flex max-w-6xl items-center gap-2 font-heading text-[11px] tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary animate-pulse" />
          <span>OPERATOR CONSOLE // STATUS: ONLINE</span>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-heading font-medium tracking-tight">
          <ShieldHalf className="size-5 text-primary" strokeWidth={1.75} />
          <span>VIBECODER_SCANNER</span>
        </Link>
        <nav className="hidden items-center gap-8 font-heading text-xs tracking-wide text-muted-foreground md:flex">
          <Link href="#how-it-works" className="hover:text-primary transition-colors">
            [ HOW_IT_WORKS ]
          </Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">
            [ PRICING ]
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button render={<Link href="/signup" />}>Start a free scan</Button>
        </div>
      </div>
    </header>
  );
}
