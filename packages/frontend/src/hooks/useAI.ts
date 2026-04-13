// ═══════════════════════════════════════════════════════════
// AI Hooks — TanStack Query
// ═══════════════════════════════════════════════════════════

import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi } from "@/services/ai.api";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { translate } from "@/i18n/helpers";

// ── Health check ─────────────────────────────────────────

export function useAIHealth() {
  return useQuery({
    queryKey: ["ai", "health"],
    queryFn: () => aiApi.health(),
    staleTime: 30_000,
  });
}

// ── Existing features ────────────────────────────────────

export function useGenerateSummary() {
  return useMutation({
    mutationFn: (cvId: string) => aiApi.generateSummary(cvId),
    onError: () => toast.error(translate("ai.toasts.summaryFailed")),
  });
}

export function useImproveExperience() {
  return useMutation({
    mutationFn: ({ description, jobTitle, company }: { description: string; jobTitle: string; company: string }) =>
      aiApi.improveExperience(description, jobTitle, company),
    onError: () => toast.error(translate("ai.toasts.improveExperienceFailed")),
  });
}

export function useSuggestSkills() {
  return useMutation({
    mutationFn: (cvId: string) => aiApi.suggestSkills(cvId),
    onError: () => toast.error(translate("ai.toasts.suggestSkillsFailed")),
  });
}

export function useATSCheck() {
  return useMutation({
    mutationFn: (cvId: string) => aiApi.atsCheck(cvId),
    onError: () => toast.error(translate("ai.toasts.atsFailed")),
  });
}

export function useGenerateCoverLetter() {
  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription?: string }) =>
      aiApi.generateCoverLetter(cvId, jobDescription),
    onError: () => toast.error(translate("ai.toasts.coverLetterFailed")),
  });
}

// ── New: Improve Project ─────────────────────────────────

export function useImproveProject() {
  return useMutation({
    mutationFn: ({ name, description, technologies }: { name: string; description: string; technologies: string[] }) =>
      aiApi.improveProject(name, description, technologies),
    onError: () => toast.error(translate("ai.toasts.improveProjectFailed")),
  });
}

// ── New: CV Review ───────────────────────────────────────

export function useReviewCV() {
  return useMutation({
    mutationFn: (cvId: string) => aiApi.reviewCV(cvId),
    onError: () => toast.error(translate("ai.toasts.reviewFailed")),
  });
}

// ── New: Job Match ───────────────────────────────────────

export function useJobMatch() {
  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription: string }) =>
      aiApi.jobMatch(cvId, jobDescription),
    onError: () => toast.error(translate("ai.toasts.jobMatchFailed")),
  });
}

// ── New: Tailor CV ───────────────────────────────────────

export function useTailorCV() {
  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription: string }) =>
      aiApi.tailorCV(cvId, jobDescription),
    onError: () => toast.error(translate("ai.toasts.tailorFailed")),
  });
}

// ── New: GitHub Profile Summary ──────────────────────────

export function useGitHubProfileSummary() {
  return useMutation({
    mutationFn: () => aiApi.githubProfileSummary(),
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
