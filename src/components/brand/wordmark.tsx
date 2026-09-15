import { cn } from "@/lib/utils";

// Real text, not an image. The wordmark-only-*.svg assets (still in
// public/brand/ in case something needs a static image export later)
// reference font-family="JetBrains Mono" but never embed it — loaded as a
// standalone <img> document, they can't inherit the page's actual loaded
// font, so different browsers/systems substitute different fallback
// fonts with different character widths. That's what caused the
// wordmark to visually center correctly in some environments and not
// others, no matter how tightly the SVG canvas was cropped. The page
// already loads real JetBrains Mono via next/font/local as --font-jbm
// (font-heading) — rendering the two colors as plain text sidesteps the
// whole class of image/font-substitution bugs entirely.
const SIZES = {
  default: "text-3xl",
  sm: "text-xl",
} as const;

export function Wordmark({ size = "default", className }: { size?: "default" | "sm"; className?: string }) {
  return (
    <p className={cn("font-heading font-bold tracking-tight text-foreground", SIZES[size], className)}>
      hak<span className="text-primary">scan</span>
    </p>
  );
}
