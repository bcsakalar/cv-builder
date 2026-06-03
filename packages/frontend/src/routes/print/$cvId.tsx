import { createRoute, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { rootRoute } from "../__root";
import { CVPreview } from "@/components/cv-preview/CVPreview";
import { resolveTemplatePreview, useThemeStore } from "@/stores/theme.store";
import { fetchPrintRenderData, type PrintRenderData } from "@/services/print.api";
import type { CVDetail } from "@/services/cv.api";

interface PrintSearch {
  token: string;
}

export const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print/$cvId",
  validateSearch: (search: Record<string, unknown>): PrintSearch => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: PrintPage,
});

declare global {
  interface Window {
    /** Set true once the CV preview + fonts have fully rendered (read by Puppeteer). */
    __CV_READY__?: boolean;
    /** Set when rendering failed so PDF generation can fail fast. */
    __CV_ERROR__?: string;
  }
}

/**
 * Chromeless route that renders the EXACT same <CVPreview> the user sees in the
 * editor. Headless Chrome navigates here (authorized by the print token) and
 * waits for window.__CV_READY__ before calling page.pdf(), guaranteeing the PDF
 * is a 1:1 replica of the live preview.
 */
function PrintPage() {
  // useParams keeps the route param contract explicit even though the token in
  // the query string carries the authoritative cvId.
  useParams({ from: "/print/$cvId" });
  const { token } = useSearch({ from: "/print/$cvId" });
  const [data, setData] = useState<PrintRenderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const replaceTheme = useThemeStore((s) => s.replaceTheme);
  const setActiveTemplate = useThemeStore((s) => s.setActiveTemplate);

  useEffect(() => {
    window.__CV_READY__ = false;
    window.__CV_ERROR__ = undefined;

    if (!token) {
      // Derived in render below; only the external (window) flag is set here.
      window.__CV_ERROR__ = "missing-token";
      return;
    }

    const controller = new AbortController();
    fetchPrintRenderData(token, controller.signal)
      .then((payload) => {
        // Mirror the editor: hydrate the theme store and active template before
        // rendering so the preview is identical to what the user configured.
        replaceTheme(payload.theme ?? payload.cv.themeConfig);
        setActiveTemplate(resolveTemplatePreview(payload.templateName));
        setData(payload);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load CV for printing");
        window.__CV_ERROR__ = "load-failed";
      });

    return () => controller.abort();
  }, [token, replaceTheme, setActiveTemplate]);

  // Signal readiness once data is rendered AND web fonts have settled, after
  // two animation frames so the layout has committed a paint.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    const markReady = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.__CV_READY__ = true;
        }),
      );
    };

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(markReady).catch(markReady);
    } else {
      markReady();
    }

    return () => {
      cancelled = true;
    };
  }, [data]);

  const renderError = !token ? "Missing print token" : error;
  if (renderError) {
    return (
      <div data-testid="print-error" style={{ padding: "24px", fontFamily: "sans-serif" }}>
        {renderError}
      </div>
    );
  }

  if (!data) {
    return <div data-testid="print-loading" />;
  }

  return (
    <div className="cv-print-root" style={{ background: "#ffffff" }}>
      {/* Print-specific resets: force a white canvas (so dark-mode / bg-background
          never bleeds into the PDF), print theme colors/badges, no page chrome. */}
      <style>{`
        html, body, #root, #root > div { background: #ffffff !important; margin: 0; padding: 0; }
        body * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .cv-print-root > div { box-shadow: none !important; border-radius: 0 !important; }
        @media print {
          /* Section containers must flow freely across page boundaries; otherwise a
             whole section that doesn't fit jumps to the next page and leaves a large
             gap at the bottom. (.mb-5/.mb-6/.mb-8 are section wrappers across templates;
             Modern renders its sections as div.mb-5 rather than <section>.) */
          section, .mb-6, .mb-8 { break-inside: auto; }
          :not(section) > .mb-5 { break-inside: auto; }
          /* Keep each individual entry and list item intact (no mid-block splits). */
          section > div, .mb-5 > div, li { break-inside: avoid; }
          /* Never strand a section heading alone at the bottom of a page. The hr is
             included because Classic renders its heading as <h2> + <hr>, so the break
             must also be suppressed after the divider to keep it with the first entry. */
          h1, h2, h3, hr { break-after: avoid; }
        }
      `}</style>
      <CVPreview cv={data.cv as CVDetail} />
    </div>
  );
}
