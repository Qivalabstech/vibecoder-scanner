import Link from "next/link";
import { ShieldHalf } from "lucide-react";
import { ScanVisual } from "@/components/three/scan-visual";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-b from-card to-background lg:flex">
        <div className="absolute inset-0 -z-0 opacity-70">
          <ScanVisual className="size-full" />
        </div>
        <div className="relative z-10 max-w-sm px-10 text-center">
          <ShieldHalf className="mx-auto mb-6 size-10 text-primary" strokeWidth={1.5} />
          <p className="text-lg font-medium text-foreground/90">
            Every scan starts with proof it&apos;s yours to scan.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ownership verification is enforced at the API layer, not just the UI.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 font-semibold tracking-tight lg:hidden">
            <ShieldHalf className="size-5 text-primary" strokeWidth={1.75} />
            Vibecoder Scanner
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
