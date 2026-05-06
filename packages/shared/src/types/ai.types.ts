// ═══════════════════════════════════════════════════════════
// AI Data Models — Shared contracts for AI-assisted CV flows
// ═══════════════════════════════════════════════════════════

export type AIToolKind =
  | "summary"
  | "skills"
  | "ats"
  | "review"
  | "job_match"
  | "tailor"
  | "cover_letter"
  | "github_profile_summary"
  | "project_improvement"
  | "experience_improvement";

export type AIArtifactStatus = "ready" | "applied" | "dismissed" | "failed";

export type AITargetSection = "summary" | "coverLetter" | "skills" | "experience" | "projects" | "github" | "general";

export const AI_AUTO_APPLY_TOOLS = ["summary", "skills", "tailor", "cover_letter"] as const satisfies readonly AIToolKind[];

export interface AIHealthResult {
  provider: "ollama";
  ollama: "connected" | "unavailable";
  ready: boolean;
  readinessIssues: string[];
  model: string;
  models?: {
    writer: string;
    structured: string;
    repoAnalysis: string;
    embedding: string;
  };
  modelAvailable: boolean;
  availableModels: string[];
}

export interface AIATSSectionScore {
  sectionId: string;
  score: number;
  reason: string;
}

export interface AIATSFixChecklistItem {
  id: string;
  label: string;
  reason: string;
  priority: "high" | "medium" | "low";
  sectionId?: string;
}

export interface AIRecruiterReadabilityMetrics {
  score: number;
  averageSentenceLength: number;
  metricCoverage: number;
  actionVerbUsage: number;
  notes: string[];
}

export interface AIATSResult {
  score: number;
  issues: string[];
  suggestions: string[];
  keywordGaps: string[];
  hardSkillGaps: string[];
  sectionScores: AIATSSectionScore[];
  recruiterReadability: AIRecruiterReadabilityMetrics;
  fixChecklist: AIATSFixChecklistItem[];
}

export interface AIReviewSectionResult {
  name: string;
  score: number;
  feedback: string;
}

export interface AICVReviewResult {
  overallScore: number;
  sections: AIReviewSectionResult[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface AIJobMatchResult {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  keywordGaps: string[];
  suggestions: string[];
  summary: string;
}

export interface AITailorExperienceTip {
  company: string;
  suggestion: string;
}

export interface AITailorResult {
  suggestedSummary: string;
  skillsToAdd: string[];
  skillsToHighlight: string[];
  experienceTips: AITailorExperienceTip[];
  overallStrategy: string;
}

export type AIArtifactPayload = string | string[] | AIATSResult | AICVReviewResult | AIJobMatchResult | AITailorResult;

export interface AIArtifact<TOutput = AIArtifactPayload> {
  id: string;
  tool: AIToolKind;
  status: AIArtifactStatus;
  title: string;
  cvId: string | null;
  targetSection: AITargetSection | null;
  input: Record<string, unknown> | null;
  output: TOutput | null;
  summary: string | null;
  provider: string;
  model: string;
  locale: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  appliedAt: string | null;
  dismissedAt: string | null;
}

export interface AISummaryGenerationResult {
  summary: string;
  artifact: AIArtifact<string>;
}

export interface AIImproveTextResult {
  improved: string;
  artifact: AIArtifact<string>;
}

export interface AISkillSuggestionResult {
  skills: string[];
  artifact: AIArtifact<string[]>;
}

export interface AIATSCheckResponse extends AIATSResult {
  artifact: AIArtifact<AIATSResult>;
}

export interface AICVReviewResponse extends AICVReviewResult {
  artifact: AIArtifact<AICVReviewResult>;
}

export interface AIJobMatchResponse extends AIJobMatchResult {
  artifact: AIArtifact<AIJobMatchResult>;
}

export interface AITailorResponse extends AITailorResult {
  artifact: AIArtifact<AITailorResult>;
}

export type AICoverLetterTone = "formal" | "conversational" | "technical";

export interface AICoverLetterResponse {
  coverLetter: string;
  /** Optional alternative drafts (different angles/openings). Empty when not requested. */
  alternatives?: string[];
  tone?: AICoverLetterTone;
  artifact: AIArtifact<string>;
}

export interface AIGitHubProfileSummaryResponse {
  summary: string;
  artifact: AIArtifact<string>;
}

export interface AIArtifactApplyAction {
  type:
    | "summary_updated"
    | "skills_added"
    | "project_updated"
    | "github_analysis_updated"
    | "cv_flagged"
    | "artifact_state_updated"
    | "noop";
  message: string;
  count?: number;
}

export interface AIArtifactApplyResult {
  artifact: AIArtifact;
  actions: AIArtifactApplyAction[];
}
