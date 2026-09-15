import { cn } from "@/lib/utils";

// Wordmark text only — no icon mark. Theme-swapped between the brand
// kit's light/dark wordmark-only assets (dark surfaces bake "hak" as
// near-white, illegible if rendered on a light background and vice versa).
//
// The source SVGs carry their own raw width/height attributes (620x100) —
// if the stylesheet is ever blocked, delayed, or fails (ad blockers, slow
// connections), a bare <img> falls back to that intrinsic pixel size: a
// 620px-wide banner. Setting explicit width/height HTML attributes (not
// just Tailwind classes) makes the correct small size the default the
// browser uses, with CSS only refining from there.
const SIZES = {
  default: { textW: 198, textH: 32 }, // h-8, text at 620:100 aspect
  sm: { textW: 124, textH: 20 }, // h-5
} as const;

export function Wordmark({ size = "default", className }: { size?: "default" | "sm"; className?: string }) {
  const { textW, textH } = SIZES[size];
  const textClass = size === "sm" ? "h-5" : "h-8";

  return (
    <div className={cn(className)} role="img" aria-label="Hakscan">
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
