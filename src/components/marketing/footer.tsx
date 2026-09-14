import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
        <Link href="/" className="flex items-center gap-2 font-heading text-sm font-medium tracking-tight">
          <img src="/brand/mark.svg" alt="" className="size-4" />
          HAKSCAN
        </Link>
        <div className="text-sm text-muted-foreground">
          Hakscan requires an ownership attestation before every scan. See our{" "}
          <Link href="/legal/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </Link>
          .
        </div>
      </div>
    </footer>
  );
}
