import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  ImagePlus,
  Minus,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  actionLabel,
  buildSummary,
  clearDraftIfUnchanged,
  createDefaultDraft,
  isValidActionUrl,
  loadDraft,
  saveDraft,
} from "./draft";
import type {
  DraftPhoto,
  HandoffDraft,
  NextAction,
  ScopeItem,
  Step,
  TaskStatus,
} from "./types";

const stepContent: Record<Step, { label: string; detail: string }> = {
  1: { label: "Scope", detail: "Mark what was done." },
  2: { label: "Proof", detail: "Add only what the client should see." },
  3: { label: "Next step", detail: "Finish with one clear action." },
};

const statusOptions: Array<{
  value: TaskStatus;
  label: string;
  icon: typeof Check;
}> = [
  { value: "complete", label: "Complete", icon: Check },
  { value: "not_done", label: "Not done", icon: Minus },
  { value: "not_needed", label: "Not needed", icon: X },
];

const actionOptions: Array<{ value: NextAction; label: string; hint: string }> =
  [
    { value: "review", label: "Review", hint: "Ask for a public review." },
    {
      value: "pay",
      label: "Payment",
      hint: "Open your existing payment link.",
    },
    {
      value: "rebook",
      label: "Rebook",
      hint: "Offer the next available clean.",
    },
  ];

const groupScope = (scope: ScopeItem[]) =>
  scope.reduce<Record<string, ScopeItem[]>>((groups, item) => {
    groups[item.room] = [...(groups[item.room] ?? []), item];
    return groups;
  }, {});

const formatDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

export interface HandoffEditorProps {
  initialDraft?: HandoffDraft;
  onPersist?: (draft: HandoffDraft) => void | Promise<void>;
  appliedScope?: HandoffDraft["scope"] | null;
  recoveryKey?: string;
  isPro?: boolean;
}

