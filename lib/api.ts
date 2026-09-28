import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sql } from "kysely";
import { assertAuthEnvironment, auth } from "./auth";
import { db, ensureSchema, usesPostgres } from "./db";

type Status = "unchecked" | "complete" | "not_done" | "not_needed";
type Draft = {
  version: 1;
  jobName: string;
  cleanerName: string;
  serviceDate: string;
  scope: Array<{ id: string; room: string; label: string; status: Status }>;
  exception: string;
  photos: Array<{ id: string; name: string; dataUrl: string }>;
  nextAction: "review" | "pay" | "rebook";
  nextActionUrl: string;
};
const json = (body: unknown, status = 200, headers?: HeadersInit) => {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("Cache-Control"))
    responseHeaders.set("Cache-Control", "private, no-store");
  return Response.json(body, { status, headers: responseHeaders });
};
const failure = (message: string, status = 400) =>
  json({ error: message }, status);
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function cleanDraft(value: unknown): Draft | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<Draft>;
  if (
    input.version !== 1 ||
    typeof input.jobName !== "string" ||
    !Array.isArray(input.scope) ||
    !Array.isArray(input.photos)
  )
    return null;
  const statuses = new Set<Status>([
    "unchecked",
    "complete",
    "not_done",
    "not_needed",
  ]);
  const scope = input.scope
    .filter((item): item is Draft["scope"][number] =>
      Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.room === "string" &&
        typeof item.label === "string" &&
        statuses.has(item.status),
      ),
    )
    .slice(0, 40)
    .map((item) => ({
      id: item.id.slice(0, 80),
      room: item.room.slice(0, 60),
      label: item.label.slice(0, 100),
      status: item.status,
    }));
  if (!scope.length) return null;
  const photos = input.photos
    .filter((photo): photo is Draft["photos"][number] =>
      Boolean(
        photo &&
        typeof photo.id === "string" &&
        typeof photo.name === "string" &&
        typeof photo.dataUrl === "string" &&
        /^data:image\/(?:jpeg|png|webp);base64,/i.test(photo.dataUrl) &&
        photo.dataUrl.length <= 1_250_000,
      ),
    )
    .slice(0, 3)
    .map((photo) => ({
      id: photo.id.slice(0, 80),
      name: photo.name.slice(0, 140),
      dataUrl: photo.dataUrl,
    }));
  const url =
    typeof input.nextActionUrl === "string"
      ? input.nextActionUrl.slice(0, 500)
      : "";
  try {
    if (url && !["http:", "https:"].includes(new URL(url).protocol))
      return null;
  } catch {
    return null;
  }
  return {
    version: 1,
    jobName: input.jobName.slice(0, 60),
    cleanerName:
      typeof input.cleanerName === "string"
        ? input.cleanerName.slice(0, 50)
        : "",
    serviceDate:
      typeof input.serviceDate === "string"
        ? input.serviceDate.slice(0, 10)
        : "",
    scope,
    exception:
      typeof input.exception === "string" ? input.exception.slice(0, 300) : "",
    photos,
    nextAction:
      input.nextAction === "pay" || input.nextAction === "rebook"
        ? input.nextAction
        : "review",
    nextActionUrl: url,
  };
}
async function userId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}
async function body(request: Request) {
  return request.json().catch(() => null) as Promise<Record<
    string,
    unknown
  > | null>;
}

export async function handleApi(request: Request, parts: string[]) {
  assertAuthEnvironment();
  await ensureSchema();
  if (parts[0] === "health" && request.method === "GET")
    return json({ ok: true });
  if (parts[0] === "handoff" && parts[1] && request.method === "GET")
    return publicHandoff(parts[1]);
  const id = await userId(request);
  if (!id) return failure("Sign in to continue.", 401);
  if (parts[0] === "profile") return profile(request, id);
  if (parts[0] === "jobs") return jobs(request, id, parts.slice(1));
  if (parts[0] === "templates") return templates(request, id, parts.slice(1));
  return failure("Not found.", 404);
}

