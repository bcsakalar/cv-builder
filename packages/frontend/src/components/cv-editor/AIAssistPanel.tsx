import type {
  AIArtifact,
  AIATSFixChecklistItem,
  AIATSResult,
  AIATSSectionScore,
  AICVReviewResult,
  AIJobMatchResult,
  AIRecruiterReadabilityMetrics,
  AITailorResult,
  AIToolKind,
} from "@cvbuilder/shared";
import { AI_AUTO_APPLY_TOOLS } from "@cvbuilder/shared";
import {
  useAIArtifacts,
  useAIHealth,
  useApplyAIArtifact,
  useATSCheck,
  useDismissAIArtifact,
  useGenerateCoverLetter,
  useGenerateSummary,
  useStreamingSummary,
  useJobMatch,
  useReviewCV,
  useSuggestSkills,
  useTailorCV,
} from "@/hooks/useAI";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ClipboardCopy,
  FileText,
  History,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AIAssistPanelProps {
  cvId: string;
}

type PanelTab = "review" | "ats" | "match" | "tailor" | "summary" | "skills" | "cover";

const TAB_TOOL: Record<PanelTab, AIToolKind> = {
  review: "review",
  ats: "ats",
  match: "job_match",
  tailor: "tailor",
  summary: "summary",
  skills: "skills",
  cover: "cover_letter",
};

const TOOL_TAB: Record<AIToolKind, PanelTab | null> = {
  review: "review",
  ats: "ats",
  job_match: "match",
  tailor: "tailor",
  summary: "summary",
  skills: "skills",
  cover_letter: "cover",
  github_profile_summary: null,
  project_improvement: null,
  experience_improvement: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asChecklistItems(value: unknown): AIATSFixChecklistItem[] {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item): AIATSFixChecklistItem => ({
          id: asString(item.id) || crypto.randomUUID(),
          label: asString(item.label),
          reason: asString(item.reason),
          priority: item.priority === "high" || item.priority === "medium" || item.priority === "low" ? item.priority : "medium",
          sectionId: asString(item.sectionId) || undefined,
        }))
        .filter((item) => item.label.length > 0)
    : [];
}

function asSectionScores(value: unknown): AIATSSectionScore[] {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((item) => ({
          sectionId: asString(item.sectionId),
          score: asNumber(item.score),
          reason: asString(item.reason),
        }))
        .filter((item) => item.sectionId.length > 0)
    : [];
}

function asReadabilityMetrics(value: unknown): AIRecruiterReadabilityMetrics {
  if (!isRecord(value)) {
    return {
      score: 0,
      averageSentenceLength: 0,
      metricCoverage: 0,
      actionVerbUsage: 0,
      notes: [],
    };
  }

  return {
    score: asNumber(value.score),
    averageSentenceLength: asNumber(value.averageSentenceLength),
    metricCoverage: asNumber(value.metricCoverage),
    actionVerbUsage: asNumber(value.actionVerbUsage),
    notes: asStringArray(value.notes),
  };
}

function asAtsResult(value: unknown): AIATSResult | null {
  if (!isRecord(value) || typeof value.score !== "number") return null;
  return {
    score: value.score,
    issues: asStringArray(value.issues),
    suggestions: asStringArray(value.suggestions),
    keywordGaps: asStringArray(value.keywordGaps),
    hardSkillGaps: asStringArray(value.hardSkillGaps),
    sectionScores: asSectionScores(value.sectionScores),
    recruiterReadability: asReadabilityMetrics(value.recruiterReadability),
    fixChecklist: asChecklistItems(value.fixChecklist),
  };
}

function asReviewResult(value: unknown): AICVReviewResult | null {
  if (!isRecord(value) || typeof value.overallScore !== "number") return null;
  return {
    overallScore: value.overallScore,
    sections: Array.isArray(value.sections) ? value.sections as AICVReviewResult["sections"] : [],
    strengths: asStringArray(value.strengths),
    improvements: asStringArray(value.improvements),
    summary: asString(value.summary),
  };
}

