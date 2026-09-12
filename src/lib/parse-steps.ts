/**
 * Splits an AI-generated fix suggestion into discrete, numbered steps for
 * display in the dashboard and PDF report. Handles the formats
 * worker/lib/claude-analysis.ts is prompted to produce (numbered lines)
 * plus a couple of common fallbacks, so older rows written before that
 * prompt change still render sensibly instead of as one dense paragraph.
 */
export function parseFixSteps(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const numbered = trimmed
    .split(/(?:^|\n)\s*\d+[.)]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered;

  const bulleted = trimmed
    .split(/(?:^|\n)\s*[-*]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (bulleted.length > 1) return bulleted;

  const lines = trimmed
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  return [trimmed];
}
