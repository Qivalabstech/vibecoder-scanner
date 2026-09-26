// The official mark from the brand kit (svg/mark.svg) — inlined rather
// than referenced as an <img> so it never needs a network request and
// always renders pixel-identical regardless of viewer/OS. Colors are
// the brand kit's fixed hex values (teal #00D9B5, amber #FBBF24), not
// theme tokens — the guidelines are explicit that the mark's original
// colors and proportions are never substituted or distorted.
export function HakscanMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill="none" stroke="#00D9B5" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 18 42 L 18 18 L 42 18" />
        <path d="M 82 58 L 82 82 L 58 82" />
      </g>
      <line x1={29} y1={71} x2={63} y2={37} stroke="#00D9B5" strokeWidth={5} strokeLinecap="round" />
      <circle cx={70} cy={30} r={7} fill="#FBBF24" />
    </svg>
  );
}
