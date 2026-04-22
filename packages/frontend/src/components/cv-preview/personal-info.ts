import { resolveStaticAssetUrl } from "@/lib/assets";

export interface PreviewContactItem {
  key: "email" | "phone" | "location" | "website" | "linkedIn" | "github" | "twitter";
  icon: string;
  value: string;
  href?: string;
}

type PersonalInfoRecord = Record<string, unknown> | null;

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function formatLinkLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function formatPersonalInfoLocation(personalInfo: PersonalInfoRecord): string | null {
  const city = getNonEmptyString(personalInfo?.city);
  const country = getNonEmptyString(personalInfo?.country);
  const location = [city, country].filter(Boolean).join(", ");

  if (!location) {
    return null;
  }

  return location;
}

export function resolveProfilePhotoUrl(personalInfo: PersonalInfoRecord): string | null {
  return resolveStaticAssetUrl(getNonEmptyString(personalInfo?.profilePhotoUrl));
}

export function getPreviewContactItems(personalInfo: PersonalInfoRecord): PreviewContactItem[] {
  const email = getNonEmptyString(personalInfo?.email);
  const phone = getNonEmptyString(personalInfo?.phone);
  const website = getNonEmptyString(personalInfo?.website);
  const linkedIn = getNonEmptyString(personalInfo?.linkedIn);
  const github = getNonEmptyString(personalInfo?.github);
  const twitter = getNonEmptyString(personalInfo?.twitter);
  const location = formatPersonalInfoLocation(personalInfo);

  return [
    email ? { key: "email", icon: "✉", value: email, href: `mailto:${email}` } : null,
    phone ? { key: "phone", icon: "☎", value: phone, href: `tel:${phone.replace(/\s+/g, "")}` } : null,
    location ? { key: "location", icon: "📍", value: location } : null,
    website ? { key: "website", icon: "🔗", value: formatLinkLabel(website), href: website } : null,
    linkedIn ? { key: "linkedIn", icon: "🔗", value: formatLinkLabel(linkedIn), href: linkedIn } : null,
    github ? { key: "github", icon: "🔗", value: formatLinkLabel(github), href: github } : null,
    twitter ? { key: "twitter", icon: "🔗", value: formatLinkLabel(twitter), href: twitter } : null,
  ].filter((item): item is PreviewContactItem => item !== null);
}