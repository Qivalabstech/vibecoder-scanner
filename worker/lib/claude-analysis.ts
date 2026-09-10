import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { InsertedFinding, Severity } from "./findings";

const SEVERITIES: [Severity, ...Severity[]] = ["critical", "high", "medium", "low"];

const AnalysisSchema = z.object({
  assessments: z.array(
    z.object({
      id: z.string().describe("the finding's id, copied verbatim from the input"),
      isDuplicate: z
        .boolean()
        .describe("true if this is the same underlying issue as another finding in this batch"),
      isFalsePositive: z.boolean().describe("true if this is very likely not a real issue"),
      severity: z.enum(SEVERITIES).describe("CVSS-informed severity, re-assessed from context"),
      explanation: z
        .string()
        .describe("plain-language business-impact explanation for a non-security-expert founder"),
      fixSuggestion: z.string().describe("a concrete, specific code-level fix"),
    })
  ),
});

export type FindingAssessment = z.infer<typeof AnalysisSchema>["assessments"][number];

const SYSTEM_PROMPT = `You are a senior application security engineer triaging automated scanner output \
(Semgrep, Gitleaks, or OWASP ZAP baseline) for indie founders who built their app with AI assistance and \
have little security background.

For every finding in the batch:
- Mark isDuplicate=true if it's the same underlying issue as another finding already in this batch (keep \
the clearest one as the non-duplicate).
- Mark isFalsePositive=true only when you're confident it's very likely not a real issue (e.g. a secret \
pattern matching test fixtures, a sink that's actually sanitized upstream) — when unsure, leave it false \
rather than risk hiding a real problem.
- Re-assess severity using CVSS-style reasoning about real-world exploitability and impact, not just the \
raw tool's default.
- Write explanation in plain language: what could actually go wrong, in terms of business impact (data \
exposure, account takeover, financial loss), not jargon.
- Write fixSuggestion as a specific, actionable code-level fix — not generic advice.

Return one assessment per input finding, in any order, each carrying the input finding's id unchanged.`;

/** Batches findings to stay well under a single request's practical size. */
const BATCH_SIZE = 40;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function analyzeFindings(findings: InsertedFinding[]): Promise<FindingAssessment[]> {
  if (findings.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set — skipping AI analysis");
  }

  const client = new Anthropic();
  const batches = chunk(findings, BATCH_SIZE);
  const results: FindingAssessment[] = [];

  for (const batch of batches) {
    const input = batch.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      filePath: f.file_path,
      lineNumber: f.line_number,
      rawSeverity: f.severity,
    }));

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(input, null, 2) }],
      output_config: { format: zodOutputFormat(AnalysisSchema) },
    });

    if (!response.parsed_output) {
      throw new Error(`Claude analysis returned unparseable output (stop_reason: ${response.stop_reason})`);
    }
    results.push(...response.parsed_output.assessments);
  }

  return results;
}
