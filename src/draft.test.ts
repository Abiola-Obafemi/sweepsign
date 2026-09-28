import { describe, expect, it } from "vitest";
import {
  buildSummary,
  clearDraftIfUnchanged,
  createDefaultDraft,
  isValidActionUrl,
  isValidDateValue,
  loadDraft,
  localDateValue,
  saveDraft,
  STORAGE_KEY,
} from "./draft";

describe("draft storage", () => {
  it("round-trips a valid draft", () => {
    const storage = window.localStorage;
    storage.clear();
    const draft = { ...createDefaultDraft(), jobName: "Rivera home" };
    saveDraft(storage, draft);
    expect(loadDraft(storage).jobName).toBe("Rivera home");
  });

  it("keeps recovery drafts scoped to their job", () => {
    const storage = window.localStorage;
    storage.clear();
    saveDraft(storage, { ...createDefaultDraft(), jobName: "Unsynced" }, "new");
    expect(loadDraft(storage, "new").jobName).toBe("Unsynced");
    expect(
      loadDraft(storage, "another-job", {
        ...createDefaultDraft(),
        jobName: "Server copy",
      }).jobName,
    ).toBe("Server copy");
  });

  it("only clears the browser recovery copy that the server saved", () => {
    const storage = window.localStorage;
    const first = { ...createDefaultDraft(), jobName: "First version" };
    const newer = { ...first, jobName: "Newer version" };
    saveDraft(storage, newer, "new");
    clearDraftIfUnchanged(storage, first, "new");
    expect(loadDraft(storage, "new").jobName).toBe("Newer version");
    clearDraftIfUnchanged(storage, newer, "new");
    expect(storage.getItem(`${STORAGE_KEY}:new`)).toBeNull();
  });

  it("recovers from invalid or stale data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{bad");
    expect(loadDraft(window.localStorage).version).toBe(1);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 0, scope: [] }),
    );
    expect(loadDraft(window.localStorage).scope.length).toBeGreaterThan(0);
  });

  it("recovers every wrong-typed persisted field without crashing", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        scope: [],
        jobName: null,
        cleanerName: 2,
        serviceDate: false,
        exception: {},
        photos: "bad",
        nextAction: "invented",
        nextActionUrl: [],
      }),
    );
    const draft = loadDraft(window.localStorage);
    expect(draft.jobName).toBe("");
    expect(draft.scope).toHaveLength(9);
    expect(draft.scope.every((item) => item.status === "unchecked")).toBe(true);
    expect(draft.photos).toEqual([]);
  });

  it("uses the local calendar date and rejects impossible stored dates", () => {
    expect(localDateValue(new Date(2026, 8, 20, 23, 30))).toBe("2026-09-20");
    expect(isValidDateValue("2026-02-30")).toBe(false);
    expect(isValidDateValue("garbage")).toBe(false);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createDefaultDraft(), serviceDate: "garbage" }),
    );
    expect(loadDraft(window.localStorage).serviceDate).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});

describe("handoff formatting", () => {
  it("accepts only web action links", () => {
    expect(isValidActionUrl("https://example.com/review")).toBe(true);
    expect(isValidActionUrl("javascript:alert(1)")).toBe(false);
    expect(isValidActionUrl("not a link")).toBe(false);
  });

  it("includes factual completion and next-action details", () => {
    const base = createDefaultDraft();
    const summary = buildSummary({
      ...createDefaultDraft(),
      scope: base.scope.map((item) => ({ ...item, status: "complete" })),
      jobName: "Rivera home",
      cleanerName: "Sarah",
      nextActionUrl: "https://example.com/review",
      exception: "Fridge exterior skipped at the client’s request.",
    });
    expect(summary).toContain("Rivera home");
    expect(summary).toContain("Completed by: Sarah");
    expect(summary).toContain("Fridge exterior skipped");
    expect(summary).toContain("Leave a review: https://example.com/review");
  });
});
