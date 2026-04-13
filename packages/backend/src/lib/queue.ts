// ═══════════════════════════════════════════════════════════
// BullMQ Queue Setup
// ═══════════════════════════════════════════════════════════

import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import { redis } from "./redis";
import { logger } from "./logger";

const connection = redis;

// ── Queue Names ──────────────────────────────────────────

export const QUEUE_NAMES = {
  PDF_GENERATION: "pdf-generation",
  GITHUB_ANALYSIS: "github-analysis",
  EMBEDDING_GENERATION: "embedding-generation",
} as const;

// ── Queue Factory ────────────────────────────────────────

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  queue.on("error", (err: Error) => {
    logger.error(`Queue ${name} error`, { error: err.message });
  });

  queues.set(name, queue);
  return queue;
}

// ── Worker Factory ───────────────────────────────────────

const workers: Worker[] = [];

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection,
    concurrency: 1,
    ...options,
  });

  worker.on("completed", (job) => {
    logger.info(`Job completed: ${name}`, { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error(`Job failed: ${name}`, {
      jobId: job?.id,
      error: err.message,
    });
  });

  worker.on("error", (err: Error) => {
    logger.error(`Worker ${name} error`, { error: err.message });
  });

  workers.push(worker as Worker);
  return worker;
}

// ── Cleanup ──────────────────────────────────────────────

export async function closeQueues(): Promise<void> {
  await Promise.all([
    ...Array.from(queues.values()).map((q) => q.close()),
    ...workers.map((w) => w.close()),
  ]);
  queues.clear();
  workers.length = 0;
  logger.info("All queues and workers closed");
}
