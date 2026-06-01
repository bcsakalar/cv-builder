import { isLikelyLocale, keepIfLocale, proseLocalePurity } from "./ai.lang";

const TR_PROSE =
  "Bu proje React ve Node.js kullanılarak geliştirilen, çok katmanlı bir mimariye sahip tam yığın bir uygulamadır.";
const EN_PROSE =
  "This is a full-stack application built with React and Node.js, structured around a clean layered architecture for the project.";

describe("isLikelyLocale", () => {
  it("accepts Turkish prose for tr and rejects clearly English prose for tr", () => {
    expect(isLikelyLocale(TR_PROSE, "tr")).toBe(true);
    expect(isLikelyLocale(EN_PROSE, "tr")).toBe(false);
  });

  it("accepts English prose for en and rejects clearly Turkish prose for en", () => {
    expect(isLikelyLocale(EN_PROSE, "en")).toBe(true);
    expect(isLikelyLocale(TR_PROSE, "en")).toBe(false);
  });

  it("never misclassifies short, language-neutral skill/tech names", () => {
    for (const skill of ["Docker", "PostgreSQL", "Next.js", "WebRTC", "BullMQ"]) {
      expect(isLikelyLocale(skill, "tr")).toBe(true);
      expect(isLikelyLocale(skill, "en")).toBe(true);
    }
  });

  it("does not reject English-named skill phrases when locale is tr", () => {
    // Technical skills can contain English words; they must not be dropped.
    expect(isLikelyLocale("JWT authentication and RBAC authorization", "tr")).toBe(true);
  });

  it("treats nullish/short input as acceptable (cannot judge)", () => {
    expect(isLikelyLocale(null, "tr")).toBe(true);
    expect(isLikelyLocale(undefined, "en")).toBe(true);
    expect(isLikelyLocale("short", "tr")).toBe(true);
  });
});

describe("keepIfLocale", () => {
  it("returns the text when it matches the locale, null otherwise", () => {
    expect(keepIfLocale(TR_PROSE, "tr")).toBe(TR_PROSE);
    expect(keepIfLocale(EN_PROSE, "tr")).toBeNull();
  });
});

describe("proseLocalePurity", () => {
  it("returns 1 when all judgeable prose matches the locale", () => {
    expect(proseLocalePurity([TR_PROSE, TR_PROSE], "tr")).toBe(1);
  });

  it("drops toward 0 as off-language prose appears", () => {
    expect(proseLocalePurity([TR_PROSE, EN_PROSE], "tr")).toBe(0.5);
    expect(proseLocalePurity([EN_PROSE, EN_PROSE], "tr")).toBe(0);
  });

  it("ignores short/empty items and returns 1 when nothing is judgeable", () => {
    expect(proseLocalePurity(["", "Docker", null], "tr")).toBe(1);
  });
});