export function HandoffEditor({
  initialDraft: suppliedDraft,
  onPersist,
  appliedScope,
  recoveryKey,
  isPro = false,
}: HandoffEditorProps) {
  const [initialState] = useState(() => {
    try {
      const storage = window.localStorage;
      const fallback = suppliedDraft ?? createDefaultDraft();
      return {
        draft: recoveryKey
          ? loadDraft(storage, recoveryKey, fallback)
          : fallback,
        storage,
      };
    } catch {
      return { draft: createDefaultDraft(), storage: null };
    }
  });
  const [draft, setDraft] = useState<HandoffDraft>(initialState.draft);
  const [step, setStep] = useState<Step>(1);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    initialState.storage ? "saved" : "error",
  );
  const [formError, setFormError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobNameRef = useRef<HTMLInputElement>(null);
  const actionUrlRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  const groupedScope = useMemo(() => groupScope(draft.scope), [draft.scope]);

  useEffect(() => {
    if (!appliedScope) return;
    setSaveState("saving");
    setDraft((current) => ({ ...current, scope: appliedScope }));
  }, [appliedScope]);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    try {
      if (!initialState.storage) throw new Error("storage unavailable");
      saveDraft(initialState.storage, draft, recoveryKey);
      saveTimerRef.current = window.setTimeout(() => {
        const persist = () => Promise.resolve(onPersist?.(draft));
        const request = persistQueueRef.current.then(persist, persist);
        persistQueueRef.current = request.catch(() => undefined);
        request
          .then(() => {
            clearDraftIfUnchanged(initialState.storage!, draft, recoveryKey);
            setSaveState("saved");
          })
          .catch(() => setSaveState("error"));
      }, 250);
    } catch {
      setSaveState("error");
    }
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [draft, initialState.storage, onPersist, recoveryKey]);

  const updateDraft = <Key extends keyof HandoffDraft>(
    key: Key,
    value: HandoffDraft[Key],
  ) => {
    setSaveState("saving");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateScope = (id: string, status: TaskStatus) => {
    updateDraft(
      "scope",
      draft.scope.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const validateReady = (requireAction = true) => {
    setFormError("");
    setShareStatus("");
    if (!draft.jobName.trim()) {
      setFormError("Add a job nickname before previewing the handoff.");
      setStep(1);
      window.setTimeout(() => jobNameRef.current?.focus(), 0);
      return false;
    }
    if (draft.scope.some((item) => item.status === "unchecked")) {
      setFormError(
        "Review every scope item before creating the handoff. Use “Mark all complete” only when that is accurate.",
      );
      setStep(1);
      window.setTimeout(
        () =>
          document
            .querySelector<HTMLButtonElement>('[data-unchecked="true"]')
            ?.focus(),
        0,
      );
      return false;
    }
    if (requireAction && !isValidActionUrl(draft.nextActionUrl)) {
      setFormError(
        "Add a full http:// or https:// link for the customer’s next step.",
      );
      setStep(3);
      window.setTimeout(() => actionUrlRef.current?.focus(), 0);
      return false;
    }
    return true;
  };

  const goToStep = (next: Step) => {
    if (next > 1 && !validateReady(false)) return;
    if (next === 3 && !validateReady(true)) return;
    setFormError("");
    setShareStatus("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addPhotos = async (files: FileList | null) => {
    setPhotoError("");
    if (!files?.length) return;
    const available = 3 - draft.photos.length;
    const selected = Array.from(files).slice(0, available);
    if (files.length > available)
      setPhotoError("A handoff can include up to three photos.");

    const accepted: DraftPhoto[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setPhotoError("Choose image files only.");
        continue;
      }
      if (file.size > 900_000) {
        setPhotoError(
          "Each photo must be 900 KB or smaller so the draft can stay on this device.",
        );
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      }).catch(() => "");
      if (!dataUrl) {
        setPhotoError("One photo could not be read. Try a different file.");
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), name: file.name, dataUrl });
    }
    if (accepted.length)
      updateDraft("photos", [...draft.photos, ...accepted].slice(0, 3));
  };

  const shareHandoff = async () => {
    if (!validateReady(true)) return;
    const text = buildSummary(draft);
    setShareStatus("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: draft.jobName || "Cleaning handoff",
          text,
        });
        setShareStatus("Handoff shared.");
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus(
          "Summary copied. Paste it into the message you already use.",
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareStatus("Sharing did not open. Use “Copy summary” instead.");
    }
  };

  const copySummary = async () => {
    if (!validateReady(true)) return;
    try {
      await navigator.clipboard.writeText(buildSummary(draft));
      flushSync(() =>
        setShareStatus(
          "Summary copied. Paste it into the message you already use.",
        ),
      );
      // Saving after the immediate feedback keeps the copy control responsive
      // while still flushing the final form state before a user leaves.
      void Promise.resolve(onPersist?.(draft)).catch(() =>
        setSaveState("error"),
      );
    } catch {
      setShareStatus(
        "Copying was blocked by this browser. Select and copy the preview text instead.",
      );
    }
  };

  const printHandoff = () => {
    if (!validateReady(true)) return;
    window.print();
  };

  const resetDraft = () => {
    if (!window.confirm("Clear this local draft and start again?")) return;
    setSaveState("saving");
    setDraft(createDefaultDraft());
    setStep(1);
    setFormError("");
    setShareStatus("Draft cleared.");
  };

  return (
    <div className="app-shell">
      <header className="product-header">
        <a
          className="wordmark"
          href="#workspace"
          aria-label="SweepSign workspace"
        >
          SweepSign
        </a>
        <div className="save-indicator" role="status" aria-live="polite">
          <span
            className={`save-dot save-dot--${saveState}`}
            aria-hidden="true"
          />
          {saveState === "saved" && "Saved on this device"}
          {saveState === "saving" && "Saving…"}
          {saveState === "error" && "Draft could not be saved"}
        </div>
        <button className="quiet-button" type="button" onClick={resetDraft}>
          <RotateCcw size={17} aria-hidden="true" />
          Start over
        </button>
      </header>

      <main id="workspace" className="workspace">
        <section className="editor" aria-labelledby="editor-title">
          <div className="editor-intro">
            <p className="context-line">One clear handoff, before you leave.</p>
            <h1 id="editor-title">Finish the clean.</h1>
            <p>
              Mark the work, add only useful proof, and give the client one next
              step.
            </p>
          </div>

          <nav className="finish-line" aria-label="Handoff steps">
            {([1, 2, 3] as const).map((number) => {
              const item = stepContent[number];
              const isActive = step === number;
              const isComplete = step > number;
              return (
                <button
                  key={number}
                  className={`step-button${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
                  type="button"
                  onClick={() => goToStep(number)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="step-number" aria-hidden="true">
                    {isComplete ? <Check size={15} /> : number}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          {formError && (
            <div className="error-banner" role="alert">
              <span>{formError}</span>
              <button
                type="button"
                onClick={() => setFormError("")}
                aria-label="Dismiss error"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {saveState === "error" && (
            <div className="save-warning" role="alert">
              <strong>This draft is not saving.</strong>
              <span>
                Keep this tab open, then copy or share the handoff before
                leaving.
              </span>
            </div>
          )}

          <div className="step-panel" key={step}>
            {step === 1 && (
              <ScopeStep
                draft={draft}
                groupedScope={groupedScope}
                updateDraft={updateDraft}
                updateScope={updateScope}
                jobNameRef={jobNameRef}
              />
            )}
            {step === 2 && (
              <ProofStep
                draft={draft}
                photoError={photoError}
                fileInputRef={fileInputRef}
                updateDraft={updateDraft}
                addPhotos={addPhotos}
              />
            )}
            {step === 3 && (
              <NextStep
                draft={draft}
                updateDraft={updateDraft}
                actionUrlRef={actionUrlRef}
              />
            )}
          </div>

          <div className="editor-actions">
            {step > 1 && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => goToStep((step - 1) as Step)}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => goToStep((step + 1) as Step)}
              >
                {step === 1 ? "Add proof" : "Choose next step"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="primary-button"
                type="button"
                onClick={shareHandoff}
              >
                <Share2 size={18} aria-hidden="true" />
                Share handoff
              </button>
            )}
          </div>
        </section>

        <aside
          className={`preview-pane${step === 3 ? " preview-pane--active" : ""}`}
          aria-label="Live handoff preview"
        >
          <div className="preview-toolbar">
            <div>
              <span className="preview-label">Live customer view</span>
              <small>Only share what you have checked.</small>
            </div>
            <div className="toolbar-actions">
              <button
                type="button"
                onClick={copySummary}
                title="Copy text summary"
              >
                <Clipboard size={17} aria-hidden="true" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={printHandoff}
                title="Print handoff"
              >
                <Printer size={17} aria-hidden="true" />
                <span>Print</span>
              </button>
            </div>
          </div>
          <HandoffPreview
            draft={draft}
            groupedScope={groupedScope}
            isPro={isPro}
          />
          {shareStatus && (
            <p className="share-status" role="status">
              {shareStatus}
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}

interface StepProps {
  draft: HandoffDraft;
  updateDraft: <Key extends keyof HandoffDraft>(
    key: Key,
    value: HandoffDraft[Key],
  ) => void;
}

function ScopeStep({
  draft,
  groupedScope,
  updateDraft,
  updateScope,
  jobNameRef,
}: StepProps & {
  groupedScope: Record<string, ScopeItem[]>;
  updateScope: (id: string, status: TaskStatus) => void;
  jobNameRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="step-stack">
      <div className="field-grid">
        <label className="field">
          <span>Job nickname</span>
          <small>Use a name you recognize. An address is not required.</small>
          <input
            ref={jobNameRef}
            name="job-name"
            value={draft.jobName}
            onChange={(event) => updateDraft("jobName", event.target.value)}
            placeholder="Rivera home"
            autoComplete="off"
            maxLength={60}
          />
        </label>
        <label className="field">
          <span>Service date</span>
          <small>Shown on the customer handoff.</small>
          <span className="input-with-icon">
            <CalendarDays size={18} aria-hidden="true" />
            <input
              type="date"
              name="service-date"
              value={draft.serviceDate}
              onChange={(event) =>
                updateDraft("serviceDate", event.target.value)
              }
            />
          </span>
        </label>
      </div>

      <div className="scope-heading">
        <div>
          <h2>What happened today?</h2>
          <p>
            Mark exceptions honestly. “Not needed” stays out of the customer
            summary.
          </p>
        </div>
        <div className="scope-progress">
          <span className="scope-count">
            {draft.scope.filter((item) => item.status !== "unchecked").length}/
            {draft.scope.length} reviewed
          </span>
          {draft.scope.some((item) => item.status === "unchecked") && (
            <button
              className="mark-all-button"
              type="button"
              onClick={() =>
                updateDraft(
                  "scope",
                  draft.scope.map((item) => ({ ...item, status: "complete" })),
                )
              }
            >
              <Check size={16} aria-hidden="true" />
              Mark all complete
            </button>
          )}
        </div>
      </div>

      <div className="room-list">
        {Object.entries(groupedScope).map(([room, items]) => (
          <section
            className="room-group"
            key={room}
            aria-labelledby={`room-${room}`}
          >
            <h3 id={`room-${room}`}>{room}</h3>
            {items.map((item) => (
              <div className="scope-row" key={item.id}>
                <span>{item.label}</span>
                <div
                  className="status-switch"
                  role="group"
                  aria-label={`${item.label} status`}
                >
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          item.status === option.value ? "is-selected" : ""
                        }
                        onClick={() => updateScope(item.id, option.value)}
                        aria-pressed={item.status === option.value}
                        data-unchecked={
                          item.status === "unchecked" ? "true" : undefined
                        }
                        title={option.label}
                      >
                        <Icon size={16} aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function ProofStep({
  draft,
  photoError,
  fileInputRef,
  updateDraft,
  addPhotos,
}: StepProps & {
  photoError: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  addPhotos: (files: FileList | null) => Promise<void>;
}) {
  return (
    <div className="step-stack">
      <label className="field">
        <span>
          Notes or exceptions <em>optional</em>
        </span>
        <small>
          Say what the client needs to know. Keep private team notes elsewhere.
        </small>
        <textarea
          name="client-note"
          autoComplete="off"
          value={draft.exception}
          onChange={(event) => updateDraft("exception", event.target.value)}
          placeholder="Example: Fridge exterior skipped at the client’s request."
          maxLength={300}
          rows={5}
        />
        <small className="character-count">{draft.exception.length}/300</small>
      </label>

      <div className="photo-field">
        <div>
          <h2>
            Photos <span>optional</span>
          </h2>
          <p>
            Add up to three client-approved images. Saved photos are stored with
            this job and included in its customer handoff.
          </p>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          name="proof-photos"
          accept="image/*"
          multiple
          onChange={(event) => void addPhotos(event.target.files)}
        />
        {draft.photos.length === 0 ? (
          <button
            className="photo-empty"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={24} aria-hidden="true" />
            <span>
              <strong>Add useful proof</strong>
              <small>Choose clear finished-work photos.</small>
            </span>
          </button>
        ) : (
          <div className="photo-grid">
            {draft.photos.map((photo) => (
              <figure key={photo.id}>
                <img src={photo.dataUrl} alt="" width="640" height="480" />
                <button
                  type="button"
                  onClick={() =>
                    updateDraft(
                      "photos",
                      draft.photos.filter((item) => item.id !== photo.id),
                    )
                  }
                  aria-label={`Remove ${photo.name}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </figure>
            ))}
            {draft.photos.length < 3 && (
              <button
                className="photo-add"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={20} aria-hidden="true" />
                Add another
              </button>
            )}
          </div>
        )}
        {photoError && (
          <p className="inline-error" role="alert">
            {photoError}
          </p>
        )}
      </div>

      <label className="field">
        <span>
          Completed by <em>optional</em>
        </span>
        <small>Use the name the client already knows.</small>
        <input
          name="cleaner-name"
          autoComplete="off"
          value={draft.cleanerName}
          onChange={(event) => updateDraft("cleanerName", event.target.value)}
          placeholder="Sarah"
          maxLength={50}
        />
      </label>
    </div>
  );
}

