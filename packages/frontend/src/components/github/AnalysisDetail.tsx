import type { DeepAnalysisResult } from "@cvbuilder/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Star,
  GitFork,
  Eye,
  AlertCircle,
  FileText,
  Code,
  GitCommit,
  Tag,
  ExternalLink,
  Calendar,
  Users,
  FolderTree,
  Package,
  Shield,
  Sparkles,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Workflow,
  Activity,
  Layers,
  Lightbulb,
  TrendingUp,
  Gauge,
  Target,
} from "lucide-react";
import { ImportToCV } from "./ImportToCV";
import { normalizeAppLocale } from "@/i18n/locale";

// ── Interfaces ──

interface LanguageBreakdown {
  language: string;
  percentage: number;
  bytes: number;
}

interface RecentCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface FileTreeInfo {
  totalFiles: number;
  totalDirectories: number;
  maxDepth: number;
  filesByExtension: Record<string, number>;
  configFiles: string[];
  projectType: string;
  keyDirectories: string[];
}

interface DependencyInfo {
  source: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  frameworks: string[];
  testingTools: string[];
  buildTools: string[];
  linters: string[];
  databases: string[];
  uiLibraries: string[];
}

interface ContributorInfo {
  login: string;
  avatarUrl: string;
  contributions: number;
}

interface CICDInfo {
  hasGitHubActions: boolean;
  workflowFiles: string[];
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
}

interface CommitAnalytics {
  totalCommits: number;
  recentActivityCount: number;
  averagePerWeek: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  activeDays: number;
  authorBreakdown: Record<string, number>;
  usesConventionalCommits: boolean;
}

interface CodeQualityMetrics {
  hasTests: boolean;
  hasCI: boolean;
  hasLinting: boolean;
  hasTypeScript: boolean;
  hasDocker: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasChangelog: boolean;
  qualityScore: number;
}

interface AIAnalysisInsight {
  projectSummary: string;
  architectureAnalysis: string;
  techStackAssessment: string;
  complexityLevel: "simple" | "medium" | "complex";
  detectedSkills: string[];
  strengths: string[];
  improvements: string[];
  cvReadyDescription: string;
  cvHighlights: string[];
}

type AnalysisResult = DeepAnalysisResult & {
  languages: LanguageBreakdown[];
  recentCommits: RecentCommit[];
  fileTree?: FileTreeInfo;
  dependencyInfo?: DependencyInfo | null;
  contributors?: ContributorInfo[];
  cicd?: CICDInfo;
  commitAnalytics?: CommitAnalytics;
  codeQuality?: CodeQualityMetrics;
  aiInsights?: AIAnalysisInsight | null;
  readmeContent?: string | null;
};

type TabId = "overview" | "techstack" | "quality" | "activity" | "insights" | "devops";

interface AnalysisDetailProps {
  result: DeepAnalysisResult;
  analysisId: string;
  onClose?: () => void;
}

