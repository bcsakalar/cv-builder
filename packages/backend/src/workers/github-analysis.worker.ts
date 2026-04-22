// ═══════════════════════════════════════════════════════════
// GitHub Analysis Worker — Deep end-to-end repo analysis
// ═══════════════════════════════════════════════════════════

import { createWorker, QUEUE_NAMES } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { decrypt } from "../utils/helpers";
import { logger } from "../lib/logger";
import { aiService } from "../modules/ai/ai.service";

interface GitHubAnalysisJobData {
  analysisId: string;
  repoFullName: string;
  userId: string;
  locale?: string;
}

export type AnalysisStage =
  | "starting"
  | "fetching_repo"
  | "fetching_languages"
  | "fetching_tree"
  | "fetching_commits"
  | "fetching_contributors"
  | "fetching_dependencies"
  | "fetching_workflows"
  | "fetching_readme"
  | "ai_analyzing"
  | "completed"
  | "failed";

export interface AnalysisProgressEvent {
  stage: AnalysisStage;
  progress: number;
  message: string;
}

function progressChannel(analysisId: string) {
  return `github:analysis:${analysisId}`;
}

async function publishProgress(analysisId: string, event: AnalysisProgressEvent) {
  await redis.publish(progressChannel(analysisId), JSON.stringify(event));
}

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "CvBuilder-GitHub-Analysis",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

interface GitHubErrorPayload {
  message?: string;
  documentation_url?: string;
}

interface GitHubApiErrorContext {
  status: number;
  message: string;
  documentationUrl: string | null;
  retryAfterSeconds: number | null;
  rateLimitRemaining: number | null;
  rateLimitReset: number | null;
  ssoHeader: string | null;
  ssoUrl: string | null;
}

class GitHubApiRequestError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  readonly details: GitHubApiErrorContext;

  constructor(message: string, details: GitHubApiErrorContext) {
    super(message);
    this.name = "GitHubApiRequestError";
    this.status = details.status;
    this.retryable = isRetryableGitHubError(details);
    this.details = details;
  }
}

