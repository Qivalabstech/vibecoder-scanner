# Design

Source of truth: `src/app/globals.css`. Values below are pulled directly
from it — don't hand-edit a hex code here without updating that file too.

## Product stance

Dark-mode-first (security-tool audience skews dark-mode). Light mode exists
but is the secondary path — see `:root` vs `.dark` below.

**2026-09-12 redesign**: shifted from a generic violet/indigo SaaS palette
to an "operator console" identity — the site should read as an elite
red-team/pentest outfit's own tooling, not a generic security SaaS. Signal
hue is phosphor terminal-green (~152° OKLCH) instead of violet; it leaks
faintly into all dark-mode neutrals (background/card/border tints) rather
than sitting as an isolated brand color on top of gray, so the whole UI
reads as "one system." Severity colors (red→amber→blue) are untouched —
they're semantic, not brand, and 152° is far enough from all of them (27,
45/50, 90/92, 230) to never collide. `font-heading` was repointed from
`--font-sans` to `--font-geist-mono` — every card title, dialog title, and
page `<h1>` that already used the `font-heading` utility class picked this
up for free; this one token change does most of the "terminal ops" work.
Border radius dropped from `0.75rem` to `0.4rem` (hairline/sharp instead of
soft-SaaS-rounded).

## Color tokens (OKLCH)

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.995 0 0)` | `oklch(0.12 0.012 152)` (near-black, faint green tint) |
| `--foreground` | `oklch(0.16 0.02 152)` | `oklch(0.94 0.015 152)` |
| `--primary` | `oklch(0.5 0.15 152)` | `oklch(0.8 0.19 152)` (phosphor terminal green) |
| `--card` | `oklch(1 0 0)` | `oklch(0.155 0.014 152)` |
| `--border` | `oklch(0.9 0.01 152)` | `oklch(0.85 0.05 152 / 12%)` |
| `--radius` | `0.4rem` (base; `sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl` scale off this) | |

## Severity colors (semantic, not brand)

| Severity | Token | Light | Dark |
|---|---|---|---|
| Critical | `--severity-critical` | `oklch(0.58 0.22 27)` (red) | `oklch(0.7 0.19 22)` |
| High | `--severity-high` | `oklch(0.68 0.19 45)` (orange) | `oklch(0.75 0.16 50)` |
| Medium | `--severity-medium` | `oklch(0.8 0.16 90)` (amber) | `oklch(0.84 0.15 92)` |
| Low | `--severity-low` | `oklch(0.6 0.12 230)` (blue) | `oklch(0.72 0.11 230)` |

Used via `src/lib/severity.ts` (`SEVERITY_TEXT_CLASS`, `SEVERITY_BG_CLASS`,
`SEVERITY_LABEL`, `SEVERITY_ORDER`) and mirrored as hex in
`src/lib/pdf-report.tsx` (`SEVERITY_HEX`) since `@react-pdf/renderer` can't
consume CSS variables.

## Typography

Geist Sans (`--font-geist-sans`) for body copy, Geist Mono
(`--font-geist-mono`) for **all headings, nav, labels, and eyebrows** as of
the 2026-09-12 redesign — `--font-heading` now aliases to
`--font-geist-mono` instead of `--font-sans`. This is the single type
decision that carries the "operator console" personality: body text stays
readable in Sans, but anything structural (page titles, card titles, nav
items, status chips) renders in mono, uppercase-and-bracketed where it
reads as a console label (`[ HOW_IT_WORKS ]`, `SANDBOX_WORKER // LIVE`).
Both fonts loaded via `next/font` in `src/app/layout.tsx`.

## Component conventions

- shadcn/ui (Base UI) primitives in `src/components/ui/` — don't hand-roll a
  button/card/badge/etc. that duplicates one already there.
- Feature components split by domain: `components/auth/`,
  `components/dashboard/`, `components/marketing/`, `components/three/`.
- Cards for grouped content, `Badge` for status/severity chips, `Button`
  `variant="outline"` for secondary actions.

## Motion conventions

- Framer Motion for entrance animations (`initial`/`animate` fade+slide,
  `duration: 0.35–0.6s`) and the expandable `FindingCard`.
- `prefers-reduced-motion: reduce` is handled at two levels: a global CSS
  rule in `globals.css` collapses transition/animation durations for
  anything CSS-driven, and `useReducedMotion()` (via `useSyncExternalStore`)
  gates the JS-driven 3D scene specifically.
- The 3D scan globe (`src/components/three/scan-globe-scene.tsx`) is the one
  "hero" motion piece — subtle auto-rotation + cursor-reactive parallax +
  a pulsing scan-ring. Recolored to phosphor green (`#3ef08c`) for the
  2026-09-12 redesign; everything else in the product is restrained,
  functional micro-interaction, not spectacle.
- **`ScanProgressAnimation`** (`src/components/dashboard/scan-progress-animation.tsx`),
  added 2026-09-12, replaces the old static "scan in progress" placeholder
  card on `/scans/[id]`. Shown only while `status` is `queued`/`running`.
  It's a terminal-feed of plausible in-flight steps (different line sets
  for `repo` vs `site` targets, mirroring what `worker/scanners/*.ts`
  actually does) streamed in on a timer, plus a small rotating radar-sweep
  icon and a blinking cursor. This is explicitly **illustrative, not real
  log tailing** — the worker doesn't stream live output to the browser —
  so the copy narrates the shape of the work without claiming to be actual
  tool stdout. Respects `useReducedMotion()`: renders every line at once,
  no cursor blink, no radar rotation.
- `TypedText` (`src/components/typed-text.tsx`): shared one-line terminal
  typewriter effect, used for the hero's boot-sequence line and reusable
  anywhere else a single line should "type in." Skips straight to full text
  under reduced motion.

## Theme switching

Defaults to dark unless the visitor has explicitly chosen light
(`localStorage.theme === "light"`), applied via an inline `<script>` in
`src/app/layout.tsx` before paint to avoid a flash. No in-app theme toggle
exists yet — the CSS supports both, but there's no UI control for it.
