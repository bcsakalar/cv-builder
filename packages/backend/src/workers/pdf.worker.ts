// ═══════════════════════════════════════════════════════════
// PDF Generation Worker — BullMQ processor
// ═══════════════════════════════════════════════════════════

import { createWorker, QUEUE_NAMES } from "../lib/queue";
import { pdfService } from "../modules/pdf/pdf.service";
import { logger } from "../lib/logger";
import type { GeneratePDFInput } from "../modules/pdf/pdf.schema";

interface PDFJobData {
  userId: string;
  cvId: string;
  options: GeneratePDFInput;
}

export function startPDFWorker() {
  const worker = createWorker<PDFJobData>(
    QUEUE_NAMES.PDF_GENERATION,
    async (job) => {
      logger.info("Processing PDF generation job", {
        jobId: job.id,
        cvId: job.data.cvId,
      });

      const result = await pdfService.generate(job.data.userId, job.data.cvId, job.data.options);

      return {
        exportId: result.id,
        fileName: result.fileName,
        fileSize: result.fileSize,
      };
    },
    { concurrency: 2 }
  );

  logger.info("PDF generation worker started");
  return worker;
}
