import { parseCandidateFromText } from "./recruiter.parser";
import { scoreCandidate } from "./recruiter.scoring";

describe("recruiter module helpers", () => {
  it("parses core candidate details from extracted PDF text", () => {
    const parsed = parseCandidateFromText(`
Jane Doe
Senior Backend Engineer
Istanbul, Turkey
jane@example.com
+90 555 444 3322
https://github.com/janedoe
https://janedoe.dev

Experienced backend engineer with 6 years of experience building TypeScript and Node.js services on AWS.
Built distributed APIs with PostgreSQL, Redis, Docker, and CI/CD pipelines.
    `);

    expect(parsed.fullName).toBe("Jane Doe");
    expect(parsed.email).toBe("jane@example.com");
    expect(parsed.topSkills).toEqual(expect.arrayContaining(["TypeScript", "Node.js", "AWS", "PostgreSQL"]));
    expect(parsed.links).toHaveLength(2);
    expect(parsed.completenessScore).toBeGreaterThan(60);
  });

  it("scores a strong technical candidate above shortlist threshold", () => {
    const result = scoreCandidate(
      {
        title: "Senior Backend Engineer",
        description: "We need TypeScript, Node.js, PostgreSQL, Docker, AWS, CI/CD, and API design experience.",
        mustHaveSkills: ["TypeScript", "Node.js", "PostgreSQL", "Docker"],
        niceToHaveSkills: ["AWS", "CI/CD", "Redis"],
        minimumYearsExperience: 5,
      },
      {
        fullName: "Jane Doe",
        headline: "Senior Backend Engineer",
        summary: "Backend engineer delivering reliable TypeScript services on AWS.",
        topSkills: ["TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Redis"],
        completenessScore: 88,
        yearsOfExperience: 6,
        rawTextSnippet: "Built APIs, improved latency by 40%, and ran CI/CD pipelines.",
        email: "jane@example.com",
        phone: "+90 555 444 3322",
      },
      [
        {
          id: "1",
          url: "https://github.com/janedoe",
          normalizedUrl: "https://github.com/janedoe",
          host: "github.com",
          linkType: "GITHUB",
          inspectionStatus: "COMPLETED",
          statusCode: 200,
          finalUrl: "https://github.com/janedoe",
          title: "Jane Doe · GitHub",
          description: null,
          accessible: true,
          responseTimeMs: 120,
          error: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    );

    expect(result.recommendation).toBe("STRONG_MATCH");
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.missingHardSkills).toHaveLength(0);
  });
});