export function AnalysisDetail({ result, analysisId, onClose }: AnalysisDetailProps) {
  const { t, i18n } = useTranslation();
  const data = result as AnalysisResult;
  const hasDeepData = !!data.fileTree;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copied, setCopied] = useState(false);
  const dateLocale = normalizeAppLocale(i18n.language) === "tr" ? "tr-TR" : "en-US";

  const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "overview", label: t("github.overview"), icon: <Layers size={13} />, show: true },
    { id: "techstack", label: t("github.techStack"), icon: <Package size={13} />, show: hasDeepData },
    { id: "quality", label: t("github.codeQuality"), icon: <Shield size={13} />, show: hasDeepData },
    { id: "activity", label: t("github.activity"), icon: <Activity size={13} />, show: hasDeepData },
    { id: "insights", label: t("github.aiInsights"), icon: <Sparkles size={13} />, show: hasDeepData },
    { id: "devops", label: t("github.devops"), icon: <Workflow size={13} />, show: hasDeepData },
  ];

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{data.name}</h3>
            {data.isArchived && (
              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t("github.archived")}</span>
            )}
            {data.isFork && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t("github.fork")}</span>
            )}
            {data.fileTree && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                data.fileTree.projectType === "fullstack" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                data.fileTree.projectType === "frontend" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                data.fileTree.projectType === "backend" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                data.fileTree.projectType === "monorepo" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {t(`github.projectTypes.${data.fileTree.projectType}`, { defaultValue: data.fileTree.projectType })}
              </span>
            )}
            {data.aiInsights && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                data.aiInsights.complexityLevel === "complex" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                data.aiInsights.complexityLevel === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}>
                {t(`github.complexity.${data.aiInsights.complexityLevel}`, { defaultValue: data.aiInsights.complexityLevel })}
              </span>
            )}
          </div>
          {data.aiInsights?.projectSummary ? (
            <p className="mt-1 text-sm text-muted-foreground">{data.aiInsights.projectSummary}</p>
          ) : data.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ImportToCV analysisIds={[analysisId]} />
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"
          >
            <ExternalLink size={12} /> {t("nav.github")}
          </a>
          {onClose && (
            <button onClick={onClose} className="rounded border px-2 py-1 text-xs hover:bg-accent">
              {t("common.close")}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" /> {data.stars}</span>
        <span className="flex items-center gap-1"><GitFork size={14} /> {data.forks}</span>
        <span className="flex items-center gap-1"><Eye size={14} /> {data.watchers}</span>
        <span className="flex items-center gap-1"><AlertCircle size={14} /> {data.openIssues} {t("github.metrics.issues")}</span>
        {data.fileTree && (
          <>
            <span className="flex items-center gap-1"><FolderTree size={14} /> {data.fileTree.totalFiles} {t("github.metrics.files")}</span>
            <span className="flex items-center gap-1"><GitCommit size={14} /> {data.commitAnalytics?.totalCommits ?? data.totalCommits} {t("github.metrics.commits")}</span>
            {data.contributors && data.contributors.length > 0 && (
              <span className="flex items-center gap-1"><Users size={14} /> {data.contributors.length} {t("github.metrics.contributors")}</span>
            )}
          </>
        )}
        {data.license && (
          <span className="flex items-center gap-1"><FileText size={14} /> {data.license}</span>
        )}
        {data.codeQuality && (
          <span className="flex items-center gap-1">
            <Gauge size={14} className={data.codeQuality.qualityScore >= 70 ? "text-green-500" : data.codeQuality.qualityScore >= 40 ? "text-yellow-500" : "text-red-500"} />
            {t("github.metrics.quality")}: {data.codeQuality.qualityScore}/100
          </span>
        )}
      </div>

      {/* Tab bar */}
      {hasDeepData && (
        <div className="flex gap-1 border-b">
          {tabs.filter(t => t.show).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="min-h-[200px]">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {data.impactAnalysis && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InsightStatCard
                  label={t("github.impactScore", { defaultValue: "Impact score" })}
                  value={`${data.impactAnalysis.impactScore}`}
                  icon={<TrendingUp size={14} className="text-emerald-500" />}
                />
                <InsightStatCard
                  label={t("github.fitScore", { defaultValue: "CV fit score" })}
                  value={data.impactAnalysis.fitScore !== null ? `${data.impactAnalysis.fitScore}` : "—"}
                  icon={<Target size={14} className="text-blue-500" />}
                />
                <InsightStatCard
                  label={t("github.documentation", { defaultValue: "Documentation" })}
                  value={`${data.impactAnalysis.breakdown.documentation}`}
                  icon={<FileText size={14} className="text-purple-500" />}
                />
                <InsightStatCard
                  label={t("github.engineering", { defaultValue: "Engineering" })}
                  value={`${data.impactAnalysis.breakdown.engineering}`}
                  icon={<Shield size={14} className="text-amber-500" />}
                />
              </div>
            )}

            {data.impactAnalysis?.reasons && data.impactAnalysis.reasons.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("github.impactHighlights", { defaultValue: "Impact highlights" })}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.impactAnalysis.reasons.map((reason) => (
                    <span key={reason} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {data.languages.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Code size={14} /> {t("github.languages")}</h4>
                <div className="mb-2 flex h-2.5 overflow-hidden rounded-full">
                  {data.languages.map((lang, i) => (
                    <div
                      key={lang.language}
                      className="h-full"
                      style={{
                        width: `${lang.percentage}%`,
                        backgroundColor: LANG_COLORS[lang.language] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                      }}
                      title={`${lang.language}: ${lang.percentage}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.languages.map((lang) => (
                    <span key={lang.language} className="rounded bg-accent px-2 py-0.5 text-xs">
                      {lang.language} {lang.percentage}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {data.topics.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Tag size={14} /> {t("github.topics")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.topics.map((topic) => (
                    <span key={topic} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Technologies */}
            {data.technologies.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("github.technologies")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.technologies.map((tech) => (
                    <span key={tech} className="rounded bg-accent px-2 py-0.5 text-xs font-medium">{tech}</span>
                  ))}
                </div>
              </div>
            )}

            {/* File Structure Summary */}
            {data.fileTree && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><FolderTree size={14} /> {t("github.fileStructure")}</h4>
                <div className="rounded-lg border p-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-muted-foreground">{t("github.stats.files")}:</span> <span className="font-medium">{data.fileTree.totalFiles}</span></div>
                    <div><span className="text-muted-foreground">{t("github.stats.directories")}:</span> <span className="font-medium">{data.fileTree.totalDirectories}</span></div>
                    <div><span className="text-muted-foreground">{t("github.stats.maxDepth")}:</span> <span className="font-medium">{data.fileTree.maxDepth}</span></div>
                  </div>
                  {data.fileTree.keyDirectories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.fileTree.keyDirectories.map((d) => (
                        <span key={d} className="rounded bg-accent px-2 py-0.5 text-xs font-mono">{d}/</span>
                      ))}
                    </div>
                  )}
                  {Object.keys(data.fileTree.filesByExtension).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(data.fileTree.filesByExtension)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([ext, count]) => (
                          <span key={ext} className="rounded bg-muted px-2 py-0.5 text-xs">
                            {ext} <span className="text-muted-foreground">({count})</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={12} /> {t("github.created")}: {new Date(data.createdAt).toLocaleDateString(dateLocale)}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> {t("github.updated")}: {new Date(data.updatedAt).toLocaleDateString(dateLocale)}</span>
            </div>
          </div>
        )}

        {/* ── TECH STACK TAB ── */}
        {activeTab === "techstack" && data.dependencyInfo && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("github.dependenciesSource", { source: data.dependencyInfo.source })}
            </p>

            {/* Categorized deps */}
            {data.dependencyInfo.frameworks.length > 0 && (
              <DepCategory title={t("github.frameworks")} items={data.dependencyInfo.frameworks} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" />
            )}
            {data.dependencyInfo.databases.length > 0 && (
              <DepCategory title={t("github.databases")} items={data.dependencyInfo.databases} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" />
            )}
            {data.dependencyInfo.uiLibraries.length > 0 && (
              <DepCategory title={t("github.uiLibraries")} items={data.dependencyInfo.uiLibraries} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" />
            )}
            {data.dependencyInfo.testingTools.length > 0 && (
              <DepCategory title={t("github.testing")} items={data.dependencyInfo.testingTools} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" />
            )}
            {data.dependencyInfo.buildTools.length > 0 && (
              <DepCategory title={t("github.buildTools")} items={data.dependencyInfo.buildTools} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" />
            )}
            {data.dependencyInfo.linters.length > 0 && (
              <DepCategory title={t("github.linters")} items={data.dependencyInfo.linters} deps={{...data.dependencyInfo.dependencies, ...data.dependencyInfo.devDependencies}} color="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" />
            )}

            {/* All dependencies */}
            {Object.keys(data.dependencyInfo.dependencies).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("github.allDependencies", { count: Object.keys(data.dependencyInfo.dependencies).length })}</h4>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.dependencyInfo.dependencies).map(([name, ver]) => (
                      <span key={name} className="rounded bg-accent px-2 py-0.5 text-xs">
                        {name} <span className="text-muted-foreground">{ver}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {Object.keys(data.dependencyInfo.devDependencies).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("github.devDependencies", { count: Object.keys(data.dependencyInfo.devDependencies).length })}</h4>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.dependencyInfo.devDependencies).map(([name, ver]) => (
                      <span key={name} className="rounded bg-muted px-2 py-0.5 text-xs">
                        {name} <span className="text-muted-foreground">{ver}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.aiInsights?.techStackAssessment && (
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <h4 className="mb-1 flex items-center gap-1 text-sm font-medium"><Sparkles size={13} className="text-blue-500" /> {t("github.aiAssessment")}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{data.aiInsights.techStackAssessment}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "techstack" && !data.dependencyInfo && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {t("github.noDepsFound")}
          </div>
        )}

        {/* ── CODE QUALITY TAB ── */}
        {activeTab === "quality" && data.codeQuality && (
          <div className="space-y-4">
            {/* Quality Score */}
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-lg font-bold ${
                data.codeQuality.qualityScore >= 70 ? "border-green-500 text-green-600" :
                data.codeQuality.qualityScore >= 40 ? "border-yellow-500 text-yellow-600" :
                "border-red-500 text-red-600"
              }`}>
                {data.codeQuality.qualityScore}
              </div>
              <div>
                <p className="text-sm font-medium">{t("github.qualityScore")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("github.qualityScoreDescription")}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-2">
              <QualityCheck label={t("github.tests")} ok={data.codeQuality.hasTests} />
              <QualityCheck label="CI/CD" ok={data.codeQuality.hasCI} />
              <QualityCheck label={t("github.linting")} ok={data.codeQuality.hasLinting} />
              <QualityCheck label="TypeScript" ok={data.codeQuality.hasTypeScript} />
              <QualityCheck label="Docker" ok={data.codeQuality.hasDocker} />
              <QualityCheck label={t("github.readme")} ok={data.codeQuality.hasReadme} />
              <QualityCheck label={t("github.license") } ok={data.codeQuality.hasLicense} />
              <QualityCheck label={t("github.contributingGuide")} ok={data.codeQuality.hasContributing} />
              <QualityCheck label={t("github.changelog")} ok={data.codeQuality.hasChangelog} />
              {data.commitAnalytics && (
                <QualityCheck label={t("github.conventionalCommits")} ok={data.commitAnalytics.usesConventionalCommits} />
              )}
            </div>

            {/* Config files */}
            {data.fileTree && data.fileTree.configFiles.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("github.configFilesDetected")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.fileTree.configFiles.map((f) => (
                    <span key={f} className="rounded bg-accent px-2 py-0.5 text-xs font-mono">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {data.aiInsights?.architectureAnalysis && (
              <div className="rounded-lg border bg-purple-50/50 p-3 dark:bg-purple-950/20">
                <h4 className="mb-1 flex items-center gap-1 text-sm font-medium"><Sparkles size={13} className="text-purple-500" /> {t("github.architectureAnalysis")}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{data.aiInsights.architectureAnalysis}</p>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Commit analytics */}
            {data.commitAnalytics && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label={t("github.totalCommits")} value={data.commitAnalytics.totalCommits} />
                <StatCard label={t("github.last30Days")} value={data.commitAnalytics.recentActivityCount} />
                <StatCard label={t("github.averagePerWeek")} value={data.commitAnalytics.averagePerWeek} />
                <StatCard label={t("github.activeDays")} value={data.commitAnalytics.activeDays} />
              </div>
            )}

            {data.commitAnalytics?.firstCommitDate && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{t("github.firstCommit")}: {new Date(data.commitAnalytics.firstCommitDate).toLocaleDateString(dateLocale)}</span>
                {data.commitAnalytics.lastCommitDate && (
                  <span>{t("github.lastCommit")}: {new Date(data.commitAnalytics.lastCommitDate).toLocaleDateString(dateLocale)}</span>
                )}
              </div>
            )}

            {/* Author breakdown */}
            {data.commitAnalytics && Object.keys(data.commitAnalytics.authorBreakdown).length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Users size={14} /> {t("github.committers")}</h4>
                <div className="space-y-1.5">
                  {Object.entries(data.commitAnalytics.authorBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([author, count]) => {
                      const pct = data.commitAnalytics ? Math.round((count / data.commitAnalytics.totalCommits) * 100) : 0;
                      return (
                        <div key={author} className="flex items-center gap-2 text-xs">
                          <span className="w-32 truncate font-medium">{author}</span>
                          <div className="flex-1">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="w-16 text-right text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Contributors */}
            {data.contributors && data.contributors.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Users size={14} /> {t("github.topContributors")}</h4>
                <div className="flex flex-wrap gap-2">
                  {data.contributors.map((c) => (
                    <div key={c.login} className="flex items-center gap-1.5 rounded-full border px-2 py-1">
                      <img src={c.avatarUrl} alt={c.login} className="h-5 w-5 rounded-full" />
                      <span className="text-xs font-medium">{c.login}</span>
                      <span className="text-xs text-muted-foreground">{c.contributions}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent commits */}
            {data.recentCommits.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium">
                  <GitCommit size={14} /> {t("github.recentCommits")}
                </h4>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {data.recentCommits.map((commit) => (
                    <div key={commit.sha} className="flex items-start gap-2 rounded p-1.5 text-xs hover:bg-accent/50">
                      <code className="shrink-0 text-muted-foreground">{commit.sha}</code>
                      <span className="flex-1 truncate">{commit.message}</span>
                      <span className="shrink-0 text-muted-foreground">{new Date(commit.date).toLocaleDateString(dateLocale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI INSIGHTS TAB ── */}
        {activeTab === "insights" && data.aiInsights && (data.aiInsights.projectSummary || data.aiInsights.detectedSkills.length > 0) && (
          <div className="space-y-4">
            {/* Project summary from AI */}
            {data.aiInsights.projectSummary && (
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <h4 className="mb-1 flex items-center gap-1 text-sm font-medium"><Sparkles size={13} className="text-blue-500" /> {t("github.aiProjectSummary")}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">{data.aiInsights.projectSummary}</p>
              </div>
            )}

            {/* Skills */}
            {data.aiInsights.detectedSkills.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Code size={14} /> {t("github.detectedSkills")}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.aiInsights.detectedSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {data.aiInsights.cvHighlights.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><FileText size={14} className="text-green-600" /> {t("github.projectHighlights")}</h4>
                <ul className="space-y-1">
                  {data.aiInsights.cvHighlights.map((highlight, index) => (
                    <li key={`${highlight}-${index}`} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths */}
            {data.aiInsights.strengths.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><TrendingUp size={14} className="text-green-500" /> {t("github.strengths")}</h4>
                <ul className="space-y-1">
                  {data.aiInsights.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {data.aiInsights.improvements.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Lightbulb size={14} className="text-yellow-500" /> {t("github.improvements")}</h4>
                <ul className="space-y-1">
                  {data.aiInsights.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Lightbulb size={12} className="mt-0.5 shrink-0 text-yellow-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CV-Ready Description */}
            {data.aiInsights.cvReadyDescription && (
              <div className="rounded-lg border bg-green-50/50 p-3 dark:bg-green-950/20">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="flex items-center gap-1 text-sm font-medium"><FileText size={13} className="text-green-600" /> {t("github.cvReadyDesc")}</h4>
                  <button
                    onClick={() => handleCopy(data.aiInsights!.cvReadyDescription)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied ? t("github.copied") : t("github.copy")}
                  </button>
                </div>
                <p className="text-sm leading-relaxed">{data.aiInsights.cvReadyDescription}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "insights" && (!data.aiInsights || (!data.aiInsights.projectSummary && data.aiInsights.detectedSkills.length === 0)) && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Sparkles size={24} className="opacity-40" />
            <p>{t("github.insightsUnavailable")}</p>
            <p className="text-xs">{t("github.insightsRetryHint")}</p>
          </div>
        )}

        {/* ── DEVOPS TAB ── */}
        {activeTab === "devops" && (
          <div className="space-y-4">
            {data.cicd && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <QualityCheck label={t("github.githubActions")} ok={data.cicd.hasGitHubActions} />
                  <QualityCheck label={t("github.dockerfile")} ok={data.cicd.hasDockerfile} />
                  <QualityCheck label={t("github.dockerCompose")} ok={data.cicd.hasDockerCompose} />
                </div>

                {data.cicd.workflowFiles.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-1 text-sm font-medium"><Workflow size={14} /> {t("github.workflowFiles")}</h4>
                    <div className="space-y-1">
                      {data.cicd.workflowFiles.map((wf) => (
                        <div key={wf} className="flex items-center gap-2 rounded border px-3 py-1.5 text-xs">
                          <FileText size={12} className="text-muted-foreground" />
                          <span className="font-mono">{wf}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {(!data.cicd || (!data.cicd.hasGitHubActions && !data.cicd.hasDockerfile)) && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {t("github.noCiCdFound")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function QualityCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded border px-3 py-1.5 text-xs">
      {ok ? <CheckCircle size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-400" />}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function DepCategory({
  title,
  items,
  deps,
  color,
}: {
  title: string;
  items: string[];
  deps: Record<string, string>;
  color: string;
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-medium">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name) => (
          <span key={name} className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>
            {name} {deps[name] ? <span className="opacity-70">{deps[name]}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
};

const FALLBACK_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ef4444"];

function InsightStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
