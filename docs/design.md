# Design

Source of truth: `src/app/globals.css`. Values below are pulled directly
from it — don't hand-edit a hex code here without updating that file too.

## Product stance

Dark-mode-first (security-tool audience skews dark-mode). Light mode exists
but is the secondary path — see `:root` vs `.dark` below. Restrained palette:
one accent hue (violet/indigo, ~280° in OKLCH) plus neutral grays; severity
colors are the one place hue variety is deliberate, because the convention
(red→amber→blue) carries real meaning.

## Color tokens (OKLCH)

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.995 0 0)` | `oklch(0.135 0.006 280)` (near-black, not pure black) |
| `--foreground` | `oklch(0.16 0.01 280)` | `oklch(0.96 0.005 280)` |
| `--primary` | `oklch(0.55 0.19 280)` | `oklch(0.72 0.16 280)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.17 0.007 280)` |
| `--border` | `oklch(0.91 0.005 280)` | `oklch(1 0 0 / 9%)` |
| `--radius` | `0.75rem` (base; `sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl` scale off this) | |

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

Geist Sans (`--font-geist-sans`) for UI text, Geist Mono
(`--font-geist-mono`) for code/technical content, loaded via `next/font` in
`src/app/layout.tsx`. No separate heading font — `--font-heading` aliases to
`--font-sans`.

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
  a pulsing scan-ring. Everything else in the product is restrained,
  functional micro-interaction, not spectacle.

## Theme switching

Defaults to dark unless the visitor has explicitly chosen light
(`localStorage.theme === "light"`), applied via an inline `<script>` in
`src/app/layout.tsx` before paint to avoid a flash. No in-app theme toggle
exists yet — the CSS supports both, but there's no UI control for it.