function asJobMatchResult(value: unknown): AIJobMatchResult | null {
  if (!isRecord(value) || typeof value.matchScore !== "number") return null;
  return {
    matchScore: value.matchScore,
    matchingSkills: asStringArray(value.matchingSkills),
    missingSkills: asStringArray(value.missingSkills),
    keywordGaps: asStringArray(value.keywordGaps),
    suggestions: asStringArray(value.suggestions),
    summary: asString(value.summary),
  };
}

function asTailorResult(value: unknown): AITailorResult | null {
  if (!isRecord(value)) return null;
  return {
    suggestedSummary: asString(value.suggestedSummary),
    skillsToAdd: asStringArray(value.skillsToAdd),
    skillsToHighlight: asStringArray(value.skillsToHighlight),
    experienceTips: Array.isArray(value.experienceTips) ? value.experienceTips as AITailorResult["experienceTips"] : [],
    overallStrategy: asString(value.overallStrategy),
  };
}

function canApplyArtifact(artifact: AIArtifact | null | undefined): boolean {
  return Boolean(
    artifact &&
    (AI_AUTO_APPLY_TOOLS as readonly AIToolKind[]).includes(artifact.tool) &&
    artifact.status !== "applied" &&
    artifact.status !== "dismissed"
  );
}

function artifactToClipboardText(artifact: AIArtifact | null | undefined): string {
  if (!artifact) return "";

  if (typeof artifact.output === "string") {
    return artifact.output;
  }

  if (Array.isArray(artifact.output)) {
    return artifact.output.filter((item): item is string => typeof item === "string").join("\n");
  }

  return JSON.stringify(artifact.output, null, 2);
}

function formatArtifactStatus(status: AIArtifact["status"], t: ReturnType<typeof useTranslation>["t"]): string {
  return t(`ai.history.status.${status}`, { defaultValue: status });
}

