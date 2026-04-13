// ═══════════════════════════════════════════════════════════
// GitHub Integration Types
// ═══════════════════════════════════════════════════════════

export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  watchersCount: number;
  openIssuesCount: number;
  topics: string[];
  license: GitHubLicense | null;
  isPrivate: boolean;
  isFork: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  defaultBranch: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  spdxId: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  date: string;
  author: string;
  additions: number;
  deletions: number;
}

export interface GitHubLanguageStats {
  [language: string]: number;
}

export interface GitHubContributorStats {
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  weeks: Array<{
    week: number;
    additions: number;
    deletions: number;
    commits: number;
  }>;
}

export interface GitHubFileTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface GitHubConnectInput {
  token: string;
}

export interface GitHubAnalyzeInput {
  repoFullName: string;
  cvId: string;
}

export interface GitHubImportInput {
  analysisId: string;
  cvId: string;
  importProjects: boolean;
  importSkills: boolean;
  importExperience: boolean;
}

// ═══════════════════════════════════════════════════════════
// Deep Analysis Types
// ═══════════════════════════════════════════════════════════

export interface FileTreeInfo {
  totalFiles: number;
  totalDirectories: number;
  maxDepth: number;
  filesByExtension: Record<string, number>;
  /** Key config/tool files detected */
  configFiles: string[];
  /** e.g. "monorepo", "frontend", "backend", "fullstack", "library", "cli", "mobile" */
  projectType: string;
  /** Notable directories found */
  keyDirectories: string[];
}

export interface GitHubDependencyInfo {
  /** Which manifest file: package.json, requirements.txt, etc. */
  source: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  /** Categorized dependency names */
  frameworks: string[];
  testingTools: string[];
  buildTools: string[];
  linters: string[];
  databases: string[];
  uiLibraries: string[];
}

export interface ContributorInfo {
  login: string;
  avatarUrl: string;
  contributions: number;
}

export interface CICDInfo {
  hasGitHubActions: boolean;
  workflowFiles: string[];
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
}

export interface CommitAnalytics {
  totalCommits: number;
  /** Commits in the last 30 days */
  recentActivityCount: number;
  /** Average commits per week over repo lifetime */
  averagePerWeek: number;
  /** First commit date ISO */
  firstCommitDate: string | null;
  /** Last commit date ISO */
  lastCommitDate: string | null;
  /** Active development span in days */
  activeDays: number;
  /** Top committers: author → count */
  authorBreakdown: Record<string, number>;
  /** Whether conventional commits pattern is used */
  usesConventionalCommits: boolean;
}

export interface CodeQualityMetrics {
  hasTests: boolean;
  hasCI: boolean;
  hasLinting: boolean;
  hasTypeScript: boolean;
  hasDocker: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasChangelog: boolean;
  /** 0-100 */
  qualityScore: number;
}

export interface AIAnalysisInsight {
  projectSummary: string;
  architectureAnalysis: string;
  techStackAssessment: string;
  complexityLevel: "simple" | "medium" | "complex";
  detectedSkills: string[];
  strengths: string[];
  improvements: string[];
  cvReadyDescription: string;
}

export interface DeepAnalysisResult {
  // ── Original fields ──
  repoFullName: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  license: string | null;
  createdAt: string;
  updatedAt: string;
  topics: string[];
  languages: { language: string; percentage: number; bytes: number }[];
  primaryLanguage: string | null;
  technologies: string[];
  totalCommits: number;
  recentCommits: { sha: string; message: string; date: string; author: string }[];
  hasReadme: boolean;
  url: string;
  defaultBranch: string;
  isArchived: boolean;
  isFork: boolean;

  // ── Deep analysis fields ──
  fileTree: FileTreeInfo;
  dependencyInfo: GitHubDependencyInfo | null;
  contributors: ContributorInfo[];
  cicd: CICDInfo;
  commitAnalytics: CommitAnalytics;
  codeQuality: CodeQualityMetrics;
  aiInsights: AIAnalysisInsight | null;
  readmeContent: string | null;
}
