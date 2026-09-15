import { cn } from "@/lib/utils";

// The brand kit's stacked lockup is a single SVG baked for dark surfaces
// only ("hak" filled near-white) — illegible once light mode is reachable.
// Built as mark + theme-swapped wordmark text instead, using the kit's
// separate light/dark wordmark-only assets.
//
// The source SVGs carry their own raw width/height attributes (100x100 for
// the mark, 620x100 for the wordmark text) — if the stylesheet is ever
// blocked, delayed, or fails (ad blockers, slow connections), a bare <img>
// falls back to those intrinsic pixel sizes: a 620px-wide text banner
// under a 100px icon, badly "out of place". Setting explicit width/height
// HTML attributes (not just Tailwind classes) makes the correct small size
// the default the browser uses, with CSS only refining from there.
const SIZES = {
  default: { mark: 56, textW: 198, textH: 32 }, // h-14 / h-8, text at 620:100 aspect
  sm: { mark: 36, textW: 124, textH: 20 }, // h-9 / h-5
} as const;

export function Wordmark({ size = "default", className }: { size?: "default" | "sm"; className?: string }) {
  const { mark, textW, textH } = SIZES[size];
  const markClass = size === "sm" ? "h-9" : "h-14";
  const textClass = size === "sm" ? "h-5" : "h-8";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} role="img" aria-label="Hakscan">
      <img
        src="/brand/mark.svg"
        alt=""
        aria-hidden
        width={mark}
        height={mark}
        className={cn(markClass, "w-auto")}
      />
      <img
        src="/brand/wordmark-only-dark.svg"
        alt=""
        aria-hidden
        width={textW}
        height={textH}
        className={cn(textClass, "hidden w-auto dark:block")}
      />
      <img
        src="/brand/wordmark-only-light.svg"
        alt=""
        aria-hidden
        width={textW}
        height={textH}
        className={cn(textClass, "block w-auto dark:hidden")}
      />
    </div>
  );
}
