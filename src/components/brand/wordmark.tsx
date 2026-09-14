import { cn } from "@/lib/utils";

// The brand kit's stacked lockup is a single SVG baked for dark surfaces
// only ("hak" filled near-white) — illegible once light mode is reachable.
// Built as mark + theme-swapped wordmark text instead, using the kit's
// separate light/dark wordmark-only assets.
export function Wordmark({ size = "default", className }: { size?: "default" | "sm"; className?: string }) {
  const markClass = size === "sm" ? "h-9" : "h-14";
  const textClass = size === "sm" ? "h-5" : "h-8";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)} role="img" aria-label="Hakscan">
      <img src="/brand/mark.svg" alt="" aria-hidden className={cn(markClass, "w-auto")} />
      <img
        src="/brand/wordmark-only-dark.svg"
        alt=""
        aria-hidden
        className={cn(textClass, "hidden w-auto dark:block")}
      />
      <img
        src="/brand/wordmark-only-light.svg"
        alt=""
        aria-hidden
        className={cn(textClass, "block w-auto dark:hidden")}
      />
    </div>
  );
}
