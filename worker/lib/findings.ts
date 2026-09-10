import type { createServiceClient } from "./supabase";

export type Severity = "critical" | "high" | "medium" | "low";

export interface NormalizedFinding {
  severity: Severity;
  title: string;
  description?: string;
  filePath?: string;
  lineNumber?: number;
  rawToolOutput: unknown;
}

export interface InsertedFinding {
  id: string;
  severity: Severity;
  title: string;
  description: string | null;
  file_path: string | null;
  line_number: number | null;
}

export async function insertFindings(
  service: ReturnType<typeof createServiceClient>,
  scanId: string,
  findings: NormalizedFinding[]
): Promise<InsertedFinding[]> {
  if (findings.length === 0) return [];
  const { data, error } = await service
    .from("findings")
    .insert(
      findings.map((f) => ({
        scan_id: scanId,
        severity: f.severity,
        title: f.title,
        description: f.description ?? null,
        file_path: f.filePath ?? null,
        line_number: f.lineNumber ?? null,
        raw_tool_output: f.rawToolOutput as object,
      }))
    )
    .select("id, severity, title, description, file_path, line_number");
  if (error) throw new Error(`Failed to insert findings: ${error.message}`);
  return data ?? [];
}
