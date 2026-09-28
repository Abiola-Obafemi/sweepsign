import { describe, expect, it } from "vitest";
import { canonicalAuthUrl } from "./site";

describe("canonical auth URLs", () => {
  it("preserves the local origin outside production", () => {
    expect(
      canonicalAuthUrl(
        "http://127.0.0.1:3000/reset-password?token=test",
        false,
      ),
    ).toBe("http://127.0.0.1:3000/reset-password?token=test");
  });

  it("pins production links to the canonical host", () => {
    expect(
      canonicalAuthUrl(
        "https://preview.example/reset-password?token=test",
        true,
      ),
    ).toBe("https://www.sweepsign.com/reset-password?token=test");
  });
});
