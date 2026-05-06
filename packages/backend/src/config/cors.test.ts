import { getConfiguredOrigins, getPrimaryFrontendOrigin, isAllowedCorsOrigin } from "./cors";

describe("cors config helpers", () => {
  it("allows localhost dev origins on alternate ports during development", () => {
    const allowed = isAllowedCorsOrigin("http://localhost:5174", {
      NODE_ENV: "development",
      CORS_ORIGIN: "http://localhost:5173",
    });

    expect(allowed).toBe(true);
  });

  it("rejects alternate localhost ports outside development", () => {
    const allowed = isAllowedCorsOrigin("http://localhost:5174", {
      NODE_ENV: "production",
      CORS_ORIGIN: "http://localhost:5173",
    });

    expect(allowed).toBe(false);
  });

  it("prefers the request origin for frontend redirects when it is allowed", () => {
    const origin = getPrimaryFrontendOrigin(
      {
        NODE_ENV: "development",
        CORS_ORIGIN: "http://localhost:5173",
      },
      "http://localhost:5174/"
    );

    expect(origin).toBe("http://localhost:5174");
  });

  it("normalizes and de-duplicates configured origins", () => {
    const origins = getConfiguredOrigins(
      " http://localhost:5173/ , http://localhost:5174 , http://localhost:5173 "
    );

    expect(origins).toEqual(["http://localhost:5173", "http://localhost:5174"]);
  });
});