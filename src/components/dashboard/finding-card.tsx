"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Wrench, Code2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/dashboard/severity-badge";
import type { Severity } from "@/lib/severity";
import { parseFixSteps } from "@/lib/parse-steps";
import { cn } from "@/lib/utils";

export interface FindingRow {
  id: string;
  severity: Severity;
  title: string;
  description: string | null;
  file_path: string | null;
  line_number: number | null;
  raw_tool_output: unknown;
  ai_explanation: string | null;
  ai_fix_suggestion: string | null;
}

export function FindingCard({ finding }: { finding: FindingRow }) {
  const [open, setOpen] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const analyzed = Boolean(finding.ai_explanation);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <SeverityBadge severity={finding.severity} />
        <span className="flex-1 truncate font-medium">{finding.title}</span>
        {finding.file_path && (
          <span className="hidden truncate text-xs text-muted-foreground sm:block">
            {finding.file_path}
            {finding.line_number ? `:${finding.line_number}` : ""}
          </span>
        )}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <CardContent className="space-y-4 border-t border-border pt-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                What this means
              </p>
              <p className="text-sm leading-relaxed">
                {finding.ai_explanation ?? finding.description ?? "No description available."}
              </p>
              {!analyzed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  This finding hasn&apos;t been analyzed by AI yet, showing the raw scanner output.
                </p>
              )}
            </div>

            {finding.ai_fix_suggestion && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Wrench className="size-3.5" />
                  Steps to fix this
                </p>
                <ol className="space-y-2">
                  {parseFixSteps(finding.ai_fix_suggestion).map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-heading text-[11px] text-primary">
                        {i + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowTechnical((s) => !s)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Code2 className="size-3.5" />
                {showTechnical ? "Hide" : "Show"} technical details
              </button>
              {showTechnical && (
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {JSON.stringify(
                    {
                      filePath: finding.file_path,
                      lineNumber: finding.line_number,
                      rawToolOutput: finding.raw_tool_output,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </CardContent>
        </motion.div>
      )}
    </Card>
  );
}
