// ═══════════════════════════════════════════════════════════
// GitHub API Service
// ═══════════════════════════════════════════════════════════

import type { DeepAnalysisResult, GitHubProjectImportOverrides, GitHubProjectImportPreview, Project } from "@cvbuilder/shared";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { createAuthenticatedEventSource } from "@/lib/authenticated-event-source";
import type { AppLocale } from "@/i18n/locale";

export interface GitHubRepo {
  id: number;
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
  updatedAt: string;
  topics: string[];
  fitScore?: number | null;
  fitReasons?: string[];
  recommended?: boolean;
}

export interface RepoDetails {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  topics: string[];
  license: string | null;
  createdAt: string;
  updatedAt: string;
  languages: { language: string; percentage: number }[];
  recentCommits: { sha: string; message: string; date: string }[];
}

export interface GitHubAnalysis {
  id: string;
  username: string;
  repoFullName: string | null;
  locale: AppLocale;
  analysisVersion: string;
  model: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result: DeepAnalysisResult | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionStatus {
  connected: boolean;
  username: string | null;
  oauthConfigured: boolean;
}

export interface AnalysisProgressEvent {
  stage: string;
  progress: number;
  message: string;
}

export const githubApi = {
  async connect(token: string): Promise<{ username: string; avatarUrl: string; name: string }> {
    const res = await api.post("/github/connect", { token });
    return res.data.data;
  },

  async disconnect(): Promise<void> {
    await api.post("/github/disconnect");
  },

  async status(): Promise<ConnectionStatus> {
    const res = await api.get("/github/status");
    return res.data.data;
  },

  async authorizeOAuth(): Promise<{ authUrl: string }> {
    const res = await api.get("/github/oauth/authorize");
    return res.data.data;
  },

  async getRepos(page = 1, cvId?: string): Promise<GitHubRepo[]> {
    const res = await api.get("/github/repos", { params: { page, ...(cvId ? { cvId } : {}) } });
    return res.data.data;
  },

  async getRepoDetails(owner: string, repo: string): Promise<RepoDetails> {
    const res = await api.get(`/github/repos/${owner}/${repo}`);
    return res.data.data;
  },

  async analyze(input: { repoFullName: string; locale?: AppLocale; force?: boolean }): Promise<GitHubAnalysis> {
    const res = await api.post("/github/analyze", input);
    return res.data.data;
  },

  async regenerateAnalysis(id: string, input?: { locale?: AppLocale; force?: boolean }): Promise<GitHubAnalysis> {
    const res = await api.post(`/github/analyses/${id}/regenerate`, input ?? {});
    return res.data.data;
  },

  async getAnalyses(cvId?: string): Promise<GitHubAnalysis[]> {
    const res = await api.get("/github/analyses", { params: cvId ? { cvId } : undefined });
    return res.data.data;
  },

  async getAnalysis(id: string, cvId?: string): Promise<GitHubAnalysis> {
    const res = await api.get(`/github/analyses/${id}`, { params: cvId ? { cvId } : undefined });
    return res.data.data;
  },

  async deleteAnalysis(id: string): Promise<{ id: string; deleted: true }> {
    const res = await api.delete(`/github/analyses/${id}`);
    return res.data.data;
  },

  async getImportPreview(analysisId: string, cvId?: string): Promise<GitHubProjectImportPreview> {
    const res = await api.post("/github/import-preview", { analysisId, ...(cvId ? { cvId } : {}) });
    return res.data.data;
  },

  /** Create an EventSource for real-time analysis progress via SSE */
  createAnalysisStream(analysisId: string): EventSource {
    return createAuthenticatedEventSource(`${API_BASE_URL}/github/analyses/${analysisId}/stream`);
  },

  async importToCV(cvId: string, analysisId: string, projectOverrides?: GitHubProjectImportOverrides): Promise<Project> {
    const res = await api.post(`/github/import/${cvId}`, { analysisId, projectOverrides });
    return res.data.data;
  },

  async bulkImportToCV(cvId: string, analysisIds: string[]): Promise<unknown[]> {
    const res = await api.post(`/github/import-bulk/${cvId}`, { analysisIds });
    return res.data.data;
  },
};