function buildGitHubHeaders(token?: string) {
  return {
    ...GITHUB_API_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchGitHub(url: string, token?: string) {
  return fetch(url, {
    headers: buildGitHubHeaders(token),
  });
}

function parseOptionalNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractGitHubSsoUrl(ssoHeader: string | null): string | null {
  if (!ssoHeader) {
    return null;
  }

  const match = ssoHeader.match(/https?:\/\/\S+/);
  return match?.[0] ?? null;
}

async function readGitHubApiErrorContext(response: Response): Promise<GitHubApiErrorContext> {
  let message = response.statusText || "GitHub API request failed";
  let documentationUrl: string | null = null;

  try {
    const payload = (await response.clone().json()) as GitHubErrorPayload;
    if (payload.message) {
      message = payload.message;
    }
    documentationUrl = payload.documentation_url ?? null;
  } catch {
    try {
      const text = (await response.clone().text()).trim();
      if (text) {
        message = text;
      }
    } catch {
      // Ignore parse errors and fall back to status text.
    }
  }

  const ssoHeader = response.headers.get("x-github-sso");

  return {
    status: response.status,
    message,
    documentationUrl,
    retryAfterSeconds: parseOptionalNumber(response.headers.get("retry-after")),
    rateLimitRemaining: parseOptionalNumber(response.headers.get("x-ratelimit-remaining")),
    rateLimitReset: parseOptionalNumber(response.headers.get("x-ratelimit-reset")),
    ssoHeader,
    ssoUrl: extractGitHubSsoUrl(ssoHeader),
  };
}

function isGitHubRateLimitError(details: GitHubApiErrorContext): boolean {
  return details.status === 429
    || details.retryAfterSeconds !== null
    || details.rateLimitRemaining === 0
    || /secondary rate limit|rate limit exceeded|rate limit/i.test(details.message);
}

function isRetryableGitHubError(details: GitHubApiErrorContext): boolean {
  return isGitHubRateLimitError(details) || details.status >= 500;
}

function hasInvalidGitHubCredentials(details: GitHubApiErrorContext): boolean {
  return /bad credentials|invalid credentials|requires authentication/i.test(details.message);
}

function shouldUsePublicGitHubFallback(details: GitHubApiErrorContext): boolean {
  return (details.status === 403 || details.status === 404)
    && !hasInvalidGitHubCredentials(details)
    && !isGitHubRateLimitError(details)
    && details.ssoUrl === null;
}

function formatGitHubApiError(details: GitHubApiErrorContext, repoFullName: string): string {
  if (hasInvalidGitHubCredentials(details) || details.status === 401) {
    return "GitHub token is invalid or expired. Reconnect GitHub and try again.";
  }

  if (details.ssoUrl) {
    return `GitHub access to ${repoFullName} is blocked until this token is authorized for your organization's SSO. Authorize the token in GitHub, then reconnect and try again.`;
  }

  if (isGitHubRateLimitError(details)) {
    return "GitHub temporarily rate-limited repository analysis. Please wait a minute and try again.";
  }

  if (/resource not accessible by personal access token/i.test(details.message)) {
    return `This GitHub token can list ${repoFullName} but cannot read enough repository data to analyze it. Use GitHub OAuth or a PAT with repository Metadata + Contents read access.`;
  }

  if (details.status === 404) {
    return `Repository ${repoFullName} was not found or the connected GitHub account cannot access it.`;
  }

  if (details.status === 403) {
    return `GitHub denied access to ${repoFullName}. If you're using a PAT, make sure it can read repository metadata and contents.`;
  }

  if (details.status >= 500) {
    return "GitHub API is temporarily unavailable. Please try again.";
  }

  return `GitHub API request failed (${details.status})${details.documentationUrl ? `. See ${details.documentationUrl}` : ""}.`;
}

interface GitHubJsonRequestOptions {
  repoFullName: string;
  token?: string;
  allowPublicFallback?: boolean;
}

interface GitHubJsonResult<T> {
  data: T;
  usedPublicFallback: boolean;
}

async function fetchGitHubJson<T>(url: string, options: GitHubJsonRequestOptions): Promise<GitHubJsonResult<T>> {
  const primaryResponse = await fetchGitHub(url, options.token);
  if (primaryResponse.ok) {
    return {
      data: (await primaryResponse.json()) as T,
      usedPublicFallback: false,
    };
  }

  const primaryError = await readGitHubApiErrorContext(primaryResponse);
  if (options.allowPublicFallback && options.token && shouldUsePublicGitHubFallback(primaryError)) {
    const publicResponse = await fetchGitHub(url);
    if (publicResponse.ok) {
      return {
        data: (await publicResponse.json()) as T,
        usedPublicFallback: true,
      };
    }

    const publicError = await readGitHubApiErrorContext(publicResponse);
    throw new GitHubApiRequestError(formatGitHubApiError(publicError, options.repoFullName), publicError);
  }

  throw new GitHubApiRequestError(formatGitHubApiError(primaryError, options.repoFullName), primaryError);
}

export { progressChannel };

// ── Helper: categorize dependencies ──

const FRAMEWORK_NAMES = new Set(["react", "next", "vue", "nuxt", "angular", "svelte", "express", "fastify", "nestjs", "koa", "hono", "django", "flask", "fastapi", "spring-boot", "rails", "laravel", "gatsby", "remix", "@remix-run/react", "astro", "solid-js", "@tanstack/react-router", "@tanstack/react-query", "flutter", "provider", "riverpod", "flutter_riverpod", "bloc", "flutter_bloc", "ktor", "ktor-server-core"]);
const TESTING_NAMES = new Set(["jest", "vitest", "mocha", "chai", "cypress", "playwright", "@playwright/test", "supertest", "@testing-library/react", "@testing-library/jest-dom", "pytest", "unittest", "rspec", "phpunit", "junit", "kotest", "flutter_test"]);
const BUILD_NAMES = new Set(["webpack", "vite", "rollup", "esbuild", "parcel", "turbo", "nx", "tsup", "swc", "@swc/core", "babel", "@babel/core", "gulp", "grunt"]);
const LINTER_NAMES = new Set(["eslint", "prettier", "biome", "@biomejs/biome", "stylelint", "tslint", "oxlint", "pylint", "flake8", "rubocop", "flutter_lints", "ktlint"]);
const DB_NAMES = new Set(["prisma", "@prisma/client", "mongoose", "sequelize", "typeorm", "drizzle-orm", "knex", "pg", "mysql2", "redis", "ioredis", "mongodb", "sqlite3", "better-sqlite3"]);
const UI_NAMES = new Set(["tailwindcss", "@tailwindcss/vite", "bootstrap", "@mui/material", "antd", "chakra-ui", "@chakra-ui/react", "shadcn-ui", "styled-components", "@emotion/react", "radix-ui", "@radix-ui/react-dialog"]);

function categorizeDeps(deps: Record<string, string>) {
  const frameworks: string[] = [];
  const testingTools: string[] = [];
  const buildTools: string[] = [];
  const linters: string[] = [];
  const databases: string[] = [];
  const uiLibraries: string[] = [];

  for (const name of Object.keys(deps)) {
    const lower = name.toLowerCase();
    if (FRAMEWORK_NAMES.has(lower)) frameworks.push(name);
    else if (TESTING_NAMES.has(lower)) testingTools.push(name);
    else if (BUILD_NAMES.has(lower)) buildTools.push(name);
    else if (LINTER_NAMES.has(lower)) linters.push(name);
    else if (DB_NAMES.has(lower)) databases.push(name);
    else if (UI_NAMES.has(lower) || lower.startsWith("@radix-ui/")) uiLibraries.push(name);
  }

  return { frameworks, testingTools, buildTools, linters, databases, uiLibraries };
}

type ManifestSource =
  | "npm"
  | "pip"
  | "pipenv"
  | "go"
  | "cargo"
  | "maven"
  | "gradle"
  | "bundler"
  | "composer"
  | "pub";

interface ParsedManifestDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface ManifestCandidate {
  path: string;
  fileName: string;
  source: ManifestSource;
}

// ── Helper: detect project type from file tree ──

function detectProjectType(tree: { path: string; type: string }[]): {
  projectType: string;
  keyDirectories: string[];
} {
  const dirs = new Set<string>();
  for (const item of tree) {
    if (item.type === "tree") dirs.add(item.path);
  }

  const keyDirectories: string[] = [];
  const isMonorepo = dirs.has("packages") || dirs.has("apps") || dirs.has("libs");
  const hasPublic = dirs.has("public");
  const hasPages = dirs.has("pages") || dirs.has("src/pages") || dirs.has("app") || dirs.has("src/app");
  const hasComponents = dirs.has("components") || dirs.has("src/components");
  const hasApi = dirs.has("api") || dirs.has("src/api") || dirs.has("src/routes") || dirs.has("src/controllers") || dirs.has("routes");
  const hasLib = dirs.has("lib") || dirs.has("src/lib");
  const hasCmd = dirs.has("cmd") || dirs.has("bin");
  const hasMobile = dirs.has("ios") || dirs.has("android");

  for (const d of ["src", "packages", "apps", "api", "lib", "components", "public", "pages", "prisma", "migrations", "tests", "test", "__tests__", "docker", ".github"]) {
    if (dirs.has(d)) keyDirectories.push(d);
  }

  if (isMonorepo) return { projectType: "monorepo", keyDirectories };
  if (hasMobile) return { projectType: "mobile", keyDirectories };
  if (hasComponents && hasApi) return { projectType: "fullstack", keyDirectories };
  if (hasComponents || (hasPublic && hasPages)) return { projectType: "frontend", keyDirectories };
  if (hasApi && !hasComponents) return { projectType: "backend", keyDirectories };
  if (hasCmd) return { projectType: "cli", keyDirectories };
  if (hasLib && !hasComponents && !hasApi) return { projectType: "library", keyDirectories };

  return { projectType: "unknown", keyDirectories };
}

// ── Helper: select key source files to feed to AI ──

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".kt", ".swift"]);
const EXACT_PRIORITY_FILES = new Set([
  "src/index.ts", "src/index.tsx", "src/main.ts", "src/main.tsx",
  "src/app.ts", "src/app.tsx", "src/server.ts", "src/server.js",
  "index.ts", "index.js", "main.ts", "main.go", "main.py", "app.py",
  "src/index.js", "src/main.js", "src/app.js",
  "package.json", "tsconfig.json", "Dockerfile", "README.md",
]);
const PRIORITY_FILE_PATTERNS = [
  /^src\/(routes|route|controllers|controller|services|service|modules|workers|hooks|stores|components)\//,
  /^packages\/[^/]+\/src\//,
  /^apps\/[^/]+\/src\//,
  /^app\//,
  /^pages\//,
  /^src\/app\//,
  /^src\/pages\//,
  /prisma\/schema\.prisma$/,
  /vite\.config\.(ts|js|mjs)$/,
  /next\.config\.(ts|js|mjs)$/,
  /eslint\.config\.(js|mjs)$/,
  /tailwind\.config\.(ts|js)$/,
  /docker-compose\.(ya?ml)$/,
  /^\.github\/workflows\//,
  /\.(test|spec)\.(ts|tsx|js|jsx|py|go)$/,
];

