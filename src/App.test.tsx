import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App, HandoffEditor, HandoffPreview } from "./App";
import { createDefaultDraft, loadDraft } from "./draft";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("SweepSign workflow", () => {
  it("serializes server saves so an older request cannot overwrite a newer draft", async () => {
    let releaseFirst!: () => void;
    const firstRequest = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const attemptedNames: string[] = [];
    const onPersist = vi.fn((draft: ReturnType<typeof createDefaultDraft>) => {
      attemptedNames.push(draft.jobName);
      return attemptedNames.length === 1 ? firstRequest : Promise.resolve();
    });

    render(
      <HandoffEditor
        initialDraft={{ ...createDefaultDraft(), jobName: "First version" }}
        onPersist={onPersist}
        recoveryKey="race"
      />,
    );

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText(/Job nickname/i), {
      target: { value: "Newer version" },
    });
    await waitFor(() =>
      expect(loadDraft(window.localStorage, "race").jobName).toBe(
        "Newer version",
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    expect(onPersist).toHaveBeenCalledTimes(1);

    releaseFirst();
    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(2));
    expect(attemptedNames).toEqual(["First version", "Newer version"]);
    await waitFor(() =>
      expect(window.localStorage.getItem("sweepsign:draft:v1:race")).toBeNull(),
    );
  });

  it("discloses the photo storage and sharing boundary", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Job nickname/i), {
      target: { value: "Disclosure test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Mark all complete/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add proof/i }));

    expect(
      screen.getByText(
        /Saved photos are stored with this job and included in its customer handoff/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/stay in this browser draft/i)).toBeNull();
  });

  it("builds a customer handoff and validates the next-action link", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/Job nickname/i), {
      target: { value: "Rivera home" },
    });
    expect(screen.getByText("Rivera home")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mark all complete/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add proof/i }));
    fireEvent.change(screen.getByLabelText(/Notes or exceptions/i), {
      target: { value: "Fridge skipped at the client’s request." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Choose next step/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "full http:// or https:// link",
    );
    fireEvent.change(screen.getByLabelText(/Leave a review link/i), {
      target: { value: "https://example.com/review" },
    });
    expect(
      screen.getByRole("link", { name: /Leave a review/i }),
    ).toHaveAttribute("href", "https://example.com/review");
    expect(
      screen.getByText("Fridge skipped at the client’s request."),
    ).toBeInTheDocument();
  });
});

describe("SweepSign Pro preview", () => {
  it("removes only the SweepSign attribution when the entitlement is active", () => {
    const draft = createDefaultDraft();
    const preview = render(
      <HandoffPreview
        draft={draft}
        groupedScope={{ Kitchen: draft.scope }}
        isPro
      />,
    );
    expect(preview.container.querySelector(".free-mark")).toBeNull();
    expect(preview.container).toHaveTextContent("Handoff complete.");
  });
});
