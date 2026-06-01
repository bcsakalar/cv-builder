import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { mintPrintToken, verifyPrintToken } from "./pdf.token";

const BASE = { userId: "user-1", cvId: "cv-1" } as const;

describe("print token", () => {
  it("mints a token that verifies back to its payload", () => {
    const token = mintPrintToken({
      ...BASE,
      templateName: "modern",
      theme: { primaryColor: "#000000" },
      pageSize: "A4",
      margin: "normal",
      locale: "tr",
    });

    const payload = verifyPrintToken(token);
    expect(payload.userId).toBe("user-1");
    expect(payload.cvId).toBe("cv-1");
    expect(payload.templateName).toBe("modern");
    expect(payload.theme).toEqual({ primaryColor: "#000000" });
    expect(payload.locale).toBe("tr");
  });

  it("rejects a missing token", () => {
    expect(() => verifyPrintToken(undefined)).toThrow();
    expect(() => verifyPrintToken("")).toThrow();
  });

  it("rejects a malformed / tampered token", () => {
    expect(() => verifyPrintToken("not-a-jwt")).toThrow();
    const token = mintPrintToken(BASE);
    expect(() => verifyPrintToken(`${token}tampered`)).toThrow();
  });

  it("rejects a token signed with the wrong secret", () => {
    const forged = jwt.sign(BASE, "a-different-secret-value-123456", { subject: "cv-print" });
    expect(() => verifyPrintToken(forged)).toThrow();
  });

  it("rejects a token with the wrong subject", () => {
    const wrongSubject = jwt.sign(BASE, env.JWT_SECRET, { subject: "not-print", expiresIn: 120 });
    expect(() => verifyPrintToken(wrongSubject)).toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(BASE, env.JWT_SECRET, { subject: "cv-print", expiresIn: -10 });
    expect(() => verifyPrintToken(expired)).toThrow();
  });
});
