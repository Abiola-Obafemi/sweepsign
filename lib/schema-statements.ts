export const rateLimitTableStatement =
  'CREATE TABLE IF NOT EXISTS "rateLimit" ("id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "count" INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL)';

type SupportedDatabaseDialect = "postgres" | "sqlite";

export type RateLimitSchemaState = {
  hasIdColumn: boolean;
  hasNullIds: boolean;
  hasUniqueId: boolean;
  idIsNotNull: boolean;
};

export function rateLimitRepairStatements(
  dialect: SupportedDatabaseDialect,
  state: RateLimitSchemaState,
) {
  const statements: string[] = [];
  if (!state.hasIdColumn) {
    statements.push(
      dialect === "postgres"
        ? 'ALTER TABLE "rateLimit" ADD COLUMN IF NOT EXISTS "id" TEXT'
        : 'ALTER TABLE "rateLimit" ADD COLUMN "id" TEXT',
    );
  }

  if (!state.hasIdColumn || state.hasNullIds) {
    statements.push('UPDATE "rateLimit" SET "id" = "key" WHERE "id" IS NULL');
  }

  if (!state.hasUniqueId) {
    statements.push(
      'CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_id_key" ON "rateLimit"("id")',
    );
  }

  if (dialect === "postgres" && !state.idIsNotNull) {
    statements.push('ALTER TABLE "rateLimit" ALTER COLUMN "id" SET NOT NULL');
  }

  return statements;
}

export const schemaStatements = [
  'CREATE TABLE IF NOT EXISTS "user" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE, "emailVerified" BOOLEAN NOT NULL, "image" TEXT, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "session" ("id" TEXT PRIMARY KEY, "expiresAt" TIMESTAMP NOT NULL, "token" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "ipAddress" TEXT, "userAgent" TEXT, "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE)',
  'CREATE TABLE IF NOT EXISTS "account" ("id" TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT, "accessTokenExpiresAt" TIMESTAMP, "refreshTokenExpiresAt" TIMESTAMP, "scope" TEXT, "password" TEXT, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "verification" ("id" TEXT PRIMARY KEY, "identifier" TEXT NOT NULL, "value" TEXT NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL)',
  rateLimitTableStatement,
  "CREATE TABLE IF NOT EXISTS sweepsign_profile (user_id TEXT PRIMARY KEY, business_name TEXT NOT NULL DEFAULT '', cleaner_name TEXT NOT NULL DEFAULT '', onboarded BOOLEAN NOT NULL DEFAULT FALSE, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sweepsign_job (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, draft_json TEXT NOT NULL, request_key TEXT, public_token_hash TEXT, public_revoked_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sweepsign_template (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, scope_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS sweepsign_job_owner ON sweepsign_job(user_id, updated_at DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS sweepsign_job_request_key ON sweepsign_job(user_id, request_key) WHERE request_key IS NOT NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS sweepsign_job_public_token ON sweepsign_job(public_token_hash) WHERE public_token_hash IS NOT NULL",
];
