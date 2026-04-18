// ═══════════════════════════════════════════════════════════
// GitHub API Service
// ═══════════════════════════════════════════════════════════

import type { DeepAnalysisResult, GitHubProjectImportOverrides, GitHubProjectImportPreview, Project } from "@cvbuilder/shared";
import { api } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { createAuthenticatedEventSource } from "@/lib/authenticated-event-source";

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
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  result: DeepAnalysisResult | null;
  error: string | null;
  createdAt: string;
}

export interface ConnectionStatus {
  connected: boolean;
  username: string | null;
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

  async getRepos(page = 1): Promise<GitHubRepo[]> {
    const res = await api.get(`/github/repos?page=${page}`);
    return res.data.data;
  },

  async getRepoDetails(owner: string, repo: string): Promise<RepoDetails> {
    const res = await api.get(`/github/repos/${owner}/${repo}`);
    return res.data.data;
  },

  async analyze(repoFullName: string): Promise<GitHubAnalysis> {
    const res = await api.post("/github/analyze", { repoFullName });
    return res.data.data;
  },

  async getAnalyses(): Promise<GitHubAnalysis[]> {
    const res = await api.get("/github/analyses");
    return res.data.data;
  },

  async getAnalysis(id: string): Promise<GitHubAnalysis> {
    const res = await api.get(`/github/analyses/${id}`);
    return res.data.data;
  },

  async getImportPreview(analysisId: string): Promise<GitHubProjectImportPreview> {
    const res = await api.post("/github/import-preview", { analysisId });
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
