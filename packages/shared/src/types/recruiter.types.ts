import type { PaginationQuery } from "./api.types";

export type RecruiterBatchStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";

export type CandidateDocumentStatus = "UPLOADED" | "PROCESSING" | "EXTRACTED" | "FAILED";

export type CandidateRecommendation = "STRONG_MATCH" | "POTENTIAL_MATCH" | "WEAK_MATCH";

export type CandidateLinkType = "GITHUB" | "LINKEDIN" | "PORTFOLIO" | "OTHER";

export type LinkInspectionStatus = "PENDING" | "COMPLETED" | "FAILED" | "BLOCKED";

export interface RecruiterJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  locale: string;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  minimumYearsExperience: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterJobListItem extends RecruiterJob {
  batchCount: number;
  candidateCount: number;
  latestBatchStatus: RecruiterBatchStatus | null;
}

export interface RecruiterBatchSummary {
  id: string;
  status: RecruiterBatchStatus;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  lastError: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateDocument {
  id: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
  extractionStatus: CandidateDocumentStatus;
  extractedTextPreview: string | null;
  extractedTextLength: number;
  parseError: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateLink {
  id: string;
  url: string;
  normalizedUrl: string;
  host: string;
  linkType: CandidateLinkType;
  inspectionStatus: LinkInspectionStatus;
  statusCode: number | null;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  accessible: boolean | null;
  responseTimeMs: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateEvaluationBreakdown {
  overallScore: number;
  mustHaveScore: number;
  keywordScore: number;
  experienceScore: number;
  readabilityScore: number;
  linkQualityScore: number;
  riskPenalty: number;
}

export interface CandidateEvaluation extends CandidateEvaluationBreakdown {
  id: string;
  recommendation: CandidateRecommendation;
  matchedKeywords: string[];
  matchedHardSkills: string[];
  missingKeywords: string[];
  missingHardSkills: string[];
  matchEvidence: Array<{
    term: string;
    source: "mustHave" | "keyword";
    evidence: string;
  }>;
  strengths: string[];
  riskFlags: string[];
  shortSummary: string;
  explanation: string | null;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfile {
  id: string;
  jobId: string;
  batchId: string;
  documentId: string;
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
  createdAt: string;
  updatedAt: string;
  document: CandidateDocument;
  links: CandidateLink[];
  evaluation: CandidateEvaluation | null;
}

export interface RecruiterCandidateListItem {
  id: string;
  fullName: string | null;
  headline: string | null;
  email: string | null;
  yearsOfExperience: number | null;
  completenessScore: number;
  topSkills: string[];
  brokenLinkCount: number;
  accessibleLinkCount: number;
  updatedAt: string;
  evaluation: CandidateEvaluation | null;
}

export interface RecruiterBatchDetail extends RecruiterBatchSummary {
  jobId: string;
  documents: CandidateDocument[];
}

export interface RecruiterJobDetail extends RecruiterJobListItem {
  batches: RecruiterBatchSummary[];
}

export interface RecruiterCandidateFilters extends PaginationQuery {
  search?: string;
  recommendation?: CandidateRecommendation;
  minScore?: number;
  hasBrokenLinks?: boolean;
  batchId?: string;
}

export interface CreateRecruiterJobInput {
  title: string;
  company?: string | null;
  location?: string | null;
  locale?: string;
  description: string;
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  minimumYearsExperience?: number | null;
}

export interface ReevaluateCandidateInput {
  force?: boolean;
}