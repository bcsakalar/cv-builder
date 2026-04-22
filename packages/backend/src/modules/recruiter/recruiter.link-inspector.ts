import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../../config/env";
import type { CandidateLinkType, LinkInspectionStatus } from "@cvbuilder/shared";

export interface LinkInspectionResult {
  normalizedUrl: string;
  host: string;
  linkType: CandidateLinkType;
  inspectionStatus: LinkInspectionStatus;
  statusCode: number | null;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  accessible: boolean | null;
  responseTimeMs: number | null;
  error: string | null;
}

function inferLinkType(host: string): CandidateLinkType {
  const lower = host.toLowerCase();
  if (lower.includes("github.com")) return "GITHUB";
  if (lower.includes("linkedin.com")) return "LINKEDIN";
  if (lower.includes("behance.net") || lower.includes("dribbble.com") || lower.includes("medium.com") || lower.includes("notion.site")) {
    return "PORTFOLIO";
  }
  return "OTHER";
}

function normalizeUrl(value: string): string | null {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  const [a, b] = parts;
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIp(hostname: string): boolean {
  const type = net.isIP(hostname);
  if (type === 4) return isPrivateIPv4(hostname);
  if (type === 6) {
    const normalized = hostname.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return false;
}

async function assertSafeHost(hostname: string): Promise<void> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || isPrivateIp(lower)) {
    throw new Error("Blocked private or local host");
  }

  const lookups = await dns.lookup(hostname, { all: true, verbatim: true }).catch(() => [] as { address: string }[]);
  if (lookups.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Blocked private network target");
  }
}

function extractMetadata(html: string): { title: string | null; description: string | null } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  return {
    title: titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null,
    description: descriptionMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null,
  };
}

export async function inspectCandidateLink(rawUrl: string): Promise<LinkInspectionResult> {
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) {
    return {
      normalizedUrl: rawUrl,
      host: "",
      linkType: "OTHER",
      inspectionStatus: "FAILED",
      statusCode: null,
      finalUrl: null,
      title: null,
      description: null,
      accessible: false,
      responseTimeMs: null,
      error: "Invalid URL",
    };
  }

  const initialUrl = new URL(normalizedUrl);
  const linkType = inferLinkType(initialUrl.hostname);

  try {
    await assertSafeHost(initialUrl.hostname);
  } catch (error) {
    return {
      normalizedUrl,
      host: initialUrl.hostname,
      linkType,
      inspectionStatus: "BLOCKED",
      statusCode: null,
      finalUrl: null,
      title: null,
      description: null,
      accessible: false,
      responseTimeMs: null,
      error: error instanceof Error ? error.message : "Blocked host",
    };
  }

  const startedAt = Date.now();
  let currentUrl = normalizedUrl;

  try {
    for (let redirectCount = 0; redirectCount <= env.RECRUITER_LINK_MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(env.RECRUITER_LINK_TIMEOUT_MS),
        headers: {
          "User-Agent": "CvBuilder Recruiter Bot/1.0",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      if (isRedirect) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect response did not include a location header");
        }

        const nextUrl = new URL(location, currentUrl).toString();
        const parsedNextUrl = new URL(nextUrl);
        await assertSafeHost(parsedNextUrl.hostname);
        currentUrl = nextUrl;
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const responseTimeMs = Date.now() - startedAt;
      const body = contentType.includes("text/html") ? (await response.text()).slice(0, 8192) : "";
      const metadata = extractMetadata(body);

      return {
        normalizedUrl,
        host: initialUrl.hostname,
        linkType,
        inspectionStatus: "COMPLETED",
        statusCode: response.status,
        finalUrl: currentUrl,
        title: metadata.title,
        description: metadata.description,
        accessible: response.ok,
        responseTimeMs,
        error: response.ok ? null : `HTTP ${response.status}`,
      };
    }

    throw new Error("Maximum redirect count exceeded");
  } catch (error) {
    return {
      normalizedUrl,
      host: initialUrl.hostname,
      linkType,
      inspectionStatus: "FAILED",
      statusCode: null,
      finalUrl: currentUrl,
      title: null,
      description: null,
      accessible: false,
      responseTimeMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Link inspection failed",
    };
  }
}
