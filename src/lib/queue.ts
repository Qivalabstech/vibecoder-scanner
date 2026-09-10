import { Queue } from "bullmq";
import IORedis from "ioredis";

export const SCAN_QUEUE_NAME = "scans";

export interface ScanJobData {
  targetId: string;
  // Absent for scheduler-fired jobs — the worker creates the scan row itself
  // in that case, after re-checking the target is still verified.
  scanId?: string;
}

const CRON_BY_FREQUENCY = {
  weekly: "0 3 * * 1", // Monday 03:00
  monthly: "0 3 1 * *", // 1st of the month, 03:00
} as const;

export type ScanFrequency = "none" | "weekly" | "monthly";

// Lazy — connecting eagerly at module load fires during `next build`'s page
// -data collection too, before Redis is reachable.
let queue: Queue<ScanJobData> | null = null;

function getQueue() {
  if (!queue) {
    const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    queue = new Queue<ScanJobData>(SCAN_QUEUE_NAME, { connection });
  }
  return queue;
}

// BullMQ priority: unset/0 jobs run before ANY explicitly-prioritized job;
// among prioritized jobs, lower numbers go first. So paid stays unset (front
// of the line) and free gets an explicit low-priority number, rather than
// the more intuitive-looking "give paid priority: 1".
const FREE_TIER_PRIORITY = 10;

export async function enqueueScan(data: ScanJobData, opts: { isPaid: boolean }) {
  await getQueue().add("scan", data, {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 1,
    priority: opts.isPaid ? undefined : FREE_TIER_PRIORITY,
  });
}

/** `frequency: "none"` removes any existing scheduler for this target. */
export async function setScanSchedule(targetId: string, frequency: ScanFrequency) {
  const id = `target-schedule:${targetId}`;
  if (frequency === "none") {
    await getQueue().removeJobScheduler(id);
    return;
  }
  await getQueue().upsertJobScheduler(
    id,
    { pattern: CRON_BY_FREQUENCY[frequency] },
    { name: "scan", data: { targetId } satisfies ScanJobData }
  );
}
