import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./database-url";

const primary = "postgresql://primary.example/sweepsign";
const fallback = "postgresql://fallback.example/sweepsign?sslmode=require";

describe("resolveDatabaseUrl", () => {
  it("uses POSTGRES_URL when DATABASE_URL is blank", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "", POSTGRES_URL: fallback }),
    ).toBe(
      "postgresql://fallback.example/sweepsign?sslmode=require&uselibpqcompat=true",
    );
  });

  it("prefers a non-empty DATABASE_URL", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: primary, POSTGRES_URL: fallback }),
    ).toBe(primary);
  });

  it("treats blank and missing values as unconfigured", () => {
    expect(
      resolveDatabaseUrl({ DATABASE_URL: "   ", POSTGRES_URL: undefined }),
    ).toBeUndefined();
  });

  it("preserves an explicit libpq compatibility setting", () => {
    const explicit = `${fallback}&uselibpqcompat=false`;
    expect(resolveDatabaseUrl({ POSTGRES_URL: explicit })).toBe(explicit);
  });
});
