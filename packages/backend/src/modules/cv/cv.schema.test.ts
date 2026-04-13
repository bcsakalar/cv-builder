import {
  certificationSchema,
  languageSchema,
  publicationSchema,
  referenceSchema,
} from "./cv.schema";

describe("cv schema compatibility", () => {
  it("normalizes legacy certification fields", () => {
    const result = certificationSchema.parse({
      name: "AWS Certified Developer",
      issuer: "Amazon Web Services",
      issueDate: "2024-01-01",
      expiryDate: "",
      credentialUrl: "",
      orderIndex: 2,
    });

    expect(result).toEqual({
      name: "AWS Certified Developer",
      issuingOrganization: "Amazon Web Services",
      issueDate: "2024-01-01",
      expirationDate: null,
      credentialId: null,
      credentialUrl: null,
      orderIndex: 2,
    });
  });

  it("maps legacy language proficiency values to backend enums", () => {
    const result = languageSchema.parse({
      language: "English",
      proficiency: "FLUENT",
      orderIndex: 1,
    });

    expect(result).toEqual({
      name: "English",
      proficiency: "FULL_PROFESSIONAL",
      orderIndex: 1,
    });
  });

  it("accepts publishDate alias and blank optional publication fields", () => {
    const result = publicationSchema.parse({
      title: "Reliable Automation at Scale",
      publisher: "QA Weekly",
      publishDate: "2024-05-01",
      url: "",
      description: "",
    });

    expect(result).toEqual({
      title: "Reliable Automation at Scale",
      publisher: "QA Weekly",
      date: "2024-05-01",
      url: null,
      description: null,
      orderIndex: 0,
    });
  });

  it("normalizes legacy reference position and blank contact values", () => {
    const result = referenceSchema.parse({
      name: "Jane Doe",
      position: "Engineering Manager",
      company: "CvBuilder",
      email: "",
      phone: "",
      relationship: "Former manager",
    });

    expect(result).toEqual({
      name: "Jane Doe",
      title: "Engineering Manager",
      company: "CvBuilder",
      email: null,
      phone: null,
      relationship: "Former manager",
      orderIndex: 0,
    });
  });
});