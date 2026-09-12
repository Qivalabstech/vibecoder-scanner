import { mkdtemp, readFile, rm, chmod } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { dockerRun } from "../lib/docker-run";
import type { NormalizedFinding, Severity } from "../lib/findings";

interface ZapAlert {
  pluginid: string;
  name: string;
  riskcode: string; // "0".."3"
  desc: string;
  solution: string;
  instances: { uri: string }[];
}

interface ZapReport {
  site: { alerts: ZapAlert[] }[];
}

const ZAP_RISK_SEVERITY: Record<string, Severity> = {
  "3": "critical",
  "2": "high",
  "1": "medium",
  "0": "low",
};

// ZAP's desc/solution fields carry HTML markup meant for its own HTML
// report — strip tags before showing as plain text in the raw-finding
// fallback (before AI analysis rewrites it anyway).
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ZAP baseline scan: passive checks only against the crawled pages, never
 * active exploitation or fuzzing (Phase 8's non-negotiable). Runs against
 * whatever network the target needs, since it has to reach it.
 */
export async function runSiteScan(url: string): Promise<NormalizedFinding[]> {
  const outDir = await mkdtemp(path.join(tmpdir(), "hakscan-zap-"));
  await chmod(outDir, 0o777); // ZAP's container runs as a non-root user

  try {
    const reportName = "zap-report.json";
    await dockerRun({
      image: "zaproxy/zap-stable",
      args: [
        "zap-baseline.py",
        "-t",
        url,
        "-J",
        reportName,
        "-m",
        "5", // max crawl time in minutes
      ],
      mounts: [{ hostPath: outDir, containerPath: "/zap/wrk" }],
      network: "bridge",
      timeoutMs: 8 * 60 * 1000,
    });

    const raw = await readFile(path.join(outDir, reportName), "utf-8");
    const report = JSON.parse(raw) as ZapReport;
    const alerts = report.site?.flatMap((s) => s.alerts) ?? [];

    return alerts.map((a) => ({
      severity: ZAP_RISK_SEVERITY[a.riskcode] ?? "low",
      title: a.name,
      description: [
        stripHtml(a.desc),
        a.solution ? `Suggested fix: ${stripHtml(a.solution)}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      filePath: a.instances[0]?.uri,
      rawToolOutput: a,
    }));
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}
