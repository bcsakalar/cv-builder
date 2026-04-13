// ═══════════════════════════════════════════════════════════
// GitHub Hooks — TanStack Query
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { githubApi, type AnalysisProgressEvent } from "@/services/github.api";
import { toast } from "sonner";
import { translate } from "@/i18n/helpers";

const ghKeys = {
  all: ["github"] as const,
  status: () => [...ghKeys.all, "status"] as const,
  repos: (page: number) => [...ghKeys.all, "repos", page] as const,
  repoDetails: (owner: string, repo: string) => [...ghKeys.all, "repo", owner, repo] as const,
  analyses: () => [...ghKeys.all, "analyses"] as const,
  analysis: (id: string) => [...ghKeys.all, "analysis", id] as const,
};

export function useGitHubStatus() {
  return useQuery({
    queryKey: ghKeys.status(),
    queryFn: () => githubApi.status(),
  });
}

export function useGitHubRepos(page = 1) {
  return useQuery({
    queryKey: ghKeys.repos(page),
    queryFn: () => githubApi.getRepos(page),
  });
}

export function useRepoDetails(owner: string, repo: string) {
  return useQuery({
    queryKey: ghKeys.repoDetails(owner, repo),
    queryFn: () => githubApi.getRepoDetails(owner, repo),
    enabled: !!owner && !!repo,
  });
}

export function useGitHubAnalyses() {
  const query = useQuery({
    queryKey: ghKeys.analyses(),
    queryFn: () => githubApi.getAnalyses(),
  });

  // Auto-refetch when any analysis is in progress
  const hasActive = query.data?.some(
    (a) => a.status === "PENDING" || a.status === "PROCESSING"
  );

  return useQuery({
    queryKey: ghKeys.analyses(),
    queryFn: () => githubApi.getAnalyses(),
    refetchInterval: hasActive ? 3000 : false,
  });
}

export function useConnectGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => githubApi.connect(token),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ghKeys.status() });
      toast.success(translate("toasts.github.connectedAs", { username: data.username }));
    },
    onError: () => toast.error(translate("toasts.github.connectFailed")),
  });
}

export function useDisconnectGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => githubApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ghKeys.status() });
      toast.success(translate("toasts.github.disconnected"));
    },
    onError: () => toast.error(translate("toasts.github.disconnectFailed")),
  });
}

export function useAnalyzeRepo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoFullName: string) => githubApi.analyze(repoFullName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ghKeys.analyses() });
      toast.success(translate("toasts.github.analysisStarted"));
    },
    onError: () => toast.error(translate("toasts.github.analysisFailed")),
  });
}

export function useImportToCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cvId, analysisId }: { cvId: string; analysisId: string }) =>
      githubApi.importToCV(cvId, analysisId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cvs"] });
      qc.invalidateQueries({ queryKey: ["cvs", vars.cvId] });
      toast.success(translate("toasts.github.projectImported"));
    },
    onError: () => toast.error(translate("toasts.github.importFailed")),
  });
}

export function useBulkImportToCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cvId, analysisIds }: { cvId: string; analysisIds: string[] }) =>
      githubApi.bulkImportToCV(cvId, analysisIds),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cvs"] });
      qc.invalidateQueries({ queryKey: ["cvs", vars.cvId] });
      toast.success(translate("toasts.github.projectsImported", { count: vars.analysisIds.length }));
    },
    onError: () => toast.error(translate("toasts.github.bulkImportFailed")),
  });
}

/**
 * Hook to subscribe to real-time analysis progress via SSE.
 * Returns current progress state and auto-closes when complete/failed.
 */
export function useAnalysisProgress(analysisId: string | null) {
  const [progress, setProgress] = useState<AnalysisProgressEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const qc = useQueryClient();

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!analysisId) {
      return;
    }

    const es = githubApi.createAnalysisStream(analysisId);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AnalysisProgressEvent;
        setProgress(data);

        if (data.stage === "completed" || data.stage === "failed") {
          // Refresh analysis list when done
          qc.invalidateQueries({ queryKey: ghKeys.analyses() });
          close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      close();
    };

    return () => {
      close();
    };
  }, [analysisId, close, qc]);

  return { progress, close };
}