async function profile(request: Request, user: string) {
  if (request.method === "GET") {
    const row = (
      await sql<{
        business_name: string;
        cleaner_name: string;
        onboarded: boolean;
      }>`SELECT business_name, cleaner_name, onboarded FROM sweepsign_profile WHERE user_id = ${user}`.execute(
        db,
      )
    ).rows[0];
    return json({
      businessName: row?.business_name ?? "",
      cleanerName: row?.cleaner_name ?? "",
      onboarded: Boolean(row?.onboarded),
    });
  }
  if (request.method !== "PUT") return failure("Method not allowed.", 405);
  const input = await body(request);
  const business =
    typeof input?.businessName === "string"
      ? input.businessName.trim().slice(0, 80)
      : "";
  const cleaner =
    typeof input?.cleanerName === "string"
      ? input.cleanerName.trim().slice(0, 50)
      : "";
  const onboarded = input?.onboarded === true;
  const storedOnboarded = usesPostgres ? onboarded : Number(onboarded);
  const now = new Date().toISOString();
  await sql`INSERT INTO sweepsign_profile (user_id, business_name, cleaner_name, onboarded, updated_at) VALUES (${user}, ${business}, ${cleaner}, ${storedOnboarded}, ${now}) ON CONFLICT(user_id) DO UPDATE SET business_name = EXCLUDED.business_name, cleaner_name = EXCLUDED.cleaner_name, onboarded = EXCLUDED.onboarded, updated_at = EXCLUDED.updated_at`.execute(
    db,
  );
  return json({ businessName: business, cleanerName: cleaner, onboarded });
}

async function jobs(request: Request, user: string, rest: string[]) {
  const jobId = rest[0];
  if (!jobId && request.method === "GET") {
    const rows = await sql<{
      id: string;
      title: string;
      draft_json: string;
      updated_at: string;
      public_token_hash: string | null;
    }>`SELECT id, title, draft_json, updated_at, public_token_hash FROM sweepsign_job WHERE user_id = ${user} ORDER BY updated_at DESC`.execute(
      db,
    );
    return json(
      rows.rows.map((row) => ({
        id: row.id,
        title: row.title,
        draft: JSON.parse(row.draft_json),
        updatedAt: row.updated_at,
        hasPublicHandoff: Boolean(row.public_token_hash),
      })),
    );
  }
  if (!jobId && request.method === "POST") return saveNewJob(request, user);
  if (!jobId) return failure("Not found.", 404);
  if (rest[1] === "handoff") return handoff(request, user, jobId);
  if (request.method === "GET") {
    const row = (
      await sql<{
        id: string;
        title: string;
        draft_json: string;
        updated_at: string;
        public_token_hash: string | null;
      }>`SELECT id, title, draft_json, updated_at, public_token_hash FROM sweepsign_job WHERE id = ${jobId} AND user_id = ${user}`.execute(
        db,
      )
    ).rows[0];
    return row
      ? json({
          id: row.id,
          title: row.title,
          draft: JSON.parse(row.draft_json),
          updatedAt: row.updated_at,
          hasPublicHandoff: Boolean(row.public_token_hash),
        })
      : failure("Job not found.", 404);
  }
  if (request.method !== "PUT") return failure("Method not allowed.", 405);
  const input = await body(request);
  const draft = cleanDraft(input?.draft);
  if (!draft) return failure("Invalid job draft.");
  const title = draft.jobName || "Untitled handoff";
  const now = new Date().toISOString();
  const updated =
    await sql`UPDATE sweepsign_job SET title = ${title}, draft_json = ${JSON.stringify(draft)}, updated_at = ${now} WHERE id = ${jobId} AND user_id = ${user}`.execute(
      db,
    );
  return Number(updated.numAffectedRows)
    ? json({ id: jobId, title, draft, updatedAt: now })
    : failure("Job not found.", 404);
}

async function saveNewJob(request: Request, user: string) {
  const input = await body(request);
  const draft = cleanDraft(input?.draft);
  if (!draft) return failure("Invalid job draft.");
  const key = request.headers.get("Idempotency-Key")?.slice(0, 160);
  if (!key) return failure("A request key is required to create a job.");
  const found = (
    await sql<{
      id: string;
    }>`SELECT id FROM sweepsign_job WHERE user_id = ${user} AND request_key = ${key}`.execute(
      db,
    )
  ).rows[0];
  const id = found?.id ?? randomUUID(),
    now = new Date().toISOString(),
    title = draft.jobName || "Untitled handoff";
  if (found)
    await sql`UPDATE sweepsign_job SET title = ${title}, draft_json = ${JSON.stringify(draft)}, updated_at = ${now} WHERE id = ${id} AND user_id = ${user}`.execute(
      db,
    );
  else
    await sql`INSERT INTO sweepsign_job (id, user_id, title, draft_json, request_key, created_at, updated_at) VALUES (${id}, ${user}, ${title}, ${JSON.stringify(draft)}, ${key}, ${now}, ${now})`.execute(
      db,
    );
  return json(
    {
      id,
      title,
      draft,
      updatedAt: now,
      ...(found ? { idempotent: true } : {}),
    },
    found ? 200 : 201,
  );
}

