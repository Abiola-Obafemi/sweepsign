import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

const databaseFile = process.env.SWEEPSIGN_DB_PATH ?? ".data/sweepsign.sqlite";
mkdirSync(dirname(databaseFile), { recursive: true });
export const database = new Database(databaseFile);
database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");
database.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL,
    "image" TEXT,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATE NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
  CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATE,
    "refreshTokenExpiresAt" DATE,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
  CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATE NOT NULL,
    "createdAt" DATE NOT NULL,
    "updatedAt" DATE NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
`);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required in production.");
}
if (isProduction && !process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
  throw new Error("BETTER_AUTH_TRUSTED_ORIGINS is required in production.");
}
const secret =
  process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("hex");
const trustedOrigins = (
  process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
  "http://127.0.0.1:4173,http://localhost:4173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database,
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:4173",
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  trustedOrigins,
  rateLimit: {
    // Keep protection enabled in local verification too. Production needs a
    // shared store before horizontal scaling; the launch gate records that.
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 10, max: 5 },
      "/sign-up/email": { window: 60, max: 10 },
    },
  },
  advanced: {
    cookiePrefix: "sweepsign",
    useSecureCookies: isProduction,
    ipAddress: {
      // Express overwrites this private header from the direct socket before
      // the request reaches Better Auth, so clients cannot spoof the value.
      ipAddressHeaders: ["x-sweepsign-client-ip"],
    },
  },
});
