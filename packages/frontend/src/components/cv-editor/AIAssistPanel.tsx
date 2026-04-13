import { useState } from "react";
import {
  useGenerateSummary,
  useSuggestSkills,
  useATSCheck,
  useGenerateCoverLetter,
  useReviewCV,
  useJobMatch,
  useTailorCV,
} from "@/hooks/useAI";
import {
  Sparkles,
  Loader2,
  ClipboardCopy,
  CheckCircle,
  AlertTriangle,
  Star,
  Target,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AIAssistPanelProps {
  cvId: string;
}

export function AIAssistPanel({ cvId }: AIAssistPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("review");

  const summaryMut = useGenerateSummary();
  const skillsMut = useSuggestSkills();
  const atsMut = useATSCheck();
  const coverMut = useGenerateCoverLetter();
  const reviewMut = useReviewCV();
  const jobMatchMut = useJobMatch();
  const tailorMut = useTailorCV();
  const [jobDesc, setJobDesc] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("ai.copySuccess"));
  };

  const tabs = [
    { id: "review", label: t("ai.tabs.review") },
    { id: "ats", label: t("ai.tabs.ats") },
    { id: "match", label: t("ai.tabs.match") },
    { id: "tailor", label: t("ai.tabs.tailor") },
    { id: "summary", label: t("ai.tabs.summary") },
    { id: "skills", label: t("ai.tabs.skills") },
    { id: "cover", label: t("ai.tabs.cover") },
  ];

  return (
    <div data-testid="ai-assist-panel" className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-purple-500" />
        <h3 className="text-sm font-semibold">{t("ai.title")}</h3>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            data-testid={`ai-tab-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={`rounded px-2 py-1 text-xs ${
              activeTab === t.id ? "bg-primary text-white" : "hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CV Review ─────────────────────────────────── */}
      {activeTab === "review" && (
        <div className="space-y-3">
          <button
            data-testid="ai-review-submit"
            onClick={() => reviewMut.mutate(cvId)}
            disabled={reviewMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {reviewMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
            {t("ai.actions.reviewCv")}
          </button>
          {reviewMut.data && (
            <div className="space-y-3">
              {/* Overall score gauge */}
              <div className="flex items-center gap-3">
                <div
                  className="text-4xl font-bold"
                  style={{
                    color:
                      reviewMut.data.overallScore >= 80
                        ? "#16a34a"
                        : reviewMut.data.overallScore >= 50
                          ? "#ca8a04"
                          : "#dc2626",
                  }}
                >
                  {reviewMut.data.overallScore}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                  <p className="text-xs text-muted-foreground">{t("ai.review.overallScore")}</p>
                </div>
              </div>

              {/* Section scores */}
              <div className="space-y-2">
                {reviewMut.data.sections.map((sec, i) => (
                  <div key={i} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{sec.name}</span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: sec.score >= 70 ? "#16a34a" : sec.score >= 40 ? "#ca8a04" : "#dc2626" }}
                      >
                        {sec.score}/100
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${sec.score}%`,
                          backgroundColor: sec.score >= 70 ? "#16a34a" : sec.score >= 40 ? "#ca8a04" : "#dc2626",
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{sec.feedback}</p>
                  </div>
                ))}
              </div>

              {/* Strengths */}
              {reviewMut.data.strengths.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-green-600">{t("ai.review.strengths")}</p>
                  <ul className="space-y-1">
                    {reviewMut.data.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-green-700">✓ {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {reviewMut.data.improvements.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-600">{t("ai.review.areasToImprove")}</p>
                  <ul className="space-y-1">
                    {reviewMut.data.improvements.map((s, i) => (
                      <li key={i} className="text-xs text-amber-700">→ {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              <div className="rounded border bg-indigo-50 p-2 dark:bg-indigo-950">
                <p className="text-xs text-indigo-800 dark:text-indigo-300">{reviewMut.data.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Job Match ─────────────────────────────────── */}
      {activeTab === "match" && (
        <div className="space-y-3">
          <textarea
            data-testid="ai-match-job-description"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder={t("ai.placeholders.matchJobDescription")}
            className="w-full rounded-lg border p-2 text-xs"
            rows={4}
          />
          <button
            data-testid="ai-match-submit"
            onClick={() => jobMatchMut.mutate({ cvId, jobDescription: jobDesc })}
            disabled={jobMatchMut.isPending || !jobDesc.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {jobMatchMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
            {t("ai.actions.analyzeMatch")}
          </button>
          {jobMatchMut.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="text-4xl font-bold"
                  style={{
                    color:
                      jobMatchMut.data.matchScore >= 75
                        ? "#16a34a"
                        : jobMatchMut.data.matchScore >= 50
                          ? "#ca8a04"
                          : "#dc2626",
                  }}
                >
                  {jobMatchMut.data.matchScore}%
                </div>
                <span className="text-sm text-muted-foreground">{t("ai.match.matchScore")}</span>
              </div>

              {jobMatchMut.data.matchingSkills.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-green-600">{t("ai.match.matchingSkills")}</p>
                  <div className="flex flex-wrap gap-1">
                    {jobMatchMut.data.matchingSkills.map((s, i) => (
                      <span key={i} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {jobMatchMut.data.missingSkills.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-red-600">{t("ai.match.missingSkills")}</p>
                  <div className="flex flex-wrap gap-1">
                    {jobMatchMut.data.missingSkills.map((s, i) => (
                      <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {jobMatchMut.data.keywordGaps.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-600">{t("ai.match.keywordGaps")}</p>
                  <div className="flex flex-wrap gap-1">
                    {jobMatchMut.data.keywordGaps.map((s, i) => (
                      <span key={i} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {jobMatchMut.data.suggestions.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium">{t("ai.match.suggestions")}</p>
                  <ul className="space-y-1">
                    {jobMatchMut.data.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">→ {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded border bg-cyan-50 p-2 dark:bg-cyan-950">
                <p className="text-xs text-cyan-800 dark:text-cyan-300">{jobMatchMut.data.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tailor CV ─────────────────────────────────── */}
      {activeTab === "tailor" && (
        <div className="space-y-3">
          <textarea
            data-testid="ai-tailor-job-description"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder={t("ai.placeholders.tailorJobDescription")}
            className="w-full rounded-lg border p-2 text-xs"
            rows={4}
          />
          <button
            data-testid="ai-tailor-submit"
            onClick={() => tailorMut.mutate({ cvId, jobDescription: jobDesc })}
            disabled={tailorMut.isPending || !jobDesc.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {tailorMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {t("ai.actions.tailorCv")}
          </button>
          {tailorMut.data && (
            <div className="space-y-3">
              {/* Suggested summary */}
              <div>
                <p className="mb-1 text-xs font-medium">{t("ai.tailor.suggestedSummary")}</p>
                <div className="relative rounded border bg-violet-50 p-2 dark:bg-violet-950">
                  <p className="pr-6 text-xs">{tailorMut.data.suggestedSummary}</p>
                  <button
                    onClick={() => copyToClipboard(tailorMut.data!.suggestedSummary)}
                    className="absolute right-1 top-1 rounded p-1 hover:bg-violet-100 dark:hover:bg-violet-900"
                  >
                    <ClipboardCopy size={12} />
                  </button>
                </div>
              </div>

              {/* Skills to add/highlight */}
              {tailorMut.data.skillsToAdd.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-green-600">{t("ai.tailor.skillsToAdd")}</p>
                  <div className="flex flex-wrap gap-1">
                    {tailorMut.data.skillsToAdd.map((s, i) => (
                      <span key={i} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">+ {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {tailorMut.data.skillsToHighlight.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-blue-600">{t("ai.tailor.skillsToHighlight")}</p>
                  <div className="flex flex-wrap gap-1">
                    {tailorMut.data.skillsToHighlight.map((s, i) => (
                      <span key={i} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">★ {s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience tips */}
              {tailorMut.data.experienceTips.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium">{t("ai.tailor.experienceTips")}</p>
                  <div className="space-y-1">
                    {tailorMut.data.experienceTips.map((tip, i) => (
                      <div key={i} className="rounded border p-2">
                        <span className="text-xs font-medium">{tip.company}</span>
                        <p className="text-xs text-muted-foreground">{tip.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall strategy */}
              <div className="rounded border bg-violet-50 p-2 dark:bg-violet-950">
                <p className="mb-1 text-xs font-medium text-violet-700 dark:text-violet-300">{t("ai.tailor.overallStrategy")}</p>
                <p className="text-xs text-violet-800 dark:text-violet-300">{tailorMut.data.overallStrategy}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Summary ───────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="space-y-3">
          <button
            data-testid="ai-summary-submit"
            onClick={() => summaryMut.mutate(cvId)}
            disabled={summaryMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {summaryMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t("ai.actions.generateSummary")}
          </button>
          {summaryMut.data && (
            <div className="relative rounded-lg border bg-purple-50 p-3 dark:bg-purple-950">
              <p className="pr-8 text-sm whitespace-pre-line">{summaryMut.data}</p>
              <button
                onClick={() => copyToClipboard(summaryMut.data!)}
                className="absolute right-2 top-2 rounded p-1 hover:bg-purple-100 dark:hover:bg-purple-900"
              >
                <ClipboardCopy size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Skills ────────────────────────────────────── */}
      {activeTab === "skills" && (
        <div className="space-y-3">
          <button
            data-testid="ai-skills-submit"
            onClick={() => skillsMut.mutate(cvId)}
            disabled={skillsMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {skillsMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t("ai.actions.suggestSkills")}
          </button>
          {skillsMut.data && (
            <div className="flex flex-wrap gap-2">
              {skillsMut.data.map((skill, i) => (
                <span key={i} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ATS Check ─────────────────────────────────── */}
      {activeTab === "ats" && (
        <div className="space-y-3">
          <button
            data-testid="ai-ats-submit"
            onClick={() => atsMut.mutate(cvId)}
            disabled={atsMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {atsMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {t("ai.actions.runAts")}
          </button>
          {atsMut.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="text-3xl font-bold"
                  style={{ color: atsMut.data.score >= 70 ? "#16a34a" : atsMut.data.score >= 40 ? "#ca8a04" : "#dc2626" }}
                >
                  {atsMut.data.score}
                </div>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {atsMut.data.issues.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertTriangle size={12} /> {t("ai.ats.issues")}
                  </p>
                  <ul className="space-y-1 text-xs">
                    {atsMut.data.issues.map((issue, i) => (
                      <li key={i} className="text-red-700 dark:text-red-400">• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {atsMut.data.suggestions.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-green-600">{t("ai.ats.suggestions")}</p>
                  <ul className="space-y-1 text-xs">
                    {atsMut.data.suggestions.map((s, i) => (
                      <li key={i} className="text-green-700 dark:text-green-400">✓ {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Cover Letter ──────────────────────────────── */}
      {activeTab === "cover" && (
        <div className="space-y-3">
          <textarea
            data-testid="ai-cover-job-description"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder={t("ai.placeholders.coverJobDescription")}
            className="w-full rounded-lg border p-2 text-xs"
            rows={3}
          />
          <button
            data-testid="ai-cover-submit"
            onClick={() => coverMut.mutate({ cvId, jobDescription: jobDesc || undefined })}
            disabled={coverMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {coverMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t("ai.actions.generateCoverLetter")}
          </button>
          {coverMut.data && (
            <div className="relative rounded-lg border bg-amber-50 p-3 dark:bg-amber-950">
              <p className="pr-8 text-sm whitespace-pre-line">{coverMut.data}</p>
              <button
                onClick={() => copyToClipboard(coverMut.data!)}
                className="absolute right-2 top-2 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <ClipboardCopy size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
