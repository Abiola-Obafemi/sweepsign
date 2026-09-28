import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  CreditCard,
  Copy,
  Link2,
} from "lucide-react";
import { HandoffEditor, HandoffPreview } from "./App";
import { api, type JobRecord, type Profile, type TemplateRecord } from "./api";
import { authClient } from "./auth-client";
import { createDefaultDraft } from "./draft";
import type { HandoffDraft } from "./types";
import { EntitlementProvider, useEntitlement } from "./EntitlementContext";

const BillingPage = lazy(() => import("./BillingPage"));

const Loading = () => (
  <div className="route-loading" role="status">
    Loading SweepSign…
  </div>
);

function PublicHeader() {
  return (
    <header className="public-header">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Link className="wordmark" to="/" aria-label="SweepSign home">
        <img src="/brand/sweepsign-mark.svg" alt="" width="28" height="28" />
        <span>SweepSign</span>
      </Link>
      <nav>
        <Link to="/login">Sign in</Link>
      </nav>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="site-footer">
      <p>© 2026 SweepSign</p>
      <nav aria-label="Support and legal">
        <a href="/support">Support</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
    </footer>
  );
}

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = isSignup
        ? await authClient.signUp.email({
            email,
            password,
            name: email.split("@")[0] || "SweepSign user",
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(
          isSignup
            ? "We could not create that account. Check the details or sign in if you already have one."
            : "That email and password did not match. Check both and try again.",
        );
        return;
      }
      window.location.assign("/app");
    } catch {
      setError(
        "SweepSign could not reach the account service. Try again shortly.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PublicHeader />
      <main className="auth-page" id="main-content">
        <form className="auth-card" onSubmit={(event) => void submit(event)}>
          <p className="context-line">
            {isSignup ? "Start with one real job." : "Welcome back."}
          </p>
          <h1>
            {isSignup
              ? "Create your SweepSign account"
              : "Sign in to SweepSign"}
          </h1>
          <p>
            {isSignup
              ? "No business details needed yet."
              : "Continue where you left off."}
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
          {isSignup ? (
            <>
              <p className="auth-legal">
                By creating an account, you agree to the{" "}
                <a href="/terms">Terms</a> and acknowledge the{" "}
                <a href="/privacy">Privacy Policy</a>.
              </p>
              <p>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <p>
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
              <p>
                New here? <Link to="/signup">Create an account</Link>
              </p>
            </>
          )}
        </form>
      </main>
      <PublicFooter />
    </>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // The response stays deliberately generic so a request cannot reveal
      // whether an account or mail provider exists.
    } finally {
      setBusy(false);
      setSubmitted(true);
    }
  };
  return (
    <>
      <PublicHeader />
      <main className="auth-page" id="main-content">
        <form className="auth-card" onSubmit={(event) => void submit(event)}>
          <p className="context-line">Password reset</p>
          <h1>Reset your password</h1>
          <p>
            Enter the email you use for SweepSign. If recovery is available for
            that address, we’ll send a link.
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {submitted && (
            <p className="inline-success" role="status">
              If recovery is available for that address, you’ll receive the next
              step by email.
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? "Requesting link…" : "Send reset link"}
          </button>
          <Link className="text-link" to="/login">
            Back to sign in
          </Link>
        </form>
      </main>
      <PublicFooter />
    </>
  );
}

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(
          "This reset link is invalid, expired, or has already been used. Request a new one.",
        );
        return;
      }
      navigate("/login", { replace: true });
    } catch {
      setError("SweepSign could not save the new password. Try again shortly.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PublicHeader />
      <main className="auth-page" id="main-content">
        <form className="auth-card" onSubmit={(event) => void submit(event)}>
          <p className="context-line">Choose a new password</p>
          <h1>Set a new password</h1>
          <p>Use at least eight characters. This link can only be used once.</p>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? "Saving password…" : "Save new password"}
          </button>
          <Link to="/forgot-password">Request another link</Link>
        </form>
      </main>
      <PublicFooter />
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  return data?.user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell() {
  const { data: session } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  useEffect(() => {
    void api
      .profile()
      .then(setProfile)
      .catch(() => setProfileError(true))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loading />;
  if (profileError)
    return (
      <main className="route-error">
        <h1>Your workspace could not load.</h1>
        <p>Check the local API and reload this page.</p>
      </main>
    );
  if (!profile?.onboarded) return <Navigate to="/onboarding" replace />;
  const signOut = async () => {
    await authClient.signOut();
    window.location.assign("/");
  };
  return (
    <EntitlementProvider userId={session?.user?.id ?? ""}>
      <div className="app-frame">
        <header className="app-header">
          <a className="skip-link" href="#app-content">
            Skip to main content
          </a>
          <Link className="wordmark" to="/app/jobs" aria-label="SweepSign jobs">
            <img
              src="/brand/sweepsign-mark.svg"
              alt=""
              width="28"
              height="28"
            />
            <span>SweepSign</span>
          </Link>
          <span className="business-label">
            {profile.businessName || "Your cleaning business"}
          </span>
          <button
            className="quiet-button"
            type="button"
            onClick={() => void signOut()}
          >
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </header>
        <div className="app-body">
          <nav className="app-nav" aria-label="Application">
            <NavLink to="/app/jobs">
              <ClipboardCheck size={18} aria-hidden="true" />
              Jobs
            </NavLink>
            <NavLink to="/app/templates">
              <FileText size={18} aria-hidden="true" />
              Templates
            </NavLink>
            <NavLink to="/app/settings">
              <SettingsIcon size={18} aria-hidden="true" />
              Settings
            </NavLink>
            <NavLink to="/app/billing">
              <CreditCard size={18} aria-hidden="true" />
              Billing
            </NavLink>
          </nav>
          <main className="app-main" id="app-content" tabIndex={-1}>
            <Routes>
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/new" element={<JobEditorPage />} />
              <Route path="jobs/:id" element={<JobEditorPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route
                path="billing"
                element={
                  <Suspense fallback={<Loading />}>
                    <BillingPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <SettingsPage profile={profile} onChange={setProfile} />
                }
              />
              <Route path="*" element={<Navigate to="jobs" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </EntitlementProvider>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [cleanerName, setCleanerName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    setError("");
    setBusy(true);
    try {
      await api.saveProfile({ businessName, cleanerName, onboarded: true });
      await api.createTemplate("Standard clean", createDefaultDraft().scope);
      navigate("/app/jobs/new");
    } catch {
      setError("Setup could not be saved. Check the connection and try again.");
      setBusy(false);
    }
  };
  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <p className="context-line">Step {step} of 2</p>
        {step === 1 ? (
          <>
            <h1>What should clients call your business?</h1>
            <p>This appears in your private workspace, not on the handoff.</p>
            <label className="field">
              <span>Business name</span>
              <input
                name="business-name"
                autoComplete="organization"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                maxLength={80}
                placeholder="Bright Day Cleaning"
              />
            </label>
            <button
              className="primary-button"
              type="button"
              disabled={!businessName.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <h1>Who usually completes the clean?</h1>
            <p>Optional. You can change this later.</p>
            <label className="field">
              <span>Cleaner name</span>
              <input
                name="cleaner-name"
                autoComplete="name"
                value={cleanerName}
                onChange={(event) => setCleanerName(event.target.value)}
                maxLength={50}
                placeholder="Sarah"
              />
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void finish()}
            >
              {busy ? "Setting up…" : "Create first job"}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void api
      .jobs()
      .then(setJobs)
      .catch(() => setError(true));
  }, []);
  return (
    <section className="jobs-page">
      <header className="page-heading">
        <div>
          <p className="context-line">Jobs</p>
          <h1>Customer handoffs</h1>
          <p>Keep a clear record of what happened before you leave.</p>
        </div>
        <Link className="primary-button" to="/app/jobs/new">
          <Plus size={18} aria-hidden="true" />
          New job
        </Link>
      </header>
      {error ? (
        <section className="empty-state" role="alert">
          <h2>Jobs could not load.</h2>
          <p>Check the connection, then reload this page.</p>
        </section>
      ) : jobs === null ? (
        <Loading />
      ) : jobs.length === 0 ? (
        <section className="empty-state">
          <CheckCircle2 size={30} />
          <h2>Your first handoff starts here.</h2>
          <p>
            Mark the scope, add proof if it helps, then send one clear next
            step.
          </p>
          <Link className="primary-button" to="/app/jobs/new">
            Create first job
          </Link>
        </section>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <Link className="job-card" key={job.id} to={`/app/jobs/${job.id}`}>
              <div>
                <strong>{job.title}</strong>
                <span>{job.draft.serviceDate}</span>
              </div>
              <span>Open</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function JobEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [startedAsNewJob] = useState(() => !id);
  const [record, setRecord] = useState<JobRecord | null | undefined>(
    id ? undefined : null,
  );
  const [persistError, setPersistError] = useState("");
  const createdJobIdRef = useRef<string | undefined>(undefined);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [appliedScope, setAppliedScope] = useState<
    HandoffDraft["scope"] | null
  >(null);
  const { pro } = useEntitlement();
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    if (id)
      void api
        .job(id)
        .then(setRecord)
        .catch(() => setRecord(null));
  }, [id]);
  useEffect(() => {
    void api
      .templates()
      .then(setTemplates)
      .catch(() => undefined);
  }, []);
  const persist = useCallback(
    async (draft: HandoffDraft) => {
      try {
        const targetId = id ?? createdJobIdRef.current;
        const saved = await api.saveJob(targetId, draft, requestKey.current);
        setPersistError("");
        if (!targetId) {
          createdJobIdRef.current = saved.id;
          // Keep the editor mounted while the URL changes. Without seeding the
          // newly-created record here, the routed page briefly interpreted its
          // existing `null` state as a missing job and discarded transient UI
          // feedback (including the copy confirmation).
          setRecord(saved);
          navigate(`/app/jobs/${saved.id}`, { replace: true });
        }
      } catch {
        setPersistError(
          "This job is saved only in this browser right now. Check your connection and try again.",
        );
        throw new Error("Job persistence failed");
      }
    },
    [id, navigate],
  );
  if (id && record === undefined) return <Loading />;
  if (id && record === null)
    return (
      <section className="empty-state">
        <h1>That job is not available.</h1>
        <Link className="primary-button" to="/app/jobs">
          Back to jobs
        </Link>
      </section>
    );
  return (
    <>
      <div className="editor-route-heading">
        <Link to="/app/jobs">Jobs</Link>
        <span>/</span>
        <strong>{record?.title ?? "New handoff"}</strong>
      </div>
      {persistError && (
        <p className="save-warning" role="alert">
          {persistError}
        </p>
      )}
      {startedAsNewJob && templates.length > 0 && (
        <TemplateApply
          templates={templates}
          onApply={(scope) => {
            if (
              window.confirm(
                "Replace this new handoff's current scope with this template?",
              )
            ) {
              setAppliedScope(scope);
            }
          }}
        />
      )}
      <HandoffEditor
        initialDraft={record?.draft ?? createDefaultDraft()}
        onPersist={persist}
        appliedScope={appliedScope}
        recoveryKey={id ?? "new"}
        isPro={pro}
      />
      {id && (
        <PublicShareControls
          jobId={id}
          initiallyShared={Boolean(record?.hasPublicHandoff)}
        />
      )}
    </>
  );
}

function TemplateApply({
  templates,
  onApply,
}: {
  templates: TemplateRecord[];
  onApply: (scope: HandoffDraft["scope"]) => void;
}) {
  return (
    <section className="template-apply" aria-label="Apply a template">
      <label className="field">
        <span>Start from a saved scope</span>
        <select
          name="scope-template"
          defaultValue=""
          onChange={(event) => {
            const selected = templates.find(
              (item) => item.id === event.target.value,
            );
            if (selected) onApply(selected.scope);
          }}
        >
          <option value="">Choose a template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function PublicShareControls({
  jobId,
  initiallyShared,
}: {
  jobId: string;
  initiallyShared: boolean;
}) {
  const [url, setUrl] = useState("");
  const [shareOverride, setShareOverride] = useState<boolean | null>(null);
  const shared = shareOverride ?? initiallyShared;
  const [status, setStatus] = useState("");
  const generate = async () => {
    try {
      const handoff = await api.createPublicHandoff(jobId);
      const absolute = new URL(handoff.url, window.location.origin).toString();
      setUrl(absolute);
      setShareOverride(true);
      setStatus("A customer-ready read-only link is ready.");
    } catch {
      setStatus("The public link could not be created.");
    }
  };
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setStatus("Public link copied.");
  };
  const revoke = async () => {
    try {
      await api.revokePublicHandoff(jobId);
      setUrl("");
      setShareOverride(false);
      setStatus("Public link revoked.");
    } catch {
      setStatus("The public link could not be revoked.");
    }
  };
  return (
    <section className="public-share">
      <div>
        <p className="context-line">Customer link</p>
        <h2>Share a read-only handoff</h2>
        <p>
          It shows this handoff only. Regenerating replaces any earlier link.
        </p>
      </div>
      <div className="public-share-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => void generate()}
        >
          <Link2 size={18} aria-hidden="true" />
          {url
            ? "Regenerate link"
            : shared
              ? "Replace active link"
              : "Generate link"}
        </button>
        {shared && (
          <>
            {url && (
              <button
                className="quiet-button"
                type="button"
                onClick={() => void copy()}
              >
                <Copy size={17} aria-hidden="true" />
                Copy link
              </button>
            )}
            <button
              className="quiet-button danger-button"
              type="button"
              onClick={() => void revoke()}
            >
              Revoke link
            </button>
          </>
        )}
      </div>
      {status && <p role="status">{status}</p>}
    </section>
  );
}

function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  useEffect(() => {
    void api
      .templates()
      .then(setTemplates)
      .catch(() => setLoadError(true));
  }, []);
  const create = async () => {
    if (!name.trim()) {
      setError("Name the template before saving it.");
      return;
    }
    try {
      const created = await api.createTemplate(
        name.trim(),
        createDefaultDraft().scope,
      );
      setTemplates((current) => [created, ...(current ?? [])]);
      setName("");
      setError("");
    } catch {
      setError("The template could not be saved. Try again.");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this template? Existing jobs will not change."))
      return;
    try {
      await api.deleteTemplate(id);
      setTemplates((current) =>
        (current ?? []).filter((template) => template.id !== id),
      );
    } catch {
      setError("The template could not be deleted. Try again.");
    }
  };
  const saveEdit = async () => {
    if (!editing) return;
    try {
      const updated = await api.updateTemplate(
        editing.id,
        editing.name,
        editing.scope,
      );
      setTemplates((current) =>
        (current ?? []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );
      setEditing(null);
    } catch {
      setError("The template could not be saved. Try again.");
    }
  };
  return (
    <section className="jobs-page">
      <header className="page-heading">
        <div>
          <p className="context-line">Templates</p>
          <h1>Repeatable scopes</h1>
          <p>Template editing is deliberately small in this first release.</p>
        </div>
      </header>
      <div className="template-create">
        <label className="field">
          <span>New template name</span>
          <input
            name="template-name"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="Deep clean"
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void create()}
        >
          Create from standard scope
        </button>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {loadError ? (
        <section className="empty-state" role="alert">
          <h2>Templates could not load.</h2>
          <p>Check the connection, then reload this page.</p>
        </section>
      ) : templates === null ? (
        <Loading />
      ) : templates.length ? (
        <div className="job-list">
          {templates.map((template) => (
            <article className="job-card" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.scope.length} scope items</span>
              </div>
              <button
                className="quiet-button"
                type="button"
                onClick={() => setEditing(template)}
              >
                Edit
              </button>
              <button
                className="quiet-button"
                type="button"
                onClick={() => void remove(template.id)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <FileText size={30} aria-hidden="true" />
          <h2>No saved templates yet.</h2>
          <p>
            Use the default scope in a new job. Template creation is the next
            planned workflow.
          </p>
        </section>
      )}
      {editing && (
        <TemplateEditor
          template={editing}
          onChange={setEditing}
          onSave={() => void saveEdit()}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function TemplateEditor({
  template,
  onChange,
  onSave,
  onCancel,
}: {
  template: TemplateRecord;
  onChange: (template: TemplateRecord) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="template-editor" aria-label="Edit template">
      <h2>Edit {template.name}</h2>
      <label className="field">
        <span>Template name</span>
        <input
          name="template-edit-name"
          autoComplete="off"
          value={template.name}
          onChange={(event) =>
            onChange({ ...template, name: event.target.value })
          }
        />
      </label>
      <div className="template-scope">
        {template.scope.map((item, index) => (
          <div className="field-grid" key={item.id}>
            <label className="field">
              <span>Room</span>
              <input
                name={`template-room-${index}`}
                autoComplete="off"
                value={item.room}
                onChange={(event) => {
                  const scope = [...template.scope];
                  scope[index] = { ...item, room: event.target.value };
                  onChange({ ...template, scope });
                }}
              />
            </label>
            <label className="field">
              <span>Task</span>
              <input
                name={`template-task-${index}`}
                autoComplete="off"
                value={item.label}
                onChange={(event) => {
                  const scope = [...template.scope];
                  scope[index] = { ...item, label: event.target.value };
                  onChange({ ...template, scope });
                }}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="public-share-actions">
        <button className="primary-button" type="button" onClick={onSave}>
          Save template
        </button>
        <button className="quiet-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function PublicHandoff() {
  const { token = "" } = useParams();
  const [record, setRecord] = useState<
    Pick<JobRecord, "title" | "draft"> | null | undefined
  >(undefined);
  useEffect(() => {
    void api
      .publicHandoff(token)
      .then(setRecord)
      .catch(() => setRecord(null));
  }, [token]);
  if (record === undefined) return <Loading />;
  if (!record)
    return (
      <main className="public-handoff">
        <section className="empty-state">
          <h1>This handoff is not available.</h1>
          <p>Ask your cleaning professional for a current link.</p>
        </section>
      </main>
    );
  const groups = record.draft.scope.reduce<
    Record<string, HandoffDraft["scope"]>
  >(
    (all, item) => ({ ...all, [item.room]: [...(all[item.room] ?? []), item] }),
    {},
  );
  return (
    <main className="public-handoff">
      <header className="public-header">
        <Link className="wordmark" to="/" aria-label="SweepSign home">
          <img src="/brand/sweepsign-mark.svg" alt="" width="28" height="28" />
          <span>SweepSign</span>
        </Link>
        <span>Customer handoff</span>
      </header>
      <HandoffPreview draft={record.draft} groupedScope={groups} />
    </main>
  );
}

function SettingsPage({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [cleanerName, setCleanerName] = useState(profile.cleanerName);
  const [status, setStatus] = useState("");
  const save = async () => {
    setStatus("");
    try {
      const next = await api.saveProfile({
        businessName,
        cleanerName,
        onboarded: true,
      });
      onChange(next);
      setStatus("Settings saved.");
    } catch {
      setStatus(
        "Settings could not be saved. Check the connection and try again.",
      );
    }
  };
  return (
    <section className="settings-page">
      <header className="page-heading">
        <div>
          <p className="context-line">Settings</p>
          <h1>Your workspace</h1>
          <p>Keep the private details that make handoffs easier to prepare.</p>
        </div>
      </header>
      <div className="settings-card">
        <label className="field">
          <span>Business name</span>
          <input
            name="business-name"
            autoComplete="organization"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            maxLength={80}
          />
        </label>
        <label className="field">
          <span>Cleaner name</span>
          <input
            name="cleaner-name"
            autoComplete="name"
            value={cleanerName}
            onChange={(event) => setCleanerName(event.target.value)}
            maxLength={50}
          />
        </label>
        <button
          className="primary-button"
          type="button"
          onClick={() => void save()}
        >
          Save settings
        </button>
        {status && (
          <p role="status" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}

export function ProductApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/signup" element={<AuthForm mode="signup" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/handoff/:token" element={<PublicHandoff />} />
        <Route
          path="/onboarding"
          element={
            <Protected>
              <Onboarding />
            </Protected>
          }
        />
        <Route
          path="/app/*"
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
