import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import type { RecruiterCandidateFiltersInput } from "./recruiter.schema";

const JOB_LIST_INCLUDE = {
  _count: {
    select: {
      batches: true,
      candidateProfiles: true,
    },
  },
  batches: {
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.RecruiterJobInclude;

const JOB_DETAIL_INCLUDE = {
  _count: {
    select: {
      batches: true,
      candidateProfiles: true,
    },
  },
  batches: {
    orderBy: { createdAt: "desc" as const },
    include: {
      documents: {
        select: { id: true },
      },
    },
  },
} satisfies Prisma.RecruiterJobInclude;

const BATCH_DETAIL_INCLUDE = {
  documents: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.RecruiterBatchInclude;

const CANDIDATE_DETAIL_INCLUDE = {
  document: true,
  links: { orderBy: { createdAt: "asc" as const } },
  evaluation: true,
} satisfies Prisma.CandidateProfileInclude;

function buildCandidateWhere(userId: string, jobId: string, filters: RecruiterCandidateFiltersInput): Prisma.CandidateProfileWhereInput {
  const where: Prisma.CandidateProfileWhereInput = {
    userId,
    jobId,
  };

  if (filters.batchId) {
    where.batchId = filters.batchId;
  }

  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { headline: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { summary: { contains: filters.search, mode: "insensitive" } },
      { rawTextSnippet: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.recommendation || filters.minScore !== undefined) {
    where.evaluation = {
      is: {
        ...(filters.recommendation ? { recommendation: filters.recommendation } : {}),
        ...(filters.minScore !== undefined ? { overallScore: { gte: filters.minScore } } : {}),
      },
    };
  }

  if (filters.hasBrokenLinks) {
    where.links = {
      some: {
        OR: [
          { accessible: false },
          { inspectionStatus: "FAILED" },
          { inspectionStatus: "BLOCKED" },
        ],
      },
    };
  }

  return where;
}

function buildCandidateOrder(filters: RecruiterCandidateFiltersInput): Prisma.CandidateProfileOrderByWithRelationInput {
  const direction = filters.sortOrder;

  switch (filters.sortBy) {
    case "yearsOfExperience":
      return { yearsOfExperience: direction };
    case "completenessScore":
      return { completenessScore: direction };
    case "updatedAt":
      return { updatedAt: direction };
    case "overallScore":
    default:
      return { evaluation: { overallScore: direction } };
  }
}

export type RecruiterJobListRecord = Prisma.RecruiterJobGetPayload<{ include: typeof JOB_LIST_INCLUDE }>;
export type RecruiterJobDetailRecord = Prisma.RecruiterJobGetPayload<{ include: typeof JOB_DETAIL_INCLUDE }>;
export type RecruiterBatchDetailRecord = Prisma.RecruiterBatchGetPayload<{ include: typeof BATCH_DETAIL_INCLUDE }>;
export type RecruiterCandidateDetailRecord = Prisma.CandidateProfileGetPayload<{ include: typeof CANDIDATE_DETAIL_INCLUDE }>;

export const recruiterRepository = {
  async createJob(data: Prisma.RecruiterJobCreateInput) {
    return prisma.recruiterJob.create({ data });
  },

  async listJobs(userId: string) {
    return prisma.recruiterJob.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: JOB_LIST_INCLUDE,
    });
  },

  async getJobForUser(jobId: string, userId: string) {
    return prisma.recruiterJob.findFirst({
      where: { id: jobId, userId },
      include: JOB_DETAIL_INCLUDE,
    });
  },

  async createBatchWithDocuments(args: {
    userId: string;
    jobId: string;
    documents: Array<{
      originalFileName: string;
      storedFileName: string;
      mimeType: string;
      filePath: string;
      fileSize: number;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.recruiterBatch.create({
        data: {
          user: { connect: { id: args.userId } },
          job: { connect: { id: args.jobId } },
          totalFiles: args.documents.length,
        },
      });

      if (args.documents.length > 0) {
        await tx.candidateDocument.createMany({
          data: args.documents.map((document) => ({
            ...document,
            userId: args.userId,
            batchId: batch.id,
          })),
        });
      }

      return tx.recruiterBatch.findUniqueOrThrow({
        where: { id: batch.id },
        include: BATCH_DETAIL_INCLUDE,
      });
    });
  },

  async getBatchForUser(batchId: string, userId: string) {
    return prisma.recruiterBatch.findFirst({
      where: { id: batchId, userId },
      include: BATCH_DETAIL_INCLUDE,
    });
  },

  async getBatchForProcessing(batchId: string, userId: string) {
    return prisma.recruiterBatch.findFirst({
      where: { id: batchId, userId },
      include: {
        job: true,
        documents: { orderBy: { createdAt: "asc" } },
      },
    });
  },

  async updateBatch(batchId: string, data: Prisma.RecruiterBatchUpdateInput) {
    return prisma.recruiterBatch.update({
      where: { id: batchId },
      data,
      include: BATCH_DETAIL_INCLUDE,
    });
  },

  async updateDocument(documentId: string, data: Prisma.CandidateDocumentUpdateInput) {
    return prisma.candidateDocument.update({
      where: { id: documentId },
      data,
    });
  },

  async upsertCandidateProfileByDocument(args: {
    documentId: string;
    userId: string;
    jobId: string;
    batchId: string;
    fullName: string | null;
    headline: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    yearsOfExperience: number | null;
    summary: string | null;
    topSkills: string[];
    completenessScore: number;
    missingFields: string[];
    rawTextSnippet: string;
  }) {
    return prisma.candidateProfile.upsert({
      where: { documentId: args.documentId },
      update: {
        fullName: args.fullName,
        headline: args.headline,
        email: args.email,
        phone: args.phone,
        location: args.location,
        yearsOfExperience: args.yearsOfExperience,
        summary: args.summary,
        topSkills: args.topSkills as Prisma.InputJsonValue,
        completenessScore: args.completenessScore,
        missingFields: args.missingFields as Prisma.InputJsonValue,
        rawTextSnippet: args.rawTextSnippet,
      },
      create: {
        fullName: args.fullName,
        headline: args.headline,
        email: args.email,
        phone: args.phone,
        location: args.location,
        yearsOfExperience: args.yearsOfExperience,
        summary: args.summary,
        topSkills: args.topSkills as Prisma.InputJsonValue,
        completenessScore: args.completenessScore,
        missingFields: args.missingFields as Prisma.InputJsonValue,
        rawTextSnippet: args.rawTextSnippet,
        user: { connect: { id: args.userId } },
        job: { connect: { id: args.jobId } },
        batch: { connect: { id: args.batchId } },
        document: { connect: { id: args.documentId } },
      },
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  },

  async replaceCandidateLinks(candidateProfileId: string, links: Array<{
    url: string;
    normalizedUrl: string;
    host: string;
    linkType: "GITHUB" | "LINKEDIN" | "PORTFOLIO" | "OTHER";
    inspectionStatus: "PENDING" | "COMPLETED" | "FAILED" | "BLOCKED";
    statusCode: number | null;
    finalUrl: string | null;
    title: string | null;
    description: string | null;
    accessible: boolean | null;
    responseTimeMs: number | null;
    error: string | null;
  }>) {
    return prisma.$transaction(async (tx) => {
      await tx.candidateLink.deleteMany({ where: { candidateProfileId } });
      if (links.length > 0) {
        await tx.candidateLink.createMany({
          data: links.map((link) => ({
            ...link,
            candidateProfileId,
          })),
        });
      }

      return tx.candidateLink.findMany({
        where: { candidateProfileId },
        orderBy: { createdAt: "asc" },
      });
    });
  },

  async upsertCandidateEvaluation(candidateProfileId: string, userId: string, data: {
    overallScore: number;
    mustHaveScore: number;
    keywordScore: number;
    experienceScore: number;
    readabilityScore: number;
    linkQualityScore: number;
    riskPenalty: number;
    recommendation: "STRONG_MATCH" | "POTENTIAL_MATCH" | "WEAK_MATCH";
    missingKeywords: string[];
    missingHardSkills: string[];
    strengths: string[];
    riskFlags: string[];
    shortSummary: string;
    explanation: string;
  }) {
    return prisma.candidateEvaluation.upsert({
      where: { candidateProfileId },
      update: {
        overallScore: data.overallScore,
        mustHaveScore: data.mustHaveScore,
        keywordScore: data.keywordScore,
        experienceScore: data.experienceScore,
        readabilityScore: data.readabilityScore,
        linkQualityScore: data.linkQualityScore,
        riskPenalty: data.riskPenalty,
        recommendation: data.recommendation,
        missingKeywords: data.missingKeywords as Prisma.InputJsonValue,
        missingHardSkills: data.missingHardSkills as Prisma.InputJsonValue,
        strengths: data.strengths as Prisma.InputJsonValue,
        riskFlags: data.riskFlags as Prisma.InputJsonValue,
        shortSummary: data.shortSummary,
        explanation: data.explanation,
        evaluatedAt: new Date(),
      },
      create: {
        overallScore: data.overallScore,
        mustHaveScore: data.mustHaveScore,
        keywordScore: data.keywordScore,
        experienceScore: data.experienceScore,
        readabilityScore: data.readabilityScore,
        linkQualityScore: data.linkQualityScore,
        riskPenalty: data.riskPenalty,
        recommendation: data.recommendation,
        missingKeywords: data.missingKeywords as Prisma.InputJsonValue,
        missingHardSkills: data.missingHardSkills as Prisma.InputJsonValue,
        strengths: data.strengths as Prisma.InputJsonValue,
        riskFlags: data.riskFlags as Prisma.InputJsonValue,
        shortSummary: data.shortSummary,
        explanation: data.explanation,
        user: { connect: { id: userId } },
        candidateProfile: { connect: { id: candidateProfileId } },
      },
    });
  },

  async getCandidateForUser(candidateId: string, userId: string) {
    return prisma.candidateProfile.findFirst({
      where: { id: candidateId, userId },
      include: CANDIDATE_DETAIL_INCLUDE,
    });
  },

  async listCandidates(userId: string, jobId: string, filters: RecruiterCandidateFiltersInput) {
    return prisma.candidateProfile.findMany({
      where: buildCandidateWhere(userId, jobId, filters),
      include: CANDIDATE_DETAIL_INCLUDE,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: buildCandidateOrder(filters),
    });
  },

  async countCandidates(userId: string, jobId: string, filters: RecruiterCandidateFiltersInput) {
    return prisma.candidateProfile.count({
      where: buildCandidateWhere(userId, jobId, filters),
    });
  },
};
