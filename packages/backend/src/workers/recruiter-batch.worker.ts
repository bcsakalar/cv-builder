import { env } from "../config/env";
import { logger } from "../lib/logger";
import { createWorker, QUEUE_NAMES } from "../lib/queue";
import { recruiterService } from "../modules/recruiter/recruiter.service";

interface RecruiterBatchJobData {
  batchId: string;
  userId: string;
}

export function startRecruiterBatchWorker() {
  const worker = createWorker<RecruiterBatchJobData>(
    QUEUE_NAMES.RECRUITER_BATCH_PROCESSING,
    async (job) => {
      logger.info("Processing recruiter batch job", {
        jobId: job.id,
        batchId: job.data.batchId,
      });

      return recruiterService.processBatch(job.data.userId, job.data.batchId);
    },
    { concurrency: env.RECRUITER_BATCH_CONCURRENCY }
  );

  logger.info("Recruiter batch worker started");
  return worker;
}
