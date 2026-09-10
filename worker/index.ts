import { Worker, Queue, type Job } from "bullmq";
import IORedis from "ioredis";
import { createServiceClient } from "./lib/supabase";
import { logAudit } from "./lib/audit";
import { insertFindings, type InsertedFinding, type Severity } from "./lib/findings";
import { analyzeFindings } from "./lib/claude-analysis";
import { sendScanCompleteEmail } from "./lib/email";
import { runAbuseScan } from "./lib/abuse-monitor";
import { runRepoScan } from "./scanners/repo-scan";
import { runSiteScan } from "./scanners/site-scan";

const SCAN_QUEUE_NAME = "scans";

interface ScanJobData {
  targetId: string;
  // Absent for scheduler-fired jobs (see src/lib/queue.ts setScanSchedule) —
  // this worker creates the scan row itself in that case.
  scanId?: string;
}

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const scanQueue = new Queue(SCAN_QUEUE_NAME, { connection });

async function processScan(job: Job<ScanJobData>) {
  const { targetId } = job.data;
  const service = createServiceClient();
  const isScheduled = !job.data.scanId;

  const { data: target, error: targetError } = await service
    .from("targets")
    .select("*")
    .eq("id", targetId)
    .single();

  if (targetError || !target) {
    throw new Error(`Target ${targetId} not found`);
  }

  if (isScheduled) {
    // A schedule can only be created for a paid plan, but the plan may have
    // lapsed by the time this fires weeks/months later — re-check, and self
    // -cleanup the scheduler rather than failing forever if it has.
    const { data: profile } = await service.from("users").select("plan").eq("id", target.user_id).single();
    if (profile?.plan !== "paid") {
      await scanQueue.removeJobScheduler(`target-schedule:${targetId}`);
      await logAudit({
        userId: target.user_id,
        targetId,
        action: "scan.schedule.cancelled",
        metadata: { reason: "plan_no_longer_paid" },
      });
      return;
    }
  }

  // Belt-and-suspenders: re-check verification even though the API route
  // already enforced it before enqueueing — a job should never run a scan
  // against something that lost its verified status in the meantime.
  if (!target.verified) {
    if (job.data.scanId) {
      await service
        .from("scans")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", job.data.scanId);
    }
    await logAudit({
      userId: target.user_id,
      targetId,
      action: "scan.abort",
      metadata: { scanId: job.data.scanId, reason: "target_not_verified" },
    });
    return;
  }

  const scanId =
    job.data.scanId ??
    (
      await service
        .from("scans")
        .insert({ target_id: targetId, status: "running", started_at: new Date().toISOString() })
        .select()
        .single()
    ).data?.id;

  if (!scanId) throw new Error(`Failed to create scheduled scan row for target ${targetId}`);

  if (job.data.scanId) {
    // manual trigger: row already exists as "queued" — flip it to "running" now.
    // (scheduled trigger already inserted it as "running" above.)
    await service
      .from("scans")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", scanId);
  }

  try {
    const findings =
      target.type === "repo" ? await scanRepo(service, target) : await runSiteScan(target.identifier);

    const inserted = await insertFindings(service, scanId, findings);
    const analysis = await runAiAnalysis(service, scanId, inserted, target.user_id);

    await service
      .from("scans")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", scanId);

    await logAudit({
      userId: target.user_id,
      targetId,
      action: "scan.complete",
      metadata: { scanId, findingCount: findings.length, aiAnalyzed: analysis },
    });

    await notifyScanComplete(service, target.user_id, target.identifier, scanId, "done");
  } catch (err) {
    await service
      .from("scans")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", scanId);
    await logAudit({
      userId: target.user_id,
      targetId,
      action: "scan.failed",
      metadata: { scanId, error: err instanceof Error ? err.message : String(err) },
    });
    await notifyScanComplete(service, target.user_id, target.identifier, scanId, "failed");
    throw err;
  }
}

/**
 * Email is a notification about the scan, not a dependency of it — a send
 * failure (missing RESEND_API_KEY, Resend outage) is logged and swallowed
 * rather than affecting the scan's own success/failure state.
 */
async function notifyScanComplete(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  targetIdentifier: string,
  scanId: string,
  status: "done" | "failed"
) {
  try {
    const { data: profile } = await service.from("users").select("email").eq("id", userId).maybeSingle();
    if (!profile?.email) return;

    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    if (status === "done") {
      const { data: findings } = await service.from("findings").select("severity").eq("scan_id", scanId);
      for (const f of findings ?? []) counts[f.severity as Severity] += 1;
    }

    await sendScanCompleteEmail({ to: profile.email, targetIdentifier, scanId, status, counts });
  } catch (err) {
    await logAudit({
      userId,
      action: "scan.notification_failed",
      metadata: { scanId, error: err instanceof Error ? err.message : String(err) },
    });
  }
}

/**
 * Runs the Claude triage pass over raw findings, then applies it: duplicates
 * and confident false positives are deleted, everything else gets Claude's
 * re-assessed severity plus the plain-language explanation and fix. Falls
 * back to leaving raw findings untouched (with a warning in the audit log)
 * if ANTHROPIC_API_KEY isn't configured or the call fails — a scan finishing
 * with unanalyzed findings is better than one that never finishes.
 */
async function runAiAnalysis(
  service: ReturnType<typeof createServiceClient>,
  scanId: string,
  inserted: InsertedFinding[],
  userId: string
): Promise<boolean> {
  if (inserted.length === 0) return false;

  try {
    const assessments = await analyzeFindings(inserted);
    const toDelete: string[] = [];

    await Promise.all(
      assessments.map(async (a) => {
        if (a.isDuplicate || a.isFalsePositive) {
          toDelete.push(a.id);
          return;
        }
        await service
          .from("findings")
          .update({
            severity: a.severity,
            ai_explanation: a.explanation,
            ai_fix_suggestion: a.fixSuggestion,
          })
          .eq("id", a.id);
      })
    );

    if (toDelete.length > 0) {
      await service.from("findings").delete().in("id", toDelete);
    }

    return true;
  } catch (err) {
    await logAudit({
      userId,
      action: "scan.ai_analysis_skipped",
      metadata: { scanId, error: err instanceof Error ? err.message : String(err) },
    });
    return false;
  }
}

async function scanRepo(service: ReturnType<typeof createServiceClient>, target: { user_id: string; identifier: string }) {
  const { data: connection } = await service
    .from("github_connections")
    .select("access_token")
    .eq("user_id", target.user_id)
    .maybeSingle();

  if (!connection) {
    throw new Error(`No GitHub connection for user ${target.user_id}`);
  }

  return runRepoScan(target.identifier, connection.access_token);
}

const worker = new Worker<ScanJobData>(SCAN_QUEUE_NAME, processScan, {
  connection,
  concurrency: 2, // paid-vs-free ordering comes from job priority (src/lib/queue.ts), not concurrency
});

worker.on("completed", (job) => console.log(`[worker] scan for target ${job.data.targetId} done`));
worker.on("failed", (job, err) => console.error(`[worker] scan for target ${job?.data.targetId} failed:`, err.message));

console.log("[worker] listening for scan jobs on Redis:", process.env.REDIS_URL ?? "redis://localhost:6379");

const ABUSE_SCAN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
  runAbuseScan(createServiceClient()).catch((err) => console.error("[worker] abuse scan failed:", err));
}, ABUSE_SCAN_INTERVAL_MS);
console.log("[worker] abuse monitor running every", ABUSE_SCAN_INTERVAL_MS / 60000, "minutes");
