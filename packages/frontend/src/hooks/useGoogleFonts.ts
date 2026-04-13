import { useEffect } from "react";

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2";

const loadedFonts = new Set<string>();

function toGoogleFontsParam(fontName: string): string {
  return fontName.replace(/ /g, "+");
}

export function useGoogleFonts(fonts: string[]) {
  useEffect(() => {
    const newFonts = fonts.filter((f) => f && !loadedFonts.has(f));
    if (newFonts.length === 0) return;

    const families = newFonts
      .map((f) => `family=${toGoogleFontsParam(f)}:wght@300;400;500;600;700`)
      .join("&");

    const linkId = `gf-${newFonts.map((f) => f.replace(/ /g, "-")).join("-")}`;

    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `${GOOGLE_FONTS_URL}?${families}&display=swap`;
    document.head.appendChild(link);

    newFonts.forEach((f) => loadedFonts.add(f));
  }, [fonts]);
}
