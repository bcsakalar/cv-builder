// ═══════════════════════════════════════════════════════════
// AI Language Guard — heuristic locale detection for prose fields
//
// Local models (e.g. qwen2.5-coder) sometimes ignore the "answer in
// Turkish" instruction and emit English prose. We use a lightweight,
// dependency-free heuristic to detect that leakage so callers can drop
// the off-language value and fall back to the deterministic localized text.
//
// IMPORTANT: this is only meaningful for *prose*. Never run it against
// skill / technology lists — those are language-neutral proper nouns
// ("Docker", "Prisma", "WebRTC") and would be misclassified as English.
// ═══════════════════════════════════════════════════════════

export type SupportedLocale = "en" | "tr";

/** Characters that only appear in Turkish text. */
const TURKISH_CHARS = /[ışğüöçİĞÜŞÖÇ]/g;

/** High-frequency Turkish function words (whole-word match, lower-cased). */
const TURKISH_STOPWORDS = new Set([
  "ve", "ile", "için", "icin", "bir", "bu", "şu", "su", "olan", "gibi", "daha",
  "çok", "cok", "ancak", "ayrıca", "ayrica", "üzerinde", "uzerinde", "sağlar",
  "saglar", "geliştirilen", "gelistirilen", "geliştirildi", "gelistirildi",
  "mimari", "yapı", "yapi", "katman", "kullanarak", "kullanılarak", "kullanilarak",
  "destekli", "odaklı", "odakli", "yönetim", "yonetim", "tabanlı", "tabanli",
  "depo", "proje", "sürdürülebilir", "surdurulebilir", "güvenli", "guvenli",
]);

/** High-frequency English function words (whole-word match, lower-cased). */
const ENGLISH_STOPWORDS = new Set([
  "the", "and", "with", "for", "this", "that", "from", "into", "using", "used",
  "built", "project", "repository", "application", "architecture", "across",
  "which", "while", "their", "based", "data", "layer", "clean", "stack",
  "delivery", "engineering", "structure", "production", "implementation",
]);

/** Below this length there is not enough signal to judge reliably. */
const MIN_JUDGE_LENGTH = 16;

interface LanguageSignals {
  turkishChars: number;
  turkishStopwords: number;
  englishStopwords: number;
}

function collectSignals(text: string): LanguageSignals {
  const turkishChars = (text.match(TURKISH_CHARS) ?? []).length;
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];

  let turkishStopwords = 0;
  let englishStopwords = 0;
  for (const word of words) {
    if (TURKISH_STOPWORDS.has(word)) turkishStopwords += 1;
    if (ENGLISH_STOPWORDS.has(word)) englishStopwords += 1;
  }

  return { turkishChars, turkishStopwords, englishStopwords };
}

/**
 * Returns true when `text` is consistent with `locale` (or too short / too
 * ambiguous to confidently reject). Returns false only when the text is
 * clearly written in the *other* language.
 */
export function isLikelyLocale(text: string | null | undefined, locale: SupportedLocale): boolean {
  if (typeof text !== "string") return true;
  const trimmed = text.trim();
  if (trimmed.length < MIN_JUDGE_LENGTH) return true;

  const { turkishChars, turkishStopwords, englishStopwords } = collectSignals(trimmed);

  if (locale === "tr") {
    // Clearly English: several English function words and no Turkish signal.
    const clearlyEnglish =
      englishStopwords >= 3 && turkishStopwords === 0 && turkishChars === 0;
    return !clearlyEnglish;
  }

  // locale === "en" — clearly Turkish if Turkish-only chars or function words dominate.
  const clearlyTurkish =
    turkishChars >= 2 || turkishStopwords >= 3 || turkishStopwords > englishStopwords + 1;
  return !clearlyTurkish;
}

/**
 * Returns `text` when it matches the locale, otherwise `null`. Convenience for
 * merge logic that wants to fall back to localized deterministic content.
 */
export function keepIfLocale(text: string, locale: SupportedLocale): string | null {
  return isLikelyLocale(text, locale) ? text : null;
}

/**
 * Fraction (0..1) of prose items that match the target locale. Used to score
 * an AI attempt so off-language responses are retried before being accepted.
 */
export function proseLocalePurity(items: Array<string | null | undefined>, locale: SupportedLocale): number {
  const prose = items.filter(
    (item): item is string => typeof item === "string" && item.trim().length >= MIN_JUDGE_LENGTH,
  );
  if (prose.length === 0) return 1;

  const matching = prose.filter((item) => isLikelyLocale(item, locale)).length;
  return matching / prose.length;
}