function NextStep({
  draft,
  updateDraft,
  actionUrlRef,
}: StepProps & { actionUrlRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="step-stack">
      <div className="action-intro">
        <Sparkles size={22} aria-hidden="true" />
        <div>
          <h2>What should the client do next?</h2>
          <p>One action is clearer than a row of competing buttons.</p>
        </div>
      </div>
      <div
        className="action-options"
        role="radiogroup"
        aria-label="Customer next action"
      >
        {actionOptions.map((option) => (
          <label
            className={draft.nextAction === option.value ? "is-selected" : ""}
            key={option.value}
          >
            <input
              type="radio"
              name="next-action"
              value={option.value}
              checked={draft.nextAction === option.value}
              onChange={() => updateDraft("nextAction", option.value)}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </span>
            <CheckCircle2 size={20} aria-hidden="true" />
          </label>
        ))}
      </div>
      <label className="field">
        <span>{actionLabel[draft.nextAction]} link</span>
        <small>
          SweepSign opens your existing link. It does not process payments or
          bookings.
        </small>
        <span className="input-with-icon">
          <ExternalLink size={18} aria-hidden="true" />
          <input
            ref={actionUrlRef}
            type="url"
            name="next-action-url"
            autoComplete="off"
            inputMode="url"
            value={draft.nextActionUrl}
            onChange={(event) =>
              updateDraft("nextActionUrl", event.target.value)
            }
            placeholder="https://"
            aria-invalid={
              draft.nextActionUrl.length > 0 &&
              !isValidActionUrl(draft.nextActionUrl)
            }
          />
        </span>
        {draft.nextActionUrl && !isValidActionUrl(draft.nextActionUrl) && (
          <small className="inline-error">
            Use a full link beginning with http:// or https://.
          </small>
        )}
      </label>
    </div>
  );
}

