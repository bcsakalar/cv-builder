// ═══════════════════════════════════════════════════════════
// AI Hooks — TanStack Query
// ═══════════════════════════════════════════════════════════

import type { AIToolKind } from "@cvbuilder/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/services/ai.api";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { translate } from "@/i18n/helpers";
import { cvKeys } from "./useCV";

export const aiKeys = {
  health: ["ai", "health"] as const,
  artifacts: (cvId?: string, tool?: AIToolKind) => ["ai", "artifacts", cvId ?? "all", tool ?? "all"] as const,
};

// ── Health check ─────────────────────────────────────────

export function useAIHealth() {
  return useQuery({
    queryKey: aiKeys.health,
    queryFn: () => aiApi.health(),
    staleTime: 30_000,
  });
}

export function useAIArtifacts(filters?: { cvId?: string; tool?: AIToolKind; limit?: number }) {
  return useQuery({
    queryKey: aiKeys.artifacts(filters?.cvId, filters?.tool),
    queryFn: () => aiApi.listArtifacts(filters),
  });
}

export function useApplyAIArtifact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (artifactId: string) => aiApi.applyArtifact(artifactId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
      qc.invalidateQueries({ queryKey: ["ai", "artifacts"] });
      if (data.artifact.cvId) {
        qc.invalidateQueries({ queryKey: cvKeys.detail(data.artifact.cvId) });
      }
      toast.success(translate("ai.toasts.applySuccess"));
    },
    onError: () => toast.error(translate("ai.toasts.applyFailed")),
  });
}

export function useDismissAIArtifact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (artifactId: string) => aiApi.dismissArtifact(artifactId),
    onSuccess: (artifact) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(artifact.cvId ?? undefined) });
      qc.invalidateQueries({ queryKey: ["ai", "artifacts"] });
      toast.success(translate("ai.toasts.dismissSuccess"));
    },
    onError: () => toast.error(translate("ai.toasts.dismissFailed")),
  });
}

// ── Existing features ────────────────────────────────────

export function useGenerateSummary() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (cvId: string) => aiApi.generateSummary(cvId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.summaryFailed")),
  });
}

export function useImproveExperience() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ description, jobTitle, company }: { description: string; jobTitle: string; company: string }) =>
      aiApi.improveExperience(description, jobTitle, company),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "artifacts"] });
    },
    onError: () => toast.error(translate("ai.toasts.improveExperienceFailed")),
  });
}

export function useSuggestSkills() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (cvId: string) => aiApi.suggestSkills(cvId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.suggestSkillsFailed")),
  });
}

export function useATSCheck() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription?: string }) => aiApi.atsCheck(cvId, jobDescription),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.atsFailed")),
  });
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription?: string }) =>
      aiApi.generateCoverLetter(cvId, jobDescription),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.coverLetterFailed")),
  });
}

// ── New: Improve Project ─────────────────────────────────

export function useImproveProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { cvId?: string; projectId?: string; name: string; description: string; technologies: string[] }) =>
      aiApi.improveProject(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai", "artifacts"] });
      if (data.artifact.cvId) {
        qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId) });
      }
    },
    onError: () => toast.error(translate("ai.toasts.improveProjectFailed")),
  });
}

// ── New: CV Review ───────────────────────────────────────

export function useReviewCV() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (cvId: string) => aiApi.reviewCV(cvId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.reviewFailed")),
  });
}

// ── New: Job Match ───────────────────────────────────────

export function useJobMatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription: string }) =>
      aiApi.jobMatch(cvId, jobDescription),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.jobMatchFailed")),
  });
}

// ── New: Tailor CV ───────────────────────────────────────

export function useTailorCV() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription: string }) =>
      aiApi.tailorCV(cvId, jobDescription),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: aiKeys.artifacts(data.artifact.cvId ?? undefined) });
    },
    onError: () => toast.error(translate("ai.toasts.tailorFailed")),
  });
}

// ── New: GitHub Profile Summary ──────────────────────────

export function useGitHubProfileSummary() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => aiApi.githubProfileSummary(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "artifacts"] });
    },
    onError: () => toast.error(translate("ai.toasts.githubProfileSummaryFailed")),
  });
}

// ── New: Streaming Summary ───────────────────────────────

export function useStreamingSummary() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback((cvId: string) => {
    setText("");
    setError(null);
    setIsStreaming(true);

    const source = aiApi.createSummaryStream(cvId);
    let accumulated = "";

    source.onmessage = (event) => {
      if (event.data === "[DONE]") {
        source.close();
        setIsStreaming(false);
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as { chunk?: string; error?: string };
        if (parsed.error) {
          setError(parsed.error);
          source.close();
          setIsStreaming(false);
          return;
        }
        if (parsed.chunk) {
          accumulated += parsed.chunk;
          setText(accumulated);
        }
      } catch {
        // skip
      }
    };

    source.onerror = () => {
      source.close();
      setIsStreaming(false);
      setError(translate("ai.toasts.streamingLost"));
    };

    return () => {
      source.close();
      setIsStreaming(false);
    };
  }, []);

  return { text, isStreaming, error, startStream };
}
