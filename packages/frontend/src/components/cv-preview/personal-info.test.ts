// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getPreviewContactItems, resolveProfilePhotoUrl } from "./personal-info";

describe("preview personal info helpers", () => {
  it("builds all visible contact items from personal info", () => {
    const items = getPreviewContactItems({
      email: "berke@example.com",
      phone: "+90 507 095 78 78",
      city: "Izmir",
      country: "Turkiye",
      zipCode: "35110",
      website: "https://berkecansakalar.com/",
      linkedIn: "https://www.linkedin.com/in/berkecansakalar",
      github: "https://github.com/bcsakalar",
      twitter: "https://x.com/berkecansakalar",
    });

    expect(items.map((item) => item.key)).toEqual([
      "email",
      "phone",
      "location",
      "website",
      "linkedIn",
      "github",
      "twitter",
    ]);
    expect(items.find((item) => item.key === "location")?.value).toBe("Izmir, Turkiye 35110");
    expect(items.find((item) => item.key === "website")?.value).toBe("berkecansakalar.com");
    expect(items.find((item) => item.key === "linkedIn")?.value).toBe("linkedin.com/in/berkecansakalar");
    expect(items.find((item) => item.key === "github")?.value).toBe("github.com/bcsakalar");
    expect(items.find((item) => item.key === "twitter")?.href).toBe("https://x.com/berkecansakalar");
  });

  it("resolves uploaded photo paths against the backend origin", () => {
    expect(resolveProfilePhotoUrl({ profilePhotoUrl: "/uploads/photos/profile.webp" })).toBe(
      "http://localhost:3001/uploads/photos/profile.webp",
    );
  });
});