function scoreKeyFile(path: string, size = 0): number {
  if (path.includes("node_modules/") || path.includes("dist/") || path.includes("coverage/") || path.includes(".min.")) {
    return -1;
  }

  const ext = path.includes(".") ? "." + path.split(".").pop() : "";
  const isSourceLike = SOURCE_EXTENSIONS.has(ext) || EXACT_PRIORITY_FILES.has(path) || PRIORITY_FILE_PATTERNS.some((pattern) => pattern.test(path));
  if (!isSourceLike) {
    return -1;
  }

  let score = 0;
  if (EXACT_PRIORITY_FILES.has(path)) score += 80;
  if (PRIORITY_FILE_PATTERNS.some((pattern) => pattern.test(path))) score += 40;
  if (path.includes("package.json") || path.endsWith("schema.prisma")) score += 20;
  if (path.includes("components") || path.includes("routes") || path.includes("services") || path.includes("modules")) score += 10;
  if (path.includes(".test.") || path.includes(".spec.")) score += 8;
  if (size > 0 && size <= 16384) score += 5;
  if (size > 16384) score -= 10;

  return score - path.split("/").length;
}

function selectKeyFiles(tree: { path: string; type: string; size?: number }[]): string[] {
  return tree
    .filter((item) => item.type === "blob")
    .map((item) => ({ path: item.path, score: scoreKeyFile(item.path, item.size ?? 0) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, 8)
    .map((item) => item.path);
}

// ── Dependency manifest detection ──

const MANIFEST_FILES: Record<string, ManifestSource> = {
  "package.json": "npm",
  "requirements.txt": "pip",
  "Pipfile": "pipenv",
  "go.mod": "go",
  "Cargo.toml": "cargo",
  "pom.xml": "maven",
  "build.gradle": "gradle",
  "build.gradle.kts": "gradle",
  "Gemfile": "bundler",
  "composer.json": "composer",
  "pubspec.yaml": "pub",
};

const MANIFEST_PRIORITY: Record<string, number> = {
  "package.json": 100,
  "pubspec.yaml": 95,
  "go.mod": 90,
  "Cargo.toml": 85,
  "pom.xml": 80,
  "build.gradle.kts": 78,
  "build.gradle": 77,
  "composer.json": 70,
  "Gemfile": 65,
  "Pipfile": 60,
  "requirements.txt": 55,
};

function setDependency(target: Record<string, string>, name: string, version: string) {
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.startsWith("#") || normalizedName === "sdk") {
    return;
  }

  if (!(normalizedName in target)) {
    target[normalizedName] = version.trim() || "*";
  }
}

function encodeContentPath(filePath: string) {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

function parseSimpleRequirementLines(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};

  for (const rawLine of decoded.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;

    if (trimmed.includes("==")) {
      const [name, version] = trimmed.split("==");
      setDependency(dependencies, name ?? trimmed, version ?? "*");
      continue;
    }

    if (trimmed.includes(">=")) {
      const [name, version] = trimmed.split(">=");
      setDependency(dependencies, name ?? trimmed, `>=${version ?? ""}`);
      continue;
    }

    setDependency(dependencies, trimmed, "*");
  }

  return { dependencies, devDependencies: {} };
}

function parsePipfile(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  let active: "dependencies" | "devDependencies" | null = null;

  for (const rawLine of decoded.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "[packages]") {
      active = "dependencies";
      continue;
    }

    if (trimmed === "[dev-packages]") {
      active = "devDependencies";
      continue;
    }

    if (trimmed.startsWith("[")) {
      active = null;
      continue;
    }

    if (!active || !trimmed.includes("=")) continue;

    const [name, version] = trimmed.split("=");
    const target = active === "dependencies" ? dependencies : devDependencies;
    setDependency(target, name ?? trimmed, (version ?? "*").replace(/^['"]|['"]$/g, ""));
  }

  return { dependencies, devDependencies };
}

function parseGoMod(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  let inRequireBlock = false;

  for (const rawLine of decoded.split(/\r?\n/)) {
    const trimmed = rawLine.replace(/\/\/.*$/, "").trim();
    if (!trimmed) continue;

    if (/^require\s*\($/.test(trimmed)) {
      inRequireBlock = true;
      continue;
    }

    if (inRequireBlock && trimmed === ")") {
      inRequireBlock = false;
      continue;
    }

    if (!inRequireBlock && trimmed.startsWith("require ")) {
      const parts = trimmed.replace(/^require\s+/, "").split(/\s+/);
      setDependency(dependencies, parts[0] ?? trimmed, parts[1] ?? "*");
      continue;
    }

    if (inRequireBlock) {
      const parts = trimmed.split(/\s+/);
      setDependency(dependencies, parts[0] ?? trimmed, parts[1] ?? "*");
    }
  }

  return { dependencies, devDependencies: {} };
}

function parseCargoToml(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  let active: "dependencies" | "devDependencies" | null = null;

  for (const rawLine of decoded.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed === "[dependencies]") {
      active = "dependencies";
      continue;
    }

    if (trimmed === "[dev-dependencies]") {
      active = "devDependencies";
      continue;
    }

    if (trimmed.startsWith("[")) {
      active = null;
      continue;
    }

    if (!active || !trimmed.includes("=")) continue;

    const [name, version] = trimmed.split("=");
    const target = active === "dependencies" ? dependencies : devDependencies;
    const normalizedVersion = (version ?? "*").trim().replace(/^['"]|['"]$/g, "");
    setDependency(target, name ?? trimmed, normalizedVersion || "*");
  }

  return { dependencies, devDependencies };
}

function parsePubspecYaml(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  let active: "dependencies" | "devDependencies" | null = null;
  let activeIndent = -1;

  for (const rawLine of decoded.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "");
    const trimmed = withoutComment.trim();
    if (!trimmed) continue;

    const indent = withoutComment.match(/^\s*/)?.[0].length ?? 0;

    if (/^dependencies\s*:\s*$/.test(trimmed)) {
      active = "dependencies";
      activeIndent = indent;
      continue;
    }

    if (/^dev_dependencies\s*:\s*$/.test(trimmed)) {
      active = "devDependencies";
      activeIndent = indent;
      continue;
    }

    if (active && indent <= activeIndent) {
      active = null;
    }

    if (!active) continue;

    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (!match) continue;

    const name = match[1];
    const versionPart = match[2] ?? "";
    if (!name) continue;
    const target = active === "dependencies" ? dependencies : devDependencies;
    const normalizedVersion = versionPart && !versionPart.startsWith("{")
      ? versionPart.replace(/^['"]|['"]$/g, "")
      : "*";
    setDependency(target, name, normalizedVersion || "*");
  }

  return { dependencies, devDependencies };
}

function parsePomXml(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const dependencyBlocks = decoded.match(/<dependency>[\s\S]*?<\/dependency>/g) ?? [];

  for (const block of dependencyBlocks) {
    const artifactId = block.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1];
    if (!artifactId) continue;
    const version = block.match(/<version>([^<]+)<\/version>/)?.[1] ?? "*";
    const isTestScope = /<scope>test<\/scope>/.test(block);
    const target = isTestScope ? devDependencies : dependencies;
    setDependency(target, artifactId, version);
  }

  return { dependencies, devDependencies };
}

function parseGradle(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const dependencyRegex = /^\s*(implementation|api|compileOnly|runtimeOnly|kapt|ksp|annotationProcessor|testImplementation|androidTestImplementation|debugImplementation|testFixturesImplementation|classpath)\s*(?:\(\s*)?["']([^:"']+):([^:"']+)(?::([^"')\s]+))?["']/;

  for (const rawLine of decoded.split(/\r?\n/)) {
    const match = rawLine.match(dependencyRegex);
    if (!match) continue;

    const scope = match[1] ?? "";
    const group = match[2] ?? "";
    const artifact = match[3] ?? group;
    const version = match[4] ?? "*";
    const target = scope.toLowerCase().includes("test") ? devDependencies : dependencies;
    setDependency(target, artifact || rawLine.trim(), version);
  }

  return { dependencies, devDependencies };
}

function parseGemfile(decoded: string): ParsedManifestDependencies {
  const dependencies: Record<string, string> = {};

  for (const rawLine of decoded.split(/\r?\n/)) {
    const match = rawLine.match(/^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/);
    const name = match?.[1];
    if (!name) continue;
    setDependency(dependencies, name, match[2] ?? "*");
  }

  return { dependencies, devDependencies: {} };
}

export function parseManifestContent(source: ManifestSource, decoded: string): ParsedManifestDependencies | null {
  if (!decoded.trim()) return null;

  switch (source) {
    case "npm": {
      const pkg = JSON.parse(decoded) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      return {
        dependencies: pkg.dependencies ?? {},
        devDependencies: pkg.devDependencies ?? {},
      };
    }
    case "composer": {
      const composer = JSON.parse(decoded) as { require?: Record<string, string>; "require-dev"?: Record<string, string> };
      return {
        dependencies: composer.require ?? {},
        devDependencies: composer["require-dev"] ?? {},
      };
    }
    case "pip":
      return parseSimpleRequirementLines(decoded);
    case "pipenv":
      return parsePipfile(decoded);
    case "go":
      return parseGoMod(decoded);
    case "cargo":
      return parseCargoToml(decoded);
    case "pub":
      return parsePubspecYaml(decoded);
    case "maven":
      return parsePomXml(decoded);
    case "gradle":
      return parseGradle(decoded);
    case "bundler":
      return parseGemfile(decoded);
    default:
      return null;
  }
}

function formatDependencySource(manifestPaths: string[]) {
  const primaryPath = manifestPaths[0] ?? "unknown";
  if (manifestPaths.length <= 1) return primaryPath;
  return `${primaryPath} (+${manifestPaths.length - 1} more)`;
}

export function findManifestCandidates(tree: { path: string; type: string }[]): ManifestCandidate[] {
  return tree
    .filter((item) => item.type === "blob")
    .map((item) => {
      const fileName = item.path.split("/").pop() ?? item.path;
      const source = MANIFEST_FILES[fileName];
      if (!source) return null;
      return { path: item.path, fileName, source };
    })
    .filter((item): item is ManifestCandidate => item !== null)
    .sort((left, right) => {
      const depthDiff = left.path.split("/").length - right.path.split("/").length;
      if (depthDiff !== 0) return depthDiff;

      const priorityDiff = (MANIFEST_PRIORITY[right.fileName] ?? 0) - (MANIFEST_PRIORITY[left.fileName] ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      return left.path.localeCompare(right.path);
    });
}

export function buildDependencyInfoFromManifestEntries(entries: Array<{ path: string; source: ManifestSource; content: string }>) {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const manifestPaths: string[] = [];

  for (const entry of entries) {
    try {
      const parsed = parseManifestContent(entry.source, entry.content);
      if (!parsed) continue;

      for (const [name, version] of Object.entries(parsed.dependencies)) {
        setDependency(dependencies, name, version);
      }
      for (const [name, version] of Object.entries(parsed.devDependencies)) {
        setDependency(devDependencies, name, version);
      }

      manifestPaths.push(entry.path);
    } catch {
      logger.warn("Failed to parse manifest file", { file: entry.path });
    }
  }

  if (manifestPaths.length === 0) return null;

  const categories = categorizeDeps({ ...dependencies, ...devDependencies });

  return {
    source: formatDependencySource(manifestPaths),
    dependencies,
    devDependencies,
    ...categories,
  };
}

// ── Config file detection ──

const CONFIG_FILES_TO_DETECT = [
  "tsconfig.json", ".eslintrc", ".eslintrc.js", ".eslintrc.json", "eslint.config.js", "eslint.config.mjs",
  "prettier.config.js", ".prettierrc", ".prettierrc.json",
  "biome.json", "biome.jsonc",
  "jest.config.js", "jest.config.ts", "vitest.config.ts", "vitest.config.js",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".github/workflows", ".gitlab-ci.yml", "Jenkinsfile",
  "tailwind.config.js", "tailwind.config.ts", "postcss.config.js",
  "vite.config.ts", "vite.config.js", "webpack.config.js", "next.config.js", "next.config.mjs",
  ".env.example", ".env.local",
  "CONTRIBUTING.md", "CHANGELOG.md", "LICENSE",
];

export function startGitHubAnalysisWorker() {
  const worker = createWorker<GitHubAnalysisJobData>(
    QUEUE_NAMES.GITHUB_ANALYSIS,
    async (job) => {
      const { analysisId, repoFullName, userId, locale } = job.data;

      logger.info("Processing deep GitHub analysis job", {
        jobId: job.id,
        analysisId,
        repoFullName,
      });

      // Mark as PROCESSING
      await prisma.gitHubAnalysis.update({
        where: { id: analysisId },
        data: { status: "PROCESSING" },
      });

      await publishProgress(analysisId, {
        stage: "starting",
        progress: 3,
        message: "Starting deep analysis...",
      });

      try {
        // Get user's GitHub token
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user?.githubToken) {
          throw new Error("GitHub not connected");
        }
        const token = decrypt(user.githubToken);

        const repoRequest = await fetchGitHubJson<{
          name: string;
          description: string | null;
          default_branch: string;
          topics?: string[];
          stargazers_count?: number;
          forks_count?: number;
          watchers_count?: number;
          open_issues_count?: number;
          license?: { spdx_id?: string | null } | null;
          created_at?: string;
          updated_at?: string;
          html_url?: string;
          archived?: boolean;
          fork?: boolean;
          private?: boolean;
        }>(`https://api.github.com/repos/${repoFullName}`, {
          repoFullName,
          token,
          allowPublicFallback: true,
        });

        if (repoRequest.usedPublicFallback) {
          logger.warn("GitHub analysis fell back to public API access", { repoFullName });
        }

        const repo = repoRequest.data;
        const allowPublicFallback = repo.private === false;
        let requestToken = repoRequest.usedPublicFallback ? undefined : token;

        async function fetchRepoResource<T>(url: string): Promise<T> {
          const result = await fetchGitHubJson<T>(url, {
            repoFullName,
            token: requestToken,
            allowPublicFallback,
          });

          if (result.usedPublicFallback) {
            if (requestToken) {
              logger.warn("GitHub analysis switched to public API access for repository resource", { repoFullName, url });
            }
            requestToken = undefined;
          }

          return result.data;
        }

        async function fetchOptionalRepoResource<T>(url: string, fallback: T, context: string): Promise<T> {
          try {
            return await fetchRepoResource<T>(url);
          } catch (error) {
            if (error instanceof GitHubApiRequestError) {
              logger.warn("Optional GitHub analysis request failed", {
                repoFullName,
                context,
                status: error.status,
                message: error.message,
              });
              return fallback;
            }

            throw error;
          }
        }

        // ══════════════════════════════════════════════
        // Stage 1: Fetch repo metadata
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_repo",
          progress: 8,
          message: "Fetching repository info...",
        });

        // ══════════════════════════════════════════════
        // Stage 2: Fetch languages
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_languages",
          progress: 15,
          message: "Analyzing language breakdown...",
        });
        const languages = await fetchOptionalRepoResource<Record<string, number>>(
          `https://api.github.com/repos/${repoFullName}/languages`,
          {},
          "languages"
        );

        // ══════════════════════════════════════════════
        // Stage 3: Fetch file tree
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_tree",
          progress: 22,
          message: "Mapping file structure...",
        });
        const treeData = await fetchOptionalRepoResource<{ tree?: Array<{ path: string; type: string; size?: number }> }>(
          `https://api.github.com/repos/${repoFullName}/git/trees/${encodeURIComponent(repo.default_branch ?? "HEAD")}?recursive=1`,
          { tree: [] },
          "tree"
        );
        let treeItems: { path: string; type: string; size?: number }[] = (treeData.tree ?? []).map((t) => ({
          path: t.path,
          type: t.type === "tree" ? "tree" : "blob",
          size: t.size,
        }));

        // Process file tree
        const fileItems = treeItems.filter((t) => t.type === "blob");
        const dirItems = treeItems.filter((t) => t.type === "tree");
        const filesByExtension: Record<string, number> = {};
        let maxDepth = 0;
        for (const f of fileItems) {
          const parts = f.path.split("/");
          if (parts.length > maxDepth) maxDepth = parts.length;
          const ext = f.path.includes(".") ? "." + f.path.split(".").pop()! : "(no ext)";
          filesByExtension[ext] = (filesByExtension[ext] ?? 0) + 1;
        }

        // Detect config files present (check at any depth for monorepo support)
        const configFiles: string[] = [];
        for (const cf of CONFIG_FILES_TO_DETECT) {
          // For directory-like checks (e.g. .github/workflows) check if any path starts with it
          if (cf.includes("/")) {
            if (treeItems.some((t) => t.path.startsWith(cf))) configFiles.push(cf);
          } else {
            // Check root level OR any nested path (monorepo support)
            if (treeItems.some((t) => t.type === "blob" && (t.path === cf || t.path.endsWith("/" + cf)))) configFiles.push(cf);
          }
        }

        const { projectType, keyDirectories } = detectProjectType(treeItems);

        const fileTree = {
          totalFiles: fileItems.length,
          totalDirectories: dirItems.length,
          maxDepth,
          filesByExtension,
          configFiles,
          projectType,
          keyDirectories,
        };

        // ══════════════════════════════════════════════
        // Stage 4: Fetch commits (100)
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_commits",
          progress: 32,
          message: "Analyzing commit history...",
        });
        const commits = await fetchOptionalRepoResource<Array<{
          sha?: string;
          commit?: {
            author?: {
              name?: string;
              date?: string;
            };
            message?: string;
          };
        }>>(
          `https://api.github.com/repos/${repoFullName}/commits?per_page=100`,
          [],
          "commits"
        );

        // Build commit analytics
        const authorBreakdown: Record<string, number> = {};
        let conventionalCount = 0;
        const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:/;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commitDates = commits.map((c: any) => c.commit?.author?.date).filter(Boolean) as string[];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const c of commits) {
          const author = c.commit?.author?.name ?? "Unknown";
          authorBreakdown[author] = (authorBreakdown[author] ?? 0) + 1;
          const msg = c.commit?.message ?? "";
          if (conventionalPattern.test(msg)) conventionalCount++;
        }

        const sortedDates = commitDates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
        const first = sortedDates[0];
        const last = sortedDates[sortedDates.length - 1];
        const firstCommitDate = first != null ? new Date(first).toISOString() : null;
        const lastCommitDate = last != null ? new Date(last).toISOString() : null;
        const activeDays = first != null && last != null ? Math.ceil((last - first) / (1000 * 60 * 60 * 24)) : 0;

        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentActivityCount = commitDates.filter((d) => new Date(d).getTime() > thirtyDaysAgo).length;
        const weeksSpan = Math.max(1, activeDays / 7);

        const commitAnalytics = {
          totalCommits: commits.length,
          recentActivityCount,
          averagePerWeek: Math.round((commits.length / weeksSpan) * 10) / 10,
          firstCommitDate,
          lastCommitDate,
          activeDays,
          authorBreakdown,
          usesConventionalCommits: commits.length > 0 && conventionalCount / commits.length > 0.5,
        };

        // ══════════════════════════════════════════════
        // Stage 5: Fetch contributors
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_contributors",
          progress: 42,
          message: "Identifying contributors...",
        });
        const contribRaw = await fetchOptionalRepoResource<Array<{
          login?: string;
          avatar_url?: string;
          contributions?: number;
        }>>(
          `https://api.github.com/repos/${repoFullName}/contributors?per_page=10`,
          [],
          "contributors"
        );
        const contributors = contribRaw.map((c) => ({
          login: c.login ?? "",
          avatarUrl: c.avatar_url ?? "",
          contributions: c.contributions ?? 0,
        }));

        // ══════════════════════════════════════════════
        // Stage 6: Fetch dependencies
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_dependencies",
          progress: 52,
          message: "Scanning dependencies...",
        });

        let dependencyInfo: {
          source: string;
          dependencies: Record<string, string>;
          devDependencies: Record<string, string>;
          frameworks: string[];
          testingTools: string[];
          buildTools: string[];
          linters: string[];
          databases: string[];
          uiLibraries: string[];
        } | null = null;

        const manifestCandidates = findManifestCandidates(treeItems).slice(0, 12);
        if (manifestCandidates.length > 0) {
          const manifestEntries: Array<{ path: string; source: ManifestSource; content: string }> = [];

          for (const manifest of manifestCandidates) {
            const contentData = await fetchOptionalRepoResource<{
              encoding?: string;
              content?: string;
            } | null>(
              `https://api.github.com/repos/${repoFullName}/contents/${encodeContentPath(manifest.path)}`,
              null,
              `manifest:${manifest.path}`
            );
            if (!contentData || contentData.encoding !== "base64" || !contentData.content) continue;

            manifestEntries.push({
              path: manifest.path,
              source: manifest.source,
              content: Buffer.from(contentData.content, "base64").toString("utf-8"),
            });
          }

          dependencyInfo = buildDependencyInfoFromManifestEntries(manifestEntries);
        }

        // ══════════════════════════════════════════════
        // Stage 7: Fetch CI/CD & workflows
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_workflows",
          progress: 60,
          message: "Detecting CI/CD pipelines...",
        });

        const workflowFiles: string[] = [];
        const ghWorkflowDir = treeItems.filter(
          (t) => t.type === "blob" && t.path.startsWith(".github/workflows/")
        );
        for (const wf of ghWorkflowDir) {
          workflowFiles.push(wf.path.replace(".github/workflows/", ""));
        }

        const cicd = {
          hasGitHubActions: workflowFiles.length > 0,
          workflowFiles,
          hasDockerfile: treeItems.some((t) => t.type === "blob" && (t.path === "Dockerfile" || t.path.endsWith("/Dockerfile"))),
          hasDockerCompose: treeItems.some((t) => t.type === "blob" && (t.path === "docker-compose.yml" || t.path === "docker-compose.yaml" || t.path.endsWith("/docker-compose.yml") || t.path.endsWith("/docker-compose.yaml"))),
        };

        // ══════════════════════════════════════════════
        // Stage 8: Fetch README + key source files
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "fetching_readme",
          progress: 68,
          message: "Reading README and source files...",
        });

        // Fetch README content
        let readmeContent: string | null = null;
        const readmeData = await fetchOptionalRepoResource<{
          encoding?: string;
          content?: string;
        } | null>(
          `https://api.github.com/repos/${repoFullName}/readme`,
          null,
          "readme"
        );
        if (readmeData?.encoding === "base64" && readmeData.content) {
          readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8");
          // Limit README to 5KB for AI analysis
          if (readmeContent.length > 5120) readmeContent = readmeContent.slice(0, 5120) + "\n...(truncated)";
        }

        // Fetch key source files for AI
        const keyFilePaths = selectKeyFiles(treeItems);
        const sourceSnippets: { path: string; content: string }[] = [];
        let totalSourceBytes = 0;

        for (const filePath of keyFilePaths) {
          if (totalSourceBytes > 57344) break; // Max 56KB total
          // Skip package.json if we already parsed it as dependency
          if (filePath === "package.json" && dependencyInfo) continue;

          try {
            const fileData = await fetchOptionalRepoResource<{
              encoding?: string;
              content?: string;
            } | null>(
              `https://api.github.com/repos/${repoFullName}/contents/${encodeContentPath(filePath)}`,
              null,
              `source:${filePath}`
            );
            if (fileData?.encoding === "base64" && fileData.content) {
              const rawContent = Buffer.from(fileData.content, "base64").toString("utf-8");
              const content = rawContent.length > 12288
                ? rawContent.slice(0, 12288) + "\n...(truncated)"
                : rawContent;
              sourceSnippets.push({ path: filePath, content });
              totalSourceBytes += content.length;
            }
          } catch {
            // Skip files that fail to fetch
          }
        }

        // ══════════════════════════════════════════════
        // Stage 9: Code quality metrics
        // ══════════════════════════════════════════════
        const hasTestDir = treeItems.some(
          (t) => t.type === "tree" && (t.path === "tests" || t.path === "test" || t.path === "__tests__" || t.path === "src/__tests__")
        );
        const hasTestFiles = treeItems.some(
          (t) => t.type === "blob" && (t.path.includes(".test.") || t.path.includes(".spec.") || t.path.includes("_test."))
        );

        const codeQuality = {
          hasTests: hasTestDir || hasTestFiles,
          hasCI: cicd.hasGitHubActions || treeItems.some((t) => t.type === "blob" && (t.path === ".gitlab-ci.yml" || t.path === "Jenkinsfile")),
          hasLinting: configFiles.some((f) => f.includes("eslint") || f.includes("prettier") || f.includes("biome")),
          hasTypeScript: treeItems.some((t) => t.type === "blob" && (t.path === "tsconfig.json" || t.path.endsWith("/tsconfig.json"))),
          hasDocker: cicd.hasDockerfile || cicd.hasDockerCompose,
          hasReadme: readmeContent !== null,
          hasLicense: treeItems.some((t) => t.type === "blob" && (t.path === "LICENSE" || t.path === "LICENSE.md" || t.path.endsWith("/LICENSE") || t.path.endsWith("/LICENSE.md"))),
          hasContributing: treeItems.some((t) => t.type === "blob" && (t.path === "CONTRIBUTING.md" || t.path.endsWith("/CONTRIBUTING.md"))),
          hasChangelog: treeItems.some((t) => t.type === "blob" && (t.path === "CHANGELOG.md" || t.path.endsWith("/CHANGELOG.md"))),
          qualityScore: 0, // will compute below
        };

        // Compute quality score (each item worth ~11 points)
        let score = 0;
        if (codeQuality.hasTests) score += 15;
        if (codeQuality.hasCI) score += 12;
        if (codeQuality.hasLinting) score += 10;
        if (codeQuality.hasTypeScript) score += 10;
        if (codeQuality.hasDocker) score += 8;
        if (codeQuality.hasReadme) score += 15;
        if (codeQuality.hasLicense) score += 10;
        if (codeQuality.hasContributing) score += 5;
        if (codeQuality.hasChangelog) score += 5;
        if (commitAnalytics.usesConventionalCommits) score += 5;
        if (dependencyInfo) score += 5;
        codeQuality.qualityScore = Math.min(100, score);

        // ══════════════════════════════════════════════
        // Stage 10: AI deep analysis
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "ai_analyzing",
          progress: 78,
          message: "AI is analyzing code patterns and architecture...",
        });

        let aiInsights: {
          projectSummary: string;
          architectureAnalysis: string;
          techStackAssessment: string;
          complexityLevel: "simple" | "medium" | "complex";
          detectedSkills: string[];
          strengths: string[];
          improvements: string[];
          cvReadyDescription: string;
        } | null = null;

        try {
          aiInsights = await aiService.deepAnalyzeRepo({
            name: repo.name,
            description: repo.description,
            languages: Object.entries(languages).map(([lang, bytes]) => ({
              language: lang,
              percentage: Object.values(languages).reduce((a, b) => a + b, 0) > 0
                ? Math.round((bytes / Object.values(languages).reduce((a, b) => a + b, 0)) * 100)
                : 0,
            })),
            topics: repo.topics ?? [],
            fileTree,
            dependencies: dependencyInfo ? {
              source: dependencyInfo.source,
              dependencies: dependencyInfo.dependencies,
              devDependencies: dependencyInfo.devDependencies,
            } : null,
            readmeContent,
            sourceSnippets,
            commitCount: commits.length,
            contributors: contributors.length,
            stars: repo.stargazers_count ?? 0,
            qualityScore: codeQuality.qualityScore,
            hasTests: codeQuality.hasTests,
            hasCI: codeQuality.hasCI,
            hasDocker: codeQuality.hasDocker,
            hasTypeScript: codeQuality.hasTypeScript,
            recentActivityCount: commitAnalytics.recentActivityCount,
            activeDays: commitAnalytics.activeDays,
            recentCommits: commits
              .slice(0, 5)
              .map((commit) => commit.commit?.message?.split("\n")[0])
              .filter((message): message is string => Boolean(message)),
            dependencySignals: dependencyInfo ? {
              frameworks: dependencyInfo.frameworks,
              databases: dependencyInfo.databases,
              uiLibraries: dependencyInfo.uiLibraries,
              testingTools: dependencyInfo.testingTools,
              buildTools: dependencyInfo.buildTools,
              linters: dependencyInfo.linters,
            } : null,
          }, locale);
        } catch (aiError) {
          logger.error("AI deep analysis failed", {
            repoFullName,
            error: aiError instanceof Error ? aiError.message : String(aiError),
            stack: aiError instanceof Error ? aiError.stack : undefined,
          });
        }

        // If AI returned but ALL fields are empty, retry with simplified prompt
        if (aiInsights && !aiInsights.projectSummary && !aiInsights.architectureAnalysis && aiInsights.detectedSkills.length === 0 && !aiInsights.cvReadyDescription) {
          logger.warn("AI returned empty insights, retrying with simplified data", { repoFullName });
          try {
            aiInsights = await aiService.deepAnalyzeRepo({
              name: repo.name,
              description: repo.description,
              languages: Object.entries(languages).map(([lang, bytes]) => ({
                language: lang,
                percentage: Object.values(languages).reduce((a, b) => a + b, 0) > 0
                  ? Math.round((bytes / Object.values(languages).reduce((a, b) => a + b, 0)) * 100)
                  : 0,
              })),
              topics: repo.topics ?? [],
              fileTree,
              dependencies: dependencyInfo ? {
                source: dependencyInfo.source,
                dependencies: dependencyInfo.dependencies,
                devDependencies: dependencyInfo.devDependencies,
              } : null,
              readmeContent,
              sourceSnippets: [], // Remove source snippets to simplify
              commitCount: commits.length,
              contributors: contributors.length,
              stars: repo.stargazers_count ?? 0,
              qualityScore: codeQuality.qualityScore,
              hasTests: codeQuality.hasTests,
              hasCI: codeQuality.hasCI,
              hasDocker: codeQuality.hasDocker,
              hasTypeScript: codeQuality.hasTypeScript,
              recentActivityCount: commitAnalytics.recentActivityCount,
              activeDays: commitAnalytics.activeDays,
              recentCommits: commits
                .slice(0, 5)
                .map((commit) => commit.commit?.message?.split("\n")[0])
                .filter((message): message is string => Boolean(message)),
              dependencySignals: dependencyInfo ? {
                frameworks: dependencyInfo.frameworks,
                databases: dependencyInfo.databases,
                uiLibraries: dependencyInfo.uiLibraries,
                testingTools: dependencyInfo.testingTools,
                buildTools: dependencyInfo.buildTools,
                linters: dependencyInfo.linters,
              } : null,
            }, locale);
          } catch (retryError) {
            logger.error("AI retry also failed", { repoFullName, error: retryError instanceof Error ? retryError.message : String(retryError) });
          }
          // Keep partial results even if retry still has some empty fields
          if (aiInsights && !aiInsights.projectSummary && !aiInsights.architectureAnalysis && aiInsights.detectedSkills.length === 0 && !aiInsights.cvReadyDescription) {
            aiInsights = null;
          }
        }

        // ══════════════════════════════════════════════
        // Final: Build & save result
        // ══════════════════════════════════════════════
        await publishProgress(analysisId, {
          stage: "ai_analyzing",
          progress: 92,
          message: "Finalizing analysis...",
        });

        // Calculate language percentages
        const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
        const languageBreakdown = Object.entries(languages).map(([lang, bytes]) => ({
          language: lang,
          percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
          bytes,
        }));

        // Extract technologies from languages + topics + dependencies
        const allTechs = [
          ...Object.keys(languages),
          ...(repo.topics ?? []),
        ];
        if (dependencyInfo) {
          allTechs.push(
            ...dependencyInfo.frameworks,
            ...dependencyInfo.databases,
            ...dependencyInfo.uiLibraries,
          );
        }

        const result = {
          // Original fields
          repoFullName,
          name: repo.name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          openIssues: repo.open_issues_count,
          license: repo.license?.spdx_id ?? null,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          topics: repo.topics ?? [],
          languages: languageBreakdown,
          primaryLanguage: languageBreakdown[0]?.language ?? null,
          technologies: [...new Set(allTechs)],
          totalCommits: commits.length,
          recentCommits: commits.slice(0, 10).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => ({
              sha: c.sha?.substring(0, 7),
              message: c.commit?.message?.split("\n")[0],
              date: c.commit?.author?.date,
              author: c.commit?.author?.name,
            })
          ),
          hasReadme: readmeContent !== null,
          url: repo.html_url,
          defaultBranch: repo.default_branch,
          isArchived: repo.archived,
          isFork: repo.fork,
          isPrivate: repo.private ?? false,

          // Deep analysis fields
          fileTree,
          dependencyInfo,
          contributors,
          cicd,
          commitAnalytics,
          codeQuality,
          aiInsights,
          readmeContent: readmeContent ? readmeContent.slice(0, 2000) : null, // Store truncated for frontend display
        };

        // Update analysis with COMPLETED status
        await prisma.gitHubAnalysis.update({
          where: { id: analysisId },
          data: {
            status: "COMPLETED",
            result,
          },
        });

        await publishProgress(analysisId, {
          stage: "completed",
          progress: 100,
          message: "Deep analysis complete!",
        });

        logger.info("GitHub deep analysis completed", { analysisId, repoFullName });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const attemptsAllowed = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
        const hasMoreAttempts = job.attemptsMade + 1 < attemptsAllowed;

        if (error instanceof GitHubApiRequestError && error.retryable && hasMoreAttempts) {
          logger.warn("GitHub analysis attempt failed, retrying", {
            analysisId,
            error: errorMessage,
            attempt: job.attemptsMade + 1,
            attemptsAllowed,
          });

          await prisma.gitHubAnalysis.update({
            where: { id: analysisId },
            data: {
              status: "PENDING",
              error: null,
            },
          });

          throw error;
        }

        logger.error("GitHub analysis failed", { analysisId, error: errorMessage });

        await prisma.gitHubAnalysis.update({
          where: { id: analysisId },
          data: {
            status: "FAILED",
            error: errorMessage,
          },
        });

        await publishProgress(analysisId, {
          stage: "failed",
          progress: 0,
          message: errorMessage,
        });

        throw error;
      }
    },
    { concurrency: 1 }
  );

  logger.info("GitHub deep analysis worker started");
  return worker;
}