async function handoff(request: Request, user: string, id: string) {
  if (request.method === "POST") {
    const exists = (
      await sql`SELECT id FROM sweepsign_job WHERE id = ${id} AND user_id = ${user}`.execute(
        db,
      )
    ).rows[0];
    if (!exists) return failure("Job not found.", 404);
    const token = randomBytes(32).toString("base64url");
    await sql`UPDATE sweepsign_job SET public_token_hash = ${tokenHash(token)}, public_revoked_at = NULL WHERE id = ${id} AND user_id = ${user}`.execute(
      db,
    );
    return json({ token, url: `/handoff/${token}` });
  }
  if (request.method === "DELETE") {
    const result =
      await sql`UPDATE sweepsign_job SET public_token_hash = NULL, public_revoked_at = ${new Date().toISOString()} WHERE id = ${id} AND user_id = ${user} AND public_token_hash IS NOT NULL`.execute(
        db,
      );
    return Number(result.numAffectedRows)
      ? json({ revoked: true })
      : failure("Handoff not found.", 404);
  }
  return failure("Method not allowed.", 405);
}

async function templates(request: Request, user: string, rest: string[]) {
  const id = rest[0];
  if (!id && request.method === "GET") {
    const rows = await sql<{
      id: string;
      name: string;
      scope_json: string;
    }>`SELECT id, name, scope_json FROM sweepsign_template WHERE user_id = ${user} ORDER BY created_at DESC`.execute(
      db,
    );
    return json(
      rows.rows.map((row) => ({
        id: row.id,
        name: row.name,
        scope: JSON.parse(row.scope_json),
      })),
    );
  }
  if (id && request.method === "DELETE") {
    const result =
      await sql`DELETE FROM sweepsign_template WHERE id = ${id} AND user_id = ${user}`.execute(
        db,
      );
    return Number(result.numAffectedRows)
      ? json({ deleted: true })
      : failure("Template not found.", 404);
  }
  const input = await body(request);
  const name =
    typeof input?.name === "string" ? input.name.trim().slice(0, 60) : "";
  const checked = cleanDraft({
    version: 1,
    jobName: "",
    cleanerName: "",
    serviceDate: "",
    exception: "",
    photos: [],
    nextAction: "review",
    nextActionUrl: "",
    scope: input?.scope,
  });
  if (!name || !checked?.scope.length)
    return failure("Provide a template name and scope.");
  if (!id && request.method === "POST") {
    const next = randomUUID(),
      now = new Date().toISOString();
    await sql`INSERT INTO sweepsign_template (id, user_id, name, scope_json, created_at, updated_at) VALUES (${next}, ${user}, ${name}, ${JSON.stringify(checked.scope)}, ${now}, ${now})`.execute(
      db,
    );
    return json({ id: next, name, scope: checked.scope }, 201);
  }
  if (id && request.method === "PUT") {
    const owned = (
      await sql`SELECT id FROM sweepsign_template WHERE id = ${id} AND user_id = ${user}`.execute(
        db,
      )
    ).rows[0];
    if (!owned) return failure("Template not found.", 404);
    await sql`UPDATE sweepsign_template SET name = ${name}, scope_json = ${JSON.stringify(checked.scope)}, updated_at = ${new Date().toISOString()} WHERE id = ${id} AND user_id = ${user}`.execute(
      db,
    );
    return json({ id, name, scope: checked.scope });
  }
  return failure("Method not allowed.", 405);
}

async function publicHandoff(token: string) {
  const row = (
    await sql<{
      title: string;
      draft_json: string;
    }>`SELECT title, draft_json FROM sweepsign_job WHERE public_token_hash = ${tokenHash(token)} AND public_revoked_at IS NULL`.execute(
      db,
    )
  ).rows[0];
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, noarchive, nosnippet",
  };
  return row
    ? json(
        { title: row.title, draft: JSON.parse(row.draft_json) },
        200,
        headers,
      )
    : json({ error: "Handoff not found." }, 404, headers);
}
