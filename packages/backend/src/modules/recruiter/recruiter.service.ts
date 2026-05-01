import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import type { Prisma } from "@prisma/client";
import type {
  CandidateEvaluation,
  CandidateLink,
  CandidateProfile,
  RecruiterBatchDetail,
  RecruiterBatchSummary,
  RecruiterCandidateListItem,
  RecruiterJobDetail,
  RecruiterJobListItem,
} from "@cvbuilder/shared";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers";
import { ApiError } from "../../utils/api-error";
import { getQueue, QUEUE_NAMES } from "../../lib/queue";
import { logger } from "../../lib/logger";
import { recruiterRepository, type RecruiterBatchDetailRecord, type RecruiterCandidateDetailRecord, type RecruiterJobDetailRecord, type RecruiterJobListRecord } from "./recruiter.repository";
import { inspectCandidateLink } from "./recruiter.link-inspector";
import { parseCandidateFromText } from "./recruiter.parser";
import { scoreCandidate } from "./recruiter.scoring";
import type { CreateRecruiterJobInput, RecruiterCandidateFiltersInput } from "./recruiter.schema";

interface RecruiterBatchJobData {
  batchId: string;
  userId: string;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function mapEvaluation(value: RecruiterCandidateDetailRecord["evaluation"]): CandidateEvaluation | null {
  if (!value) return null;

  return {
    id: value.id,
    overallScore: value.overallScore,
    mustHaveScore: value.mustHaveScore,
    keywordScore: value.keywordScore,
    experienceScore: value.experienceScore,
    readabilityScore: value.readabilityScore,
    linkQualityScore: value.linkQualityScore,
    riskPenalty: value.riskPenalty,
    recommendation: value.recommendation,
    matchedKeywords: toStringArray(value.matchedKeywords),
    matchedHardSkills: toStringArray(value.matchedHardSkills),
    missingKeywords: toStringArray(value.missingKeywords),
    missingHardSkills: toStringArray(value.missingHardSkills),
    matchEvidence: Array.isArray(value.matchEvidence)
      ? value.matchEvidence.filter((item): item is { term: string; source: "mustHave" | "keyword"; evidence: string } => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return false;
          const record = item as Record<string, unknown>;
          return typeof record.term === "string"
            && (record.source === "mustHave" || record.source === "keyword")
            && typeof record.evidence === "string";
        })
      : [],
    strengths: toStringArray(value.strengths),
    riskFlags: toStringArray(value.riskFlags),
    shortSummary: value.shortSummary,
    explanation: value.explanation,
    evaluatedAt: value.evaluatedAt.toISOString(),
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

function mapLink(link: RecruiterCandidateDetailRecord["links"][number]): CandidateLink {
  return {
    id: link.id,
    url: link.url,
    normalizedUrl: link.normalizedUrl,
    host: link.host,
    linkType: link.linkType,
    inspectionStatus: link.inspectionStatus,
    statusCode: link.statusCode,
    finalUrl: link.finalUrl,
    title: link.title,
    description: link.description,
    accessible: link.accessible,
    responseTimeMs: link.responseTimeMs,
    error: link.error,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

function mapDocument(document: RecruiterBatchDetailRecord["documents"][number]) {
  return {
    id: document.id,
    originalFileName: document.originalFileName,
    storedFileName: document.storedFileName,
    mimeType: document.mimeType,
    filePath: document.filePath,
    fileSize: document.fileSize,
    extractionStatus: document.extractionStatus,
    extractedTextPreview: document.extractedText
      ? `${document.extractedText.slice(0, 1200).trim()}${document.extractedText.length > 1200 ? "..." : ""}`
      : null,
    extractedTextLength: document.extractedText?.length ?? 0,
    parseError: document.parseError,
    processedAt: document.processedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function mapBatchSummary(batch: RecruiterBatchDetailRecord | RecruiterJobDetailRecord["batches"][number]): RecruiterBatchSummary {
  return {
    id: batch.id,
    status: batch.status,
    totalFiles: batch.totalFiles,
    processedFiles: batch.processedFiles,
    successfulFiles: batch.successfulFiles,
    failedFiles: batch.failedFiles,
    lastError: batch.lastError,
    completedAt: batch.completedAt?.toISOString() ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function mapBatchDetail(batch: RecruiterBatchDetailRecord): RecruiterBatchDetail {
  return {
    ...mapBatchSummary(batch),
    jobId: batch.jobId,
    documents: batch.documents.map(mapDocument),
  };
}

function mapJobListItem(job: RecruiterJobListRecord): RecruiterJobListItem {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    locale: job.locale,
    description: job.description,
    mustHaveSkills: toStringArray(job.mustHaveSkills),
    niceToHaveSkills: toStringArray(job.niceToHaveSkills),
    minimumYearsExperience: job.minimumYearsExperience,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    batchCount: job._count.batches,
    candidateCount: job._count.candidateProfiles,
    latestBatchStatus: job.batches[0]?.status ?? null,
  };
}

function mapJobDetail(job: RecruiterJobDetailRecord): RecruiterJobDetail {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    locale: job.locale,
    description: job.description,
    mustHaveSkills: toStringArray(job.mustHaveSkills),
    niceToHaveSkills: toStringArray(job.niceToHaveSkills),
    minimumYearsExperience: job.minimumYearsExperience,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    batchCount: job._count.batches,
    candidateCount: job._count.candidateProfiles,
    latestBatchStatus: job.batches[0]?.status ?? null,
    batches: job.batches.map(mapBatchSummary),
  };
}

function mapCandidate(record: RecruiterCandidateDetailRecord): CandidateProfile {
  return {
    id: record.id,
    jobId: record.jobId,
    batchId: record.batchId,
    documentId: record.documentId,
    fullName: record.fullName,
    headline: record.headline,
    email: record.email,
    phone: record.phone,
    location: record.location,
    yearsOfExperience: record.yearsOfExperience,
    summary: record.summary,
    topSkills: toStringArray(record.topSkills),
    completenessScore: record.completenessScore,
    missingFields: toStringArray(record.missingFields),
    rawTextSnippet: record.rawTextSnippet,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    document: mapDocument(record.document),
    links: record.links.map(mapLink),
    evaluation: mapEvaluation(record.evaluation),
  };
}

function mapCandidateListItem(record: RecruiterCandidateDetailRecord): RecruiterCandidateListItem {
  const mappedLinks = record.links.map(mapLink);

  return {
    id: record.id,
    fullName: record.fullName,
    headline: record.headline,
    email: record.email,
    yearsOfExperience: record.yearsOfExperience,
    completenessScore: record.completenessScore,
    topSkills: toStringArray(record.topSkills),
    brokenLinkCount: mappedLinks.filter((link) => link.accessible === false || link.inspectionStatus === "FAILED" || link.inspectionStatus === "BLOCKED").length,
    accessibleLinkCount: mappedLinks.filter((link) => link.accessible === true).length,
    updatedAt: record.updatedAt.toISOString(),
    evaluation: mapEvaluation(record.evaluation),
  };
}

function normalizeSkills(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].slice(0, 25);
}

async function runCandidateEvaluation(candidateId: string, userId: string) {
  const candidate = await recruiterRepository.getCandidateForUser(candidateId, userId);
  if (!candidate) {
    throw ApiError.notFound("Candidate");
  }

  const job = await recruiterRepository.getJobForUser(candidate.jobId, userId);
  if (!job) {
    throw ApiError.notFound("Job");
  }

  const links = candidate.links.map(mapLink);
  const evaluation = scoreCandidate(
    {
      title: job.title,
      description: job.description,
      mustHaveSkills: toStringArray(job.mustHaveSkills),
      niceToHaveSkills: toStringArray(job.niceToHaveSkills),
      minimumYearsExperience: job.minimumYearsExperience,
    },
    {
      fullName: candidate.fullName,
      headline: candidate.headline,
      summary: candidate.summary,
      topSkills: toStringArray(candidate.topSkills),
      completenessScore: candidate.completenessScore,
      yearsOfExperience: candidate.yearsOfExperience,
      rawTextSnippet: candidate.rawTextSnippet,
      fullText: candidate.document.extractedText ?? candidate.rawTextSnippet,
      email: candidate.email,
      phone: candidate.phone,
    },
    links
  );

  await recruiterRepository.upsertCandidateEvaluation(candidate.id, userId, evaluation);
  const updatedCandidate = await recruiterRepository.getCandidateForUser(candidate.id, userId);
  if (!updatedCandidate) {
    throw ApiError.notFound("Candidate");
  }

  return mapCandidate(updatedCandidate);
}

export const recruiterService = {
  async createJob(userId: string, input: CreateRecruiterJobInput) {
    const job = await recruiterRepository.createJob({
      title: input.title.trim(),
      company: input.company,
      location: input.location,
      locale: input.locale,
      description: input.description.trim(),
      mustHaveSkills: normalizeSkills(input.mustHaveSkills) as Prisma.InputJsonValue,
      niceToHaveSkills: normalizeSkills(input.niceToHaveSkills) as Prisma.InputJsonValue,
      minimumYearsExperience: input.minimumYearsExperience,
      user: { connect: { id: userId } },
    });

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      locale: job.locale,
      description: job.description,
      mustHaveSkills: toStringArray(job.mustHaveSkills),
      niceToHaveSkills: toStringArray(job.niceToHaveSkills),
      minimumYearsExperience: job.minimumYearsExperience,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  },

  async listJobs(userId: string) {
    const jobs = await recruiterRepository.listJobs(userId);
    return jobs.map(mapJobListItem);
  },

  async getJob(userId: string, jobId: string) {
    const job = await recruiterRepository.getJobForUser(jobId, userId);
    if (!job) {
      throw ApiError.notFound("Job");
    }

    return mapJobDetail(job);
  },

  async createBatch(userId: string, jobId: string, files: Express.Multer.File[]) {
    const job = await recruiterRepository.getJobForUser(jobId, userId);
    if (!job) {
      throw ApiError.notFound("Job");
    }

    if (!files.length) {
      throw ApiError.badRequest("At least one PDF file is required");
    }

    const batch = await recruiterRepository.createBatchWithDocuments({
      userId,
      jobId,
      documents: files.map((file) => ({
        originalFileName: file.originalname,
        storedFileName: path.basename(file.path),
        mimeType: file.mimetype,
        filePath: file.path,
        fileSize: file.size,
      })),
    });

    await getQueue(QUEUE_NAMES.RECRUITER_BATCH_PROCESSING).add(
      `recruiter-batch:${batch.id}`,
      { batchId: batch.id, userId } satisfies RecruiterBatchJobData,
      { jobId: batch.id }
    );

    return mapBatchDetail(batch);
  },

  async getBatch(userId: string, batchId: string) {
    const batch = await recruiterRepository.getBatchForUser(batchId, userId);
    if (!batch) {
      throw ApiError.notFound("Batch");
    }

    return mapBatchDetail(batch);
  },

  async listCandidates(userId: string, jobId: string, filters: RecruiterCandidateFiltersInput) {
    const job = await recruiterRepository.getJobForUser(jobId, userId);
    if (!job) {
      throw ApiError.notFound("Job");
    }

    const pagination = parsePagination(filters.page, filters.limit);
    const effectiveFilters: RecruiterCandidateFiltersInput = {
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
    };

    const [items, total] = await Promise.all([
      recruiterRepository.listCandidates(userId, jobId, effectiveFilters),
      recruiterRepository.countCandidates(userId, jobId, effectiveFilters),
    ]);

    return {
      items: items.map(mapCandidateListItem),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    } satisfies { items: RecruiterCandidateListItem[]; meta: ReturnType<typeof buildPaginationMeta> };
  },

  async getCandidate(userId: string, candidateId: string) {
    const candidate = await recruiterRepository.getCandidateForUser(candidateId, userId);
    if (!candidate) {
      throw ApiError.notFound("Candidate");
    }

    return mapCandidate(candidate);
  },

  async reEvaluateCandidate(userId: string, candidateId: string) {
    return runCandidateEvaluation(candidateId, userId);
  },

  async processBatch(userId: string, batchId: string) {
    const batch = await recruiterRepository.getBatchForProcessing(batchId, userId);
    if (!batch) {
      throw ApiError.notFound("Batch");
    }

    await recruiterRepository.updateBatch(batch.id, {
      status: "PROCESSING",
      lastError: null,
    });

    let processedFiles = 0;
    let successfulFiles = 0;
    let failedFiles = 0;
    let lastError: string | null = null;

    for (const document of batch.documents) {
      try {
        await recruiterRepository.updateDocument(document.id, {
          extractionStatus: "PROCESSING",
          parseError: null,
        });

        const buffer = await fs.readFile(document.filePath);
        const parsedPdf = await pdfParse(buffer);
        const extractedText = parsedPdf.text?.replace(/\u0000/g, " ").trim() ?? "";

        if (extractedText.length < 40) {
          throw new Error("PDF text extraction did not produce enough readable content");
        }

        const parsedCandidate = parseCandidateFromText(extractedText);
        const candidateProfile = await recruiterRepository.upsertCandidateProfileByDocument({
          documentId: document.id,
          userId,
          jobId: batch.jobId,
          batchId: batch.id,
          fullName: parsedCandidate.fullName,
          headline: parsedCandidate.headline,
          email: parsedCandidate.email,
          phone: parsedCandidate.phone,
          location: parsedCandidate.location,
          yearsOfExperience: parsedCandidate.yearsOfExperience,
          summary: parsedCandidate.summary,
          topSkills: parsedCandidate.topSkills,
          completenessScore: parsedCandidate.completenessScore,
          missingFields: parsedCandidate.missingFields,
          rawTextSnippet: parsedCandidate.rawTextSnippet,
        });

        const inspectedLinks = await Promise.all(
          parsedCandidate.links.map(async (link) => ({
            base: link,
            inspected: await inspectCandidateLink(link.normalizedUrl),
          }))
        );

        const persistedLinks = await recruiterRepository.replaceCandidateLinks(
          candidateProfile.id,
          inspectedLinks.map(({ base, inspected }) => ({
            url: base.url,
            normalizedUrl: inspected.normalizedUrl,
            host: inspected.host,
            linkType: inspected.linkType,
            inspectionStatus: inspected.inspectionStatus,
            statusCode: inspected.statusCode,
            finalUrl: inspected.finalUrl,
            title: inspected.title,
            description: inspected.description,
            accessible: inspected.accessible,
            responseTimeMs: inspected.responseTimeMs,
            error: inspected.error,
          }))
        );

        const evaluation = scoreCandidate(
          {
            title: batch.job.title,
            description: batch.job.description,
            mustHaveSkills: toStringArray(batch.job.mustHaveSkills),
            niceToHaveSkills: toStringArray(batch.job.niceToHaveSkills),
            minimumYearsExperience: batch.job.minimumYearsExperience,
          },
          {
            fullName: parsedCandidate.fullName,
            headline: parsedCandidate.headline,
            summary: parsedCandidate.summary,
            topSkills: parsedCandidate.topSkills,
            completenessScore: parsedCandidate.completenessScore,
            yearsOfExperience: parsedCandidate.yearsOfExperience,
            rawTextSnippet: parsedCandidate.rawTextSnippet,
            fullText: extractedText,
            email: parsedCandidate.email,
            phone: parsedCandidate.phone,
          },
          persistedLinks.map((link) => ({
            id: link.id,
            url: link.url,
            normalizedUrl: link.normalizedUrl,
            host: link.host,
            linkType: link.linkType,
            inspectionStatus: link.inspectionStatus,
            statusCode: link.statusCode,
            finalUrl: link.finalUrl,
            title: link.title,
            description: link.description,
            accessible: link.accessible,
            responseTimeMs: link.responseTimeMs,
            error: link.error,
            createdAt: link.createdAt.toISOString(),
            updatedAt: link.updatedAt.toISOString(),
          }))
        );

        await recruiterRepository.upsertCandidateEvaluation(candidateProfile.id, userId, evaluation);
        await recruiterRepository.updateDocument(document.id, {
          extractionStatus: "EXTRACTED",
          extractedText: extractedText.slice(0, 50000),
          processedAt: new Date(),
          parseError: null,
        });

        successfulFiles += 1;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Candidate processing failed";
        failedFiles += 1;
        logger.error("Recruiter candidate processing failed", {
          batchId,
          documentId: document.id,
          error: lastError,
        });

        await recruiterRepository.updateDocument(document.id, {
          extractionStatus: "FAILED",
          parseError: lastError,
          processedAt: new Date(),
        });
      }

      processedFiles += 1;
      await recruiterRepository.updateBatch(batch.id, {
        status: "PROCESSING",
        processedFiles,
        successfulFiles,
        failedFiles,
        lastError,
      });
    }

    const finalStatus = successfulFiles === 0 && failedFiles > 0
      ? "FAILED"
      : failedFiles > 0
        ? "COMPLETED_WITH_ERRORS"
        : "COMPLETED";

    const updatedBatch = await recruiterRepository.updateBatch(batch.id, {
      status: finalStatus,
      processedFiles,
      successfulFiles,
      failedFiles,
      lastError,
      completedAt: new Date(),
    });

    return mapBatchDetail(updatedBatch);
  },
};