function HistoryItem({
  artifact,
  selected,
  onSelect,
}: {
  artifact: AIArtifact;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <button
      type="button"
      data-testid={`ai-history-item-${artifact.id}`}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{artifact.title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{artifact.summary || artifact.tool}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {formatArtifactStatus(artifact.status, t)}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {new Date(artifact.createdAt).toLocaleString(i18n.language === "tr" ? "tr-TR" : "en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </p>
      {artifact.model && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("ai.history.model", { model: artifact.model, defaultValue: "Model: {{model}}" })}
        </p>
      )}
    </button>
  );
}

function ResultActions({
  artifact,
  onCopy,
  onApply,
  onDismiss,
  applyPending,
  dismissPending,
}: {
  artifact: AIArtifact | null | undefined;
  onCopy: () => void;
  onApply: () => void;
  onDismiss: () => void;
  applyPending: boolean;
  dismissPending: boolean;
}) {
  const { t } = useTranslation();

  if (!artifact) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onCopy} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent">
        <ClipboardCopy size={12} /> {t("ai.actions.copy")}
      </button>
      {canApplyArtifact(artifact) && (
        <button
          type="button"
          onClick={onApply}
          disabled={applyPending}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {applyPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {t("ai.actions.apply")}
        </button>
      )}
      {artifact.status !== "dismissed" && (
        <button
          type="button"
          onClick={onDismiss}
          disabled={dismissPending}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {dismissPending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          {t("ai.actions.dismiss")}
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {t("ai.emptyState")}
    </div>
  );
}

export function AIAssistPanel({ cvId }: AIAssistPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PanelTab>("review");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [matchJobDescription, setMatchJobDescription] = useState("");
  const [tailorJobDescription, setTailorJobDescription] = useState("");
  const [coverJobDescription, setCoverJobDescription] = useState("");
  const [coverTone, setCoverTone] = useState<"formal" | "conversational" | "technical">("formal");
  const [coverAlternatives, setCoverAlternatives] = useState(false);
  const [atsJobDescription, setAtsJobDescription] = useState("");

  const summaryMut = useGenerateSummary();
  const summaryStream = useStreamingSummary();
  const [streamSummary, setStreamSummary] = useState(true);
  const skillsMut = useSuggestSkills();
  const atsMut = useATSCheck();
  const coverMut = useGenerateCoverLetter();
  const reviewMut = useReviewCV();
  const jobMatchMut = useJobMatch();
  const tailorMut = useTailorCV();
  const healthQuery = useAIHealth();
  const historyQuery = useAIArtifacts({ cvId, limit: 8 });
  const applyMut = useApplyAIArtifact();
  const dismissMut = useDismissAIArtifact();

  const artifacts = [...(historyQuery.data ?? [])].sort(
    (left, right) => new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime()
  );
  const selectedArtifact = selectedArtifactId ? artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null : null;

  const getLatestArtifact = (tool: AIToolKind) => {
    if (selectedArtifact?.tool === tool) {
      return selectedArtifact;
    }
    return artifacts.find((artifact) => artifact.tool === tool && artifact.status !== "dismissed") ?? null;
  };

  const currentTool = TAB_TOOL[activeTab];
  const currentMutationArtifact =
    (activeTab === "summary" ? summaryMut.data?.artifact : null) ||
    (activeTab === "skills" ? skillsMut.data?.artifact : null) ||
    (activeTab === "ats" ? atsMut.data?.artifact : null) ||
    (activeTab === "review" ? reviewMut.data?.artifact : null) ||
    (activeTab === "match" ? jobMatchMut.data?.artifact : null) ||
    (activeTab === "tailor" ? tailorMut.data?.artifact : null) ||
    (activeTab === "cover" ? coverMut.data?.artifact : null);
  const currentStatusOverrideArtifact =
    (applyMut.data?.artifact.tool === currentTool ? applyMut.data.artifact : null) ||
    (dismissMut.data?.tool === currentTool ? dismissMut.data : null);
  const selectedArtifactWithLatestStatus =
    selectedArtifact && currentStatusOverrideArtifact?.id === selectedArtifact.id
      ? currentStatusOverrideArtifact
      : selectedArtifact;
  const currentMutationArtifactWithLatestStatus = currentMutationArtifact
    ? currentStatusOverrideArtifact?.id === currentMutationArtifact.id
      ? currentStatusOverrideArtifact
      : artifacts.find((artifact) => artifact.id === currentMutationArtifact.id) ?? currentMutationArtifact
    : null;
  const currentArtifact =
    (selectedArtifactWithLatestStatus?.tool === currentTool ? selectedArtifactWithLatestStatus : null) ??
    currentMutationArtifactWithLatestStatus ??
    getLatestArtifact(currentTool);

  const summaryText =
    summaryMut.data?.summary ??
    (selectedArtifact?.tool === "summary" ? asString(selectedArtifact.output) : asString(getLatestArtifact("summary")?.output));
  const suggestedSkills =
    skillsMut.data?.skills ??
    (selectedArtifact?.tool === "skills" ? asStringArray(selectedArtifact.output) : asStringArray(getLatestArtifact("skills")?.output));
  const atsResult =
    atsMut.data ??
    (selectedArtifact?.tool === "ats" ? asAtsResult(selectedArtifact.output) : asAtsResult(getLatestArtifact("ats")?.output));
  const reviewResult =
    reviewMut.data ??
    (selectedArtifact?.tool === "review" ? asReviewResult(selectedArtifact.output) : asReviewResult(getLatestArtifact("review")?.output));
  const matchResult =
    jobMatchMut.data ??
    (selectedArtifact?.tool === "job_match" ? asJobMatchResult(selectedArtifact.output) : asJobMatchResult(getLatestArtifact("job_match")?.output));
  const tailorResult =
    tailorMut.data ??
    (selectedArtifact?.tool === "tailor" ? asTailorResult(selectedArtifact.output) : asTailorResult(getLatestArtifact("tailor")?.output));
  const coverLetterText =
    coverMut.data?.coverLetter ??
    (selectedArtifact?.tool === "cover_letter" ? asString(selectedArtifact.output) : asString(getLatestArtifact("cover_letter")?.output));

  const aiUnavailable = healthQuery.data ? !healthQuery.data.ready : false;

  const copyToClipboard = (text: string) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    toast.success(t("ai.copySuccess"));
  };

  const handleSelectHistory = (artifact: AIArtifact) => {
    const nextTab = TOOL_TAB[artifact.tool];
    if (!nextTab) return;
    setActiveTab(nextTab);
    setSelectedArtifactId(artifact.id);
  };

  const handleApplyCurrentArtifact = () => {
    if (!currentArtifact) return;
    applyMut.mutate(currentArtifact.id);
  };

  const handleDismissCurrentArtifact = () => {
    if (!currentArtifact) return;
    dismissMut.mutate(currentArtifact.id, {
      onSuccess: () => {
        if (selectedArtifactId === currentArtifact.id) {
          setSelectedArtifactId(null);
        }
      },
    });
  };

  const tabs = [
    { id: "review" as const, label: t("ai.tabs.review") },
    { id: "ats" as const, label: t("ai.tabs.ats") },
    { id: "match" as const, label: t("ai.tabs.match") },
    { id: "tailor" as const, label: t("ai.tabs.tailor") },
    { id: "summary" as const, label: t("ai.tabs.summary") },
    { id: "skills" as const, label: t("ai.tabs.skills") },
    { id: "cover" as const, label: t("ai.tabs.cover") },
  ];

  return (
    <div data-testid="ai-assist-panel" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <div>
            <h3 className="text-sm font-semibold">{t("ai.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
          </div>
        </div>
        {currentArtifact && (
          <span data-testid="ai-current-artifact-status" className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {formatArtifactStatus(currentArtifact.status, t)}
          </span>
        )}
      </div>

      {healthQuery.data && (
        <div className={cn(
          "rounded-lg border p-3 text-xs",
          healthQuery.data.ready
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
        )}>
          <div className="flex items-start gap-2">
            {healthQuery.data.ready ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            <div className="space-y-1">
              <p className="font-medium">
                {healthQuery.data.ready ? t("ai.health.ready") : t("ai.health.unavailable")}
              </p>
              <p>
                {t("ai.health.model", { model: healthQuery.data.model })}
              </p>
              {healthQuery.data.models && (
                <div className="grid gap-1 pt-1 sm:grid-cols-2">
                  <p>{t("ai.health.writerModel", { model: healthQuery.data.models.writer, defaultValue: "Writer: {{model}}" })}</p>
                  <p>{t("ai.health.analysisModel", { model: healthQuery.data.models.structured, defaultValue: "Analyzer: {{model}}" })}</p>
                  <p>{t("ai.health.repoModel", { model: healthQuery.data.models.repoAnalysis, defaultValue: "Repo: {{model}}" })}</p>
                  <p>{t("ai.health.embeddingModel", { model: healthQuery.data.models.embedding, defaultValue: "Embedding: {{model}}" })}</p>
                </div>
              )}
              {!healthQuery.data.ready && healthQuery.data.readinessIssues.length > 0 && (
                <p>{healthQuery.data.readinessIssues.join(" • ")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                data-testid={`ai-tab-${tab.id}`}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedArtifactId(null);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs transition-colors",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "review" && (
            <div className="space-y-3">
              <button
                data-testid="ai-review-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  reviewMut.mutate(cvId);
                }}
                disabled={reviewMut.isPending || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {reviewMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                {t("ai.actions.reviewCv")}
              </button>

              {reviewResult ? (
                <div data-testid="ai-review-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold" style={{ color: reviewResult.overallScore >= 80 ? "#16a34a" : reviewResult.overallScore >= 50 ? "#ca8a04" : "#dc2626" }}>
                      {reviewResult.overallScore}
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                      <p className="text-xs text-muted-foreground">{t("ai.review.overallScore")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {reviewResult.sections.map((section, index) => (
                      <div key={`${section.name}-${index}`} className="rounded border p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{section.name}</span>
                          <span className="text-xs font-bold">{section.score}/100</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{section.feedback}</p>
                      </div>
                    ))}
                  </div>

                  {reviewResult.strengths.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-600">{t("ai.review.strengths")}</p>
                      <ul className="space-y-1">
                        {reviewResult.strengths.map((strength) => (
                          <li key={strength} className="text-xs text-green-700">✓ {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reviewResult.improvements.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-amber-600">{t("ai.review.areasToImprove")}</p>
                      <ul className="space-y-1">
                        {reviewResult.improvements.map((item) => (
                          <li key={item} className="text-xs text-amber-700">→ {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reviewResult.summary && (
                    <div className="rounded border bg-indigo-50 p-3 dark:bg-indigo-950/50">
                      <p className="text-xs text-indigo-900 dark:text-indigo-300">{reviewResult.summary}</p>
                    </div>
                  )}

                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(artifactToClipboardText(currentArtifact))}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "match" && (
            <div className="space-y-3">
              <textarea
                data-testid="ai-match-job-description"
                value={matchJobDescription}
                onChange={(event) => setMatchJobDescription(event.target.value)}
                placeholder={t("ai.placeholders.matchJobDescription")}
                className="w-full rounded-lg border p-2 text-xs"
                rows={4}
              />
              <button
                data-testid="ai-match-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  jobMatchMut.mutate({ cvId, jobDescription: matchJobDescription });
                }}
                disabled={jobMatchMut.isPending || !matchJobDescription.trim() || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {jobMatchMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                {t("ai.actions.analyzeMatch")}
              </button>

              {matchResult ? (
                <div data-testid="ai-match-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold" style={{ color: matchResult.matchScore >= 75 ? "#16a34a" : matchResult.matchScore >= 50 ? "#ca8a04" : "#dc2626" }}>
                      {matchResult.matchScore}%
                    </div>
                    <span className="text-sm text-muted-foreground">{t("ai.match.matchScore")}</span>
                  </div>

                  {matchResult.matchingSkills.length > 0 && (
                    <TagGroup title={t("ai.match.matchingSkills")} tone="green" items={matchResult.matchingSkills} />
                  )}
                  {matchResult.missingSkills.length > 0 && (
                    <TagGroup title={t("ai.match.missingSkills")} tone="red" items={matchResult.missingSkills} />
                  )}
                  {matchResult.keywordGaps.length > 0 && (
                    <TagGroup title={t("ai.match.keywordGaps")} tone="amber" items={matchResult.keywordGaps} />
                  )}
                  {matchResult.suggestions.length > 0 && (
                    <SimpleList title={t("ai.match.suggestions")} items={matchResult.suggestions} prefix="→" />
                  )}
                  {matchResult.summary && (
                    <div className="rounded border bg-cyan-50 p-3 dark:bg-cyan-950/50">
                      <p className="text-xs text-cyan-900 dark:text-cyan-300">{matchResult.summary}</p>
                    </div>
                  )}

                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(artifactToClipboardText(currentArtifact))}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "tailor" && (
            <div className="space-y-3">
              <textarea
                data-testid="ai-tailor-job-description"
                value={tailorJobDescription}
                onChange={(event) => setTailorJobDescription(event.target.value)}
                placeholder={t("ai.placeholders.tailorJobDescription")}
                className="w-full rounded-lg border p-2 text-xs"
                rows={4}
              />
              <button
                data-testid="ai-tailor-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  tailorMut.mutate({ cvId, jobDescription: tailorJobDescription });
                }}
                disabled={tailorMut.isPending || !tailorJobDescription.trim() || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {tailorMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {t("ai.actions.tailorCv")}
              </button>

              {tailorResult ? (
                <div data-testid="ai-tailor-result" className="space-y-3 rounded-lg border bg-card p-4">
                  {tailorResult.suggestedSummary && (
                    <div>
                      <p className="mb-1 text-xs font-medium">{t("ai.tailor.suggestedSummary")}</p>
                      <div className="rounded border bg-violet-50 p-3 dark:bg-violet-950/50">
                        <p className="text-xs whitespace-pre-line">{tailorResult.suggestedSummary}</p>
                      </div>
                    </div>
                  )}

                  {tailorResult.skillsToAdd.length > 0 && (
                    <TagGroup title={t("ai.tailor.skillsToAdd")} tone="green" items={tailorResult.skillsToAdd} prefix="+" />
                  )}
                  {tailorResult.skillsToHighlight.length > 0 && (
                    <TagGroup title={t("ai.tailor.skillsToHighlight")} tone="blue" items={tailorResult.skillsToHighlight} prefix="★" />
                  )}

                  {tailorResult.experienceTips.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium">{t("ai.tailor.experienceTips")}</p>
                      <div className="space-y-2">
                        {tailorResult.experienceTips.map((tip, index) => (
                          <div key={`${tip.company}-${index}`} className="rounded border p-3">
                            <p className="text-xs font-medium">{tip.company}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{tip.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tailorResult.overallStrategy && (
                    <div className="rounded border bg-violet-50 p-3 dark:bg-violet-950/50">
                      <p className="mb-1 text-xs font-medium text-violet-700 dark:text-violet-300">{t("ai.tailor.overallStrategy")}</p>
                      <p className="text-xs text-violet-900 dark:text-violet-300">{tailorResult.overallStrategy}</p>
                    </div>
                  )}

                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(artifactToClipboardText(currentArtifact))}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "summary" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  data-testid="ai-summary-stream-toggle"
                  checked={streamSummary}
                  onChange={(e) => setStreamSummary(e.target.checked)}
                />
                {t("ai.actions.streamLive", "Stream live")}
              </label>
              <button
                data-testid="ai-summary-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  if (streamSummary) {
                    summaryStream.startStream(cvId);
                  } else {
                    summaryMut.mutate(cvId);
                  }
                }}
                disabled={summaryMut.isPending || summaryStream.isStreaming || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {(summaryMut.isPending || summaryStream.isStreaming) ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {t("ai.actions.generateSummary")}
              </button>

              {summaryStream.isStreaming && summaryStream.text ? (
                <div data-testid="ai-summary-stream" className="rounded-lg border bg-card p-4">
                  <p className="text-sm whitespace-pre-line">{summaryStream.text}<span className="ml-1 inline-block h-3 w-2 animate-pulse bg-purple-600" /></p>
                </div>
              ) : null}

              {summaryStream.error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{summaryStream.error}</div>
              ) : null}

              {summaryText ? (
                <div data-testid="ai-summary-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="rounded border bg-purple-50 p-3 dark:bg-purple-950/50">
                    <p className="text-sm whitespace-pre-line">{summaryText}</p>
                  </div>
                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(summaryText)}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="space-y-3">
              <button
                data-testid="ai-skills-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  skillsMut.mutate(cvId);
                }}
                disabled={skillsMut.isPending || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {skillsMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {t("ai.actions.suggestSkills")}
              </button>

              {suggestedSkills.length > 0 ? (
                <div data-testid="ai-skills-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap gap-2">
                    {suggestedSkills.map((skill) => (
                      <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(suggestedSkills.join("\n"))}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "ats" && (
            <div className="space-y-3">
              <textarea
                data-testid="ai-ats-job-description"
                value={atsJobDescription}
                onChange={(event) => setAtsJobDescription(event.target.value)}
                placeholder={t("ai.placeholders.atsJobDescription", {
                  defaultValue: "Paste a target job description to unlock keyword gaps, hard-skill gaps, and a fix checklist.",
                })}
                className="w-full rounded-lg border p-2 text-xs"
                rows={4}
              />
              <button
                data-testid="ai-ats-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  atsMut.mutate({ cvId, jobDescription: atsJobDescription || undefined });
                }}
                disabled={atsMut.isPending || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {atsMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {t("ai.actions.runAts")}
              </button>

              {atsResult ? (
                <div data-testid="ai-ats-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label={t("ai.ats.overallScore", { defaultValue: "ATS score" })}
                      value={`${atsResult.score}/100`}
                      tone={atsResult.score >= 70 ? "green" : atsResult.score >= 40 ? "amber" : "red"}
                    />
                    <MetricCard
                      label={t("ai.ats.readability", { defaultValue: "Recruiter readability" })}
                      value={`${atsResult.recruiterReadability.score}/100`}
                      tone={atsResult.recruiterReadability.score >= 70 ? "green" : atsResult.recruiterReadability.score >= 40 ? "amber" : "red"}
                      meta={`${atsResult.recruiterReadability.averageSentenceLength.toFixed(1)} ${t("ai.ats.wordsPerSentence", { defaultValue: "avg words/sentence" })}`}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label={t("ai.ats.metricCoverage", { defaultValue: "Measured bullet coverage" })}
                      value={`${atsResult.recruiterReadability.metricCoverage}%`}
                      tone={atsResult.recruiterReadability.metricCoverage >= 50 ? "green" : atsResult.recruiterReadability.metricCoverage >= 25 ? "amber" : "red"}
                    />
                    <MetricCard
                      label={t("ai.ats.actionVerbUsage", { defaultValue: "Action verb usage" })}
                      value={`${atsResult.recruiterReadability.actionVerbUsage}%`}
                      tone={atsResult.recruiterReadability.actionVerbUsage >= 50 ? "green" : atsResult.recruiterReadability.actionVerbUsage >= 25 ? "amber" : "red"}
                    />
                  </div>

                  {atsResult.sectionScores.length > 0 && (
                    <SectionScoreList
                      title={t("ai.ats.sectionScores", { defaultValue: "Section scores" })}
                      items={atsResult.sectionScores}
                    />
                  )}

                  {atsResult.keywordGaps.length > 0 && (
                    <TagGroup title={t("ai.ats.keywordGaps", { defaultValue: "Keyword gaps" })} tone="amber" items={atsResult.keywordGaps} />
                  )}
                  {atsResult.hardSkillGaps.length > 0 && (
                    <TagGroup title={t("ai.ats.hardSkillGaps", { defaultValue: "Missing hard skills" })} tone="red" items={atsResult.hardSkillGaps} />
                  )}

                  {atsResult.issues.length > 0 && (
                    <SimpleList title={t("ai.ats.issues")} items={atsResult.issues} prefix="•" tone="red" />
                  )}
                  {atsResult.suggestions.length > 0 && (
                    <SimpleList title={t("ai.ats.suggestions")} items={atsResult.suggestions} prefix="✓" tone="green" />
                  )}
                  {atsResult.recruiterReadability.notes.length > 0 && (
                    <SimpleList
                      title={t("ai.ats.readabilityNotes", { defaultValue: "Readability notes" })}
                      items={atsResult.recruiterReadability.notes}
                      prefix="→"
                    />
                  )}
                  {atsResult.fixChecklist.length > 0 && (
                    <FixChecklistList
                      title={t("ai.ats.fixChecklist", { defaultValue: "Fix this checklist" })}
                      items={atsResult.fixChecklist}
                    />
                  )}

                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(artifactToClipboardText(currentArtifact))}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}

          {activeTab === "cover" && (
            <div className="space-y-3">
              <textarea
                data-testid="ai-cover-job-description"
                value={coverJobDescription}
                onChange={(event) => setCoverJobDescription(event.target.value)}
                placeholder={t("ai.placeholders.coverJobDescription")}
                className="w-full rounded-lg border p-2 text-xs"
                rows={3}
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t("ai.coverLetter.tone", "Tone")}:</span>
                {(["formal", "conversational", "technical"] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setCoverTone(tone)}
                    data-testid={`ai-cover-tone-${tone}`}
                    className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition ${
                      coverTone === tone
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {t(`ai.coverLetter.tones.${tone}`, tone)}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  data-testid="ai-cover-alternatives"
                  checked={coverAlternatives}
                  onChange={(e) => setCoverAlternatives(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                {t("ai.coverLetter.alternatives", "Generate 2 alternative drafts")}
              </label>

              <button
                data-testid="ai-cover-submit"
                type="button"
                onClick={() => {
                  setSelectedArtifactId(null);
                  coverMut.mutate({
                    cvId,
                    jobDescription: coverJobDescription || undefined,
                    tone: coverTone,
                    alternatives: coverAlternatives,
                  });
                }}
                disabled={coverMut.isPending || aiUnavailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {coverMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {t("ai.actions.generateCoverLetter")}
              </button>

              {coverLetterText ? (
                <div data-testid="ai-cover-result" className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="rounded border bg-amber-50 p-3 dark:bg-amber-950/50">
                    <p className="text-sm whitespace-pre-line">{coverLetterText}</p>
                  </div>

                  {coverMut.data?.alternatives && coverMut.data.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t("ai.coverLetter.alternativesHeading", "Alternative drafts")}
                      </p>
                      {coverMut.data.alternatives.map((alt, idx) => (
                        <div
                          key={idx}
                          data-testid={`ai-cover-alt-${idx}`}
                          className="rounded border border-dashed bg-muted/40 p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {t("ai.coverLetter.variant", "Variant")} {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(alt)}
                              className="text-[11px] text-amber-700 hover:underline dark:text-amber-400"
                            >
                              {t("common.copy", "Copy")}
                            </button>
                          </div>
                          <p className="text-sm whitespace-pre-line">{alt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <ResultActions
                    artifact={currentArtifact}
                    onCopy={() => copyToClipboard(coverLetterText)}
                    onApply={handleApplyCurrentArtifact}
                    onDismiss={handleDismissCurrentArtifact}
                    applyPending={applyMut.isPending}
                    dismissPending={dismissMut.isPending}
                  />
                </div>
              ) : <EmptyState />}
            </div>
          )}
        </div>

        <aside className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <History size={14} className="text-muted-foreground" />
            <h4 className="text-sm font-semibold">{t("ai.history.title")}</h4>
          </div>

          {historyQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> {t("common.loading")}
            </div>
          ) : artifacts.length > 0 ? (
            <div className="space-y-2">
              {artifacts.map((artifact) => (
                <HistoryItem
                  key={artifact.id}
                  artifact={artifact}
                  selected={selectedArtifactId === artifact.id}
                  onSelect={() => handleSelectHistory(artifact)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("ai.history.empty")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function TagGroup({
  title,
  items,
  tone,
  prefix,
}: {
  title: string;
  items: string[];
  tone: "green" | "red" | "amber" | "blue";
  prefix?: string;
}) {
  const toneClass = {
    green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  }[tone];

  return (
    <div>
      <p className="mb-1 text-xs font-medium">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={`${prefix ?? ""}-${item}`} className={cn("rounded-full px-2 py-0.5 text-xs", toneClass)}>
            {prefix ? `${prefix} ` : ""}{item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SimpleList({
  title,
  items,
  prefix,
  tone,
}: {
  title: string;
  items: string[];
  prefix: string;
  tone?: "red" | "green";
}) {
  const toneClass = tone === "red" ? "text-red-700 dark:text-red-400" : tone === "green" ? "text-green-700 dark:text-green-400" : "text-muted-foreground";

  return (
    <div>
      <p className="mb-1 text-xs font-medium">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className={cn("text-xs", toneClass)}>{prefix} {item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  meta,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red";
  meta?: string;
}) {
  const toneClass = {
    green: "border-green-200 bg-green-50 text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-200",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200",
  }[tone];

  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {meta && <p className="mt-1 text-xs opacity-80">{meta}</p>}
    </div>
  );
}

function SectionScoreList({ title, items }: { title: string; items: AIATSSectionScore[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.sectionId} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium capitalize">{item.sectionId}</span>
              <span className="text-xs font-semibold">{item.score}/100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  item.score >= 70 ? "bg-green-500" : item.score >= 40 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.max(6, item.score)}%` }}
              />
            </div>
            {item.reason && <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FixChecklistList({ title, items }: { title: string; items: AIATSFixChecklistItem[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
              </div>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                item.priority === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : item.priority === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}>
                {item.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
