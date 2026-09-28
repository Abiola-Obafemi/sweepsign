import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth, database } from "./auth.js";

type Draft = {
  jobName: string;
  cleanerName: string;
  serviceDate: string;
  scope: Array<{
    id: string;
    room: string;
    label: string;
    status: "unchecked" | "complete" | "not_done" | "not_needed";
  }>;
  exception: string;
  photos: Array<{ id: string; name: string; dataUrl: string }>;
  nextAction: "review" | "pay" | "rebook";
  nextActionUrl: string;
  version: 1;
};
const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), payment=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.revenuecat.com https://*.revenuecat.com",
      "frame-src 'self' https://*.stripe.com https://*.revenuecat.com",
    ].join("; "),
  );
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", (req, _res, next) => {
  req.headers["x-sweepsign-client-ip"] =
    req.socket.remoteAddress ?? "unavailable";
  next();
});
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "4mb" }));

database.exec(`
  CREATE TABLE IF NOT EXISTS sweepsign_profile (user_id TEXT PRIMARY KEY, business_name TEXT NOT NULL DEFAULT '', cleaner_name TEXT NOT NULL DEFAULT '', onboarded INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sweepsign_job (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, draft_json TEXT NOT NULL, request_key TEXT, public_token_hash TEXT, public_revoked_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS sweepsign_job_owner ON sweepsign_job(user_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS sweepsign_template (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, scope_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
`);
// Safe upgrades for databases created before the new columns existed.
for (const [table, column] of [
  ["sweepsign_job", "request_key TEXT"],
  ["sweepsign_job", "public_token_hash TEXT"],
  ["sweepsign_job", "public_revoked_at TEXT"],
  ["sweepsign_template", "updated_at TEXT"],
] as const) {
  const columns = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column.split(" ")[0]))
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`);
}
database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS sweepsign_job_request_key ON sweepsign_job(user_id, request_key) WHERE request_key IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS sweepsign_job_public_token ON sweepsign_job(public_token_hash) WHERE public_token_hash IS NOT NULL;
`);

const requireUser = async (
  req: express.Request,
  res: express.Response,
): Promise<string | null> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user?.id) {
    res.status(401).json({ error: "Sign in to continue." });
    return null;
  }
  return session.user.id;
};

const cleanDraft = (value: unknown): Draft | null => {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<Draft>;
  if (
    draft.version !== 1 ||
    typeof draft.jobName !== "string" ||
    !Array.isArray(draft.scope) ||
    !Array.isArray(draft.photos)
  )
    return null;
  const statuses = new Set(["unchecked", "complete", "not_done", "not_needed"]);
  const scope = draft.scope
    .filter((item): item is Draft["scope"][number] => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.room === "string" &&
        typeof candidate.label === "string" &&
        statuses.has(String(candidate.status))
      );
    })
    .slice(0, 40)
    .map((item) => ({
      id: item.id.slice(0, 80),
      room: item.room.slice(0, 60),
      label: item.label.slice(0, 100),
      status: item.status,
    }));
  if (!scope.length) return null;
  const photos = draft.photos
    .filter((photo): photo is Draft["photos"][number] => {
      if (!photo || typeof photo !== "object") return false;
      const candidate = photo as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.dataUrl === "string" &&
        /^data:image\/(?:jpeg|png|webp);base64,/i.test(candidate.dataUrl) &&
        candidate.dataUrl.length <= 1_250_000
      );
    })
    .slice(0, 3)
    .map((photo) => ({
      id: photo.id.slice(0, 80),
      name: photo.name.slice(0, 140),
      dataUrl: photo.dataUrl,
    }));
  const nextAction =
    draft.nextAction === "pay" || draft.nextAction === "rebook"
      ? draft.nextAction
      : "review";
  const nextActionUrl =
    typeof draft.nextActionUrl === "string"
      ? draft.nextActionUrl.slice(0, 500)
      : "";
  if (nextActionUrl) {
    try {
      const url = new URL(nextActionUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    } catch {
      return null;
    }
  }
  return {
    version: 1,
    jobName: draft.jobName.slice(0, 60),
    cleanerName:
      typeof draft.cleanerName === "string"
        ? draft.cleanerName.slice(0, 50)
        : "",
    serviceDate:
      typeof draft.serviceDate === "string"
        ? draft.serviceDate.slice(0, 10)
        : "",
    scope,
    exception:
      typeof draft.exception === "string" ? draft.exception.slice(0, 300) : "",
    photos,
    nextAction,
    nextActionUrl,
  };
};

