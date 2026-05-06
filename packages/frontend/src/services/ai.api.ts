// ═══════════════════════════════════════════════════════════
// AI API Service
// ═══════════════════════════════════════════════════════════

import type {
  AIArtifact,
  AIArtifactApplyResult,
  AIATSCheckResponse,
  AICoverLetterResponse,
  AICVReviewResponse,
  AIGitHubProfileSummaryResponse,
  AIHealthResult,
  AIImproveTextResult,
  AIJobMatchResponse,
  AISkillSuggestionResult,
  AISummaryGenerationResult,
  AITailorResponse,
  AIToolKind,
} from "@cvbuilder/shared";
import { api } from "@/lib/api";
import { createAuthenticatedEventSource } from "@/lib/authenticated-event-source";
import { API_BASE_URL } from "@/lib/constants";

export const aiApi = {
  async health(): Promise<AIHealthResult> {
    const res = await api.get("/ai/health");
    return res.data.data;
  },

  async listArtifacts(filters?: { cvId?: string; tool?: AIToolKind; limit?: number }): Promise<AIArtifact[]> {
    const res = await api.get("/ai/artifacts", { params: filters });
    return res.data.data;
  },

  async applyArtifact(artifactId: string): Promise<AIArtifactApplyResult> {
    const res = await api.post(`/ai/artifacts/${artifactId}/apply`);
    return res.data.data;
  },

  async dismissArtifact(artifactId: string): Promise<AIArtifact> {
    const res = await api.post(`/ai/artifacts/${artifactId}/dismiss`);
    return res.data.data;
  },

  async generateSummary(cvId: string): Promise<AISummaryGenerationResult> {
    const res = await api.post(`/ai/summary/${cvId}`);
    return res.data.data;
  },

  async improveExperience(description: string, jobTitle: string, company: string): Promise<AIImproveTextResult> {
    const res = await api.post("/ai/improve-experience", { description, jobTitle, company });
    return res.data.data;
  },

  async improveProject(input: {
    cvId?: string;
    projectId?: string;
    name: string;
    description: string;
    technologies: string[];
  }): Promise<AIImproveTextResult> {
    const res = await api.post("/ai/improve-project", input);
    return res.data.data;
  },

  async suggestSkills(cvId: string): Promise<AISkillSuggestionResult> {
    const res = await api.post(`/ai/suggest-skills/${cvId}`);
    return res.data.data;
  },

  async atsCheck(cvId: string, jobDescription?: string): Promise<AIATSCheckResponse> {
    const res = await api.post(`/ai/ats-check/${cvId}`, { jobDescription });
    return res.data.data;
  },

  async generateCoverLetter(
    cvId: string,
    jobDescription?: string,
    options?: { tone?: "formal" | "conversational" | "technical"; alternatives?: boolean }
  ): Promise<AICoverLetterResponse> {
    const res = await api.post(`/ai/cover-letter/${cvId}`, {
      jobDescription,
      tone: options?.tone,
      alternatives: options?.alternatives,
    });
    return res.data.data;
  },

  async reviewCV(cvId: string): Promise<AICVReviewResponse> {
    const res = await api.post(`/ai/review/${cvId}`);
    return res.data.data;
  },

  async jobMatch(cvId: string, jobDescription: string): Promise<AIJobMatchResponse> {
    const res = await api.post(`/ai/job-match/${cvId}`, { jobDescription });
    return res.data.data;
  },

  async tailorCV(cvId: string, jobDescription: string): Promise<AITailorResponse> {
    const res = await api.post(`/ai/tailor/${cvId}`, { jobDescription });
    return res.data.data;
  },

  async githubProfileSummary(): Promise<AIGitHubProfileSummaryResponse> {
    const res = await api.post("/ai/github-summary");
    return res.data.data;
  },

  /**
   * SSE-based summary streaming. Returns an EventSource.
   * Caller should listen for "message" events and close when done.
   */
  createSummaryStream(cvId: string): EventSource {
    return createAuthenticatedEventSource(`${API_BASE_URL}/ai/summary/${cvId}/stream`);
  },
};
