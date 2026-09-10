import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { dockerRun } from "../lib/docker-run";
import type { NormalizedFinding, Severity } from "../lib/findings";

const execFileAsync = promisify(execFile);

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number };
  extra: { message: string; severity: "ERROR" | "WARNING" | "INFO"; metadata?: Record<string, unknown> };
}

interface GitleaksResult {
  Description: string;
  File: string;
  StartLine: number;
  RuleID: string;
  Match: string;
}

const SEMGREP_SEVERITY: Record<SemgrepResult["extra"]["severity"], Severity> = {
  ERROR: "high",
  WARNING: "medium",
  INFO: "low",
};

/**
 * Clones the repo shallowly with a short-lived token, runs Semgrep + Gitleaks
 * each in their own auto-removed Docker container, then deletes the clone.
 * Nothing here ever touches the host filesystem outside the temp dir.
 */
export async function runRepoScan(fullName: string, accessToken: string): Promise<NormalizedFinding[]> {
  const workDir = await mkdtemp(path.join(tmpdir(), "vibecoder-scan-"));
  const repoDir = path.join(workDir, "repo");

  try {
    const cloneUrl = `https://x-access-token:${accessToken}@github.com/${fullName}.git`;
    await execFileAsync("git", ["clone", "--depth", "1", cloneUrl, repoDir], { timeout: 2 * 60 * 1000 });

    const [semgrepFindings, gitleaksFindings] = await Promise.all([
      runSemgrep(repoDir),
      runGitleaks(repoDir),
    ]);

    return [...semgrepFindings, ...gitleaksFindings];
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function runSemgrep(repoDir: string): Promise<NormalizedFinding[]> {
  const { stdout } = await dockerRun({
    image: "semgrep/semgrep",
    // `--config auto` pulls Semgrep's registry rules, which needs egress —
    // the one deliberate exception to network-none for this scan.
    args: ["semgrep", "--config", "auto", "--json", "--quiet", "/src"],
    mounts: [{ hostPath: repoDir, containerPath: "/src", readOnly: true }],
    network: "bridge",
    timeoutMs: 4 * 60 * 1000,
  });

  let results: SemgrepResult[] = [];
  try {
    results = (JSON.parse(stdout).results as SemgrepResult[]) ?? [];
  } catch {
    return [];
  }

  return results.map((r) => ({
    severity: SEMGREP_SEVERITY[r.extra.severity] ?? "low",
    title: r.check_id.split(".").pop() ?? r.check_id,
    description: r.extra.message,
    filePath: r.path,
    lineNumber: r.start.line,
    rawToolOutput: r,
  }));
}

async function runGitleaks(repoDir: string): Promise<NormalizedFinding[]> {
  const reportName = "gitleaks-report.json";
  await dockerRun({
    image: "zricethezav/gitleaks",
    args: [
      "detect",
      "--source=/repo",
      "--no-git",
      "--report-format=json",
      `--report-path=/repo/${reportName}`,
      "--exit-code=0",
    ],
    mounts: [{ hostPath: repoDir, containerPath: "/repo" }],
    network: "none",
    timeoutMs: 2 * 60 * 1000,
  });

  try {
    const raw = await readFile(path.join(repoDir, reportName), "utf-8");
    const results = JSON.parse(raw) as GitleaksResult[];
    return results.map((r) => ({
      // a leaked secret is critical by definition, regardless of what tool found it
      severity: "critical" as const,
      title: `Leaked secret: ${r.RuleID}`,
      description: r.Description,
      filePath: r.File,
      lineNumber: r.StartLine,
      rawToolOutput: r,
    }));
  } catch {
    return []; // no report file means no findings
  }
}