app.get("/api/profile", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const row = database
    .prepare(
      "SELECT business_name, cleaner_name, onboarded FROM sweepsign_profile WHERE user_id = ?",
    )
    .get(userId) as
    | { business_name: string; cleaner_name: string; onboarded: number }
    | undefined;
  res.json({
    businessName: row?.business_name ?? "",
    cleanerName: row?.cleaner_name ?? "",
    onboarded: Boolean(row?.onboarded),
  });
});
app.put("/api/profile", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const businessName =
    typeof req.body?.businessName === "string"
      ? req.body.businessName.trim().slice(0, 80)
      : "";
  const cleanerName =
    typeof req.body?.cleanerName === "string"
      ? req.body.cleanerName.trim().slice(0, 50)
      : "";
  const onboarded = req.body?.onboarded === true ? 1 : 0;
  const now = new Date().toISOString();
  database
    .prepare(
      "INSERT INTO sweepsign_profile (user_id, business_name, cleaner_name, onboarded, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET business_name = excluded.business_name, cleaner_name = excluded.cleaner_name, onboarded = excluded.onboarded, updated_at = excluded.updated_at",
    )
    .run(userId, businessName, cleanerName, onboarded, now);
  res.json({ businessName, cleanerName, onboarded: Boolean(onboarded) });
});
app.get("/api/jobs", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const rows = database
    .prepare(
      "SELECT id, title, draft_json, updated_at, public_token_hash FROM sweepsign_job WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .all(userId) as Array<{
    id: string;
    title: string;
    draft_json: string;
    updated_at: string;
    public_token_hash: string | null;
  }>;
  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      draft: JSON.parse(row.draft_json),
      updatedAt: row.updated_at,
      hasPublicHandoff: Boolean(row.public_token_hash),
    })),
  );
});
app.get("/api/jobs/:id", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const row = database
    .prepare(
      "SELECT id, title, draft_json, updated_at, public_token_hash FROM sweepsign_job WHERE id = ? AND user_id = ?",
    )
    .get(req.params.id, userId) as
    | {
        id: string;
        title: string;
        draft_json: string;
        updated_at: string;
        public_token_hash: string | null;
      }
    | undefined;
  if (!row) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  res.json({
    id: row.id,
    title: row.title,
    draft: JSON.parse(row.draft_json),
    updatedAt: row.updated_at,
    hasPublicHandoff: Boolean(row.public_token_hash),
  });
});
app.post("/api/jobs", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const draft = cleanDraft(req.body?.draft);
  if (!draft) {
    res.status(400).json({ error: "Invalid job draft." });
    return;
  }
  const requestKey =
    typeof req.get("Idempotency-Key") === "string"
      ? req.get("Idempotency-Key")!.slice(0, 160)
      : "";
  if (!requestKey) {
    res
      .status(400)
      .json({ error: "A request key is required to create a job." });
    return;
  }
  const existing = database
    .prepare(
      "SELECT id, title, draft_json, updated_at FROM sweepsign_job WHERE user_id = ? AND request_key = ?",
    )
    .get(userId, requestKey) as
    | { id: string; title: string; draft_json: string; updated_at: string }
    | undefined;
  if (existing) {
    // Repeated autosave requests reuse the same creation key. Updating this one
    // owner-scoped record is safe and prevents a retry from creating a second job.
    const now = new Date().toISOString();
    const title = draft.jobName || "Untitled handoff";
    database
      .prepare(
        "UPDATE sweepsign_job SET title = ?, draft_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      )
      .run(title, JSON.stringify(draft), now, existing.id, userId);
    res.json({
      id: existing.id,
      title,
      draft,
      updatedAt: now,
      idempotent: true,
    });
    return;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const title = draft.jobName || "Untitled handoff";
  database
    .prepare(
      "INSERT INTO sweepsign_job (id, user_id, title, draft_json, request_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, userId, title, JSON.stringify(draft), requestKey, now, now);
  res.status(201).json({ id, title, draft, updatedAt: now });
});
app.put("/api/jobs/:id", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const draft = cleanDraft(req.body?.draft);
  if (!draft) {
    res.status(400).json({ error: "Invalid job draft." });
    return;
  }
  const now = new Date().toISOString();
  const title = draft.jobName || "Untitled handoff";
  const result = database
    .prepare(
      "UPDATE sweepsign_job SET title = ?, draft_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .run(title, JSON.stringify(draft), now, req.params.id, userId);
  if (!result.changes) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  res.json({ id: req.params.id, title, draft, updatedAt: now });
});
app.get("/api/templates", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const rows = database
    .prepare(
      "SELECT id, name, scope_json FROM sweepsign_template WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(userId) as Array<{ id: string; name: string; scope_json: string }>;
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      scope: JSON.parse(row.scope_json),
    })),
  );
});
app.post("/api/templates", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const name =
    typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : "";
  const cleaned = cleanDraft({
    ...createTemplateDraft,
    scope: req.body?.scope,
  });
  const scope = cleaned?.scope;
  if (!name || !scope?.length) {
    res.status(400).json({ error: "Provide a template name and scope." });
    return;
  }
  const id = randomUUID();
  database
    .prepare(
      "INSERT INTO sweepsign_template (id, user_id, name, scope_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      userId,
      name,
      JSON.stringify(scope),
      new Date().toISOString(),
      new Date().toISOString(),
    );
  res.status(201).json({ id, name, scope });
});
const createTemplateDraft: Omit<Draft, "scope"> = {
  version: 1,
  jobName: "",
  cleanerName: "",
  serviceDate: "",
  exception: "",
  photos: [],
  nextAction: "review",
  nextActionUrl: "",
};
app.put("/api/templates/:id", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const name =
    typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : "";
  const cleaned = cleanDraft({
    ...createTemplateDraft,
    scope: req.body?.scope,
  });
  if (!name || !cleaned?.scope.length)
    return void res
      .status(400)
      .json({ error: "Provide a template name and scope." });
  const result = database
    .prepare(
      "UPDATE sweepsign_template SET name = ?, scope_json = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .run(
      name,
      JSON.stringify(cleaned.scope),
      new Date().toISOString(),
      req.params.id,
      userId,
    );
  if (!result.changes)
    return void res.status(404).json({ error: "Template not found." });
  res.json({ id: req.params.id, name, scope: cleaned.scope });
});
app.delete("/api/templates/:id", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const result = database
    .prepare("DELETE FROM sweepsign_template WHERE id = ? AND user_id = ?")
    .run(req.params.id, userId);
  if (!result.changes) {
    res.status(404).json({ error: "Template not found." });
    return;
  }
  res.json({ deleted: true });
});

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
app.post("/api/jobs/:id/handoff", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const row = database
    .prepare("SELECT id FROM sweepsign_job WHERE id = ? AND user_id = ?")
    .get(req.params.id, userId);
  if (!row) return void res.status(404).json({ error: "Job not found." });
  const token = randomBytes(32).toString("base64url");
  database
    .prepare(
      "UPDATE sweepsign_job SET public_token_hash = ?, public_revoked_at = NULL WHERE id = ? AND user_id = ?",
    )
    .run(tokenHash(token), req.params.id, userId);
  res.json({ token, url: `/handoff/${token}` });
});
app.delete("/api/jobs/:id/handoff", async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  const result = database
    .prepare(
      "UPDATE sweepsign_job SET public_token_hash = NULL, public_revoked_at = ? WHERE id = ? AND user_id = ? AND public_token_hash IS NOT NULL",
    )
    .run(new Date().toISOString(), req.params.id, userId);
  if (!result.changes)
    return void res.status(404).json({ error: "Handoff not found." });
  res.json({ revoked: true });
});
app.get("/api/handoff/:token", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
  const row = database
    .prepare(
      "SELECT title, draft_json FROM sweepsign_job WHERE public_token_hash = ? AND public_revoked_at IS NULL",
    )
    .get(tokenHash(req.params.token)) as
    { title: string; draft_json: string } | undefined;
  if (!row) return void res.status(404).json({ error: "Handoff not found." });
  res.json({ title: row.title, draft: JSON.parse(row.draft_json) });
});

const clientDist = resolve(process.cwd(), "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/*splat", (req, res) => {
    if (req.path.startsWith("/handoff/")) {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Robots-Tag", "noindex, noarchive, nosnippet");
    }
    res.sendFile("index.html", { root: clientDist });
  });
}

const port = Number(process.env.PORT ?? 3001);
const host =
  process.env.HOST ??
  (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
app.listen(port, host, () => console.log(`SweepSign API listening on ${port}`));