export function HandoffPreview({
  draft,
  groupedScope,
  isPro = false,
}: {
  draft: HandoffDraft;
  groupedScope: Record<string, ScopeItem[]>;
  isPro?: boolean;
}) {
  const completedRooms = Object.entries(groupedScope)
    .map(([room, items]) => ({
      room,
      items: items.filter((item) => item.status === "complete"),
    }))
    .filter(({ items }) => items.length);
  const notDone = draft.scope.filter((item) => item.status === "not_done");
  const actionReady = isValidActionUrl(draft.nextActionUrl);

  return (
    <article className="handoff-sheet">
      <div className="handoff-meta">
        <span>{draft.jobName.trim() || "Your cleaning handoff"}</span>
        <span>{formatDate(draft.serviceDate)}</span>
      </div>
      <div className="handoff-title">
        <p>
          {draft.cleanerName
            ? `Completed by ${draft.cleanerName}`
            : "Prepared for you"}
        </p>
        <h2>
          A cleaner home,
          <br />
          ready for what’s next.
        </h2>
      </div>

      <section className="handoff-section">
        <h3>Completed today</h3>
        {completedRooms.length ? (
          <div className="completed-columns">
            {completedRooms.map(({ room, items }) => (
              <div key={room}>
                <h4>{room}</h4>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <Check size={14} aria-hidden="true" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="preview-empty">
            Completed items will appear here as you mark the scope.
          </p>
        )}
      </section>

      {(notDone.length > 0 || draft.exception) && (
        <section className="handoff-section handoff-note">
          <h3>Good to know</h3>
          {notDone.map((item) => (
            <p key={item.id}>
              <strong>{item.room}:</strong> {item.label} was not completed.
            </p>
          ))}
          {draft.exception && <p>{draft.exception}</p>}
        </section>
      )}

      {draft.photos.length > 0 && (
        <section className="handoff-section">
          <h3>Photos from today</h3>
          <div className="handoff-photos">
            {draft.photos.map((photo, index) => (
              <img
                key={photo.id}
                src={photo.dataUrl}
                alt={`Cleaning result ${index + 1}`}
                width="640"
                height="480"
              />
            ))}
          </div>
        </section>
      )}

      <footer className="handoff-footer">
        <div>
          <strong>Handoff complete.</strong>
          <span>Prepared from the checked scope.</span>
        </div>
        {actionReady ? (
          <a href={draft.nextActionUrl} target="_blank" rel="noreferrer">
            {actionLabel[draft.nextAction]}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        ) : (
          <span className="action-placeholder">
            Your next-step link will appear here.
          </span>
        )}
      </footer>
      {!isPro && <small className="free-mark">Created with SweepSign</small>}
    </article>
  );
}

// Kept as a compatibility export for the focused editor unit tests.
export const App = HandoffEditor;
