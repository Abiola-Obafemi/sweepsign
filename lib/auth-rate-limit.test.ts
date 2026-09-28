import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { authRateLimit } from "./auth-rate-limit";
import {
  rateLimitRepairStatements,
  rateLimitTableStatement,
  schemaStatements,
} from "./schema-statements";

const completeState = {
  hasIdColumn: true,
  hasNullIds: false,
  hasUniqueId: true,
  idIsNotNull: true,
};

describe("Better Auth database rate limiting", () => {
  it("uses durable database storage without weakening credential rules", () => {
    expect(authRateLimit).toMatchObject({
      enabled: true,
      window: 60,
      max: 100,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 10, max: 5 },
        "/sign-up/email": { window: 60, max: 10 },
      },
    });
  });

  it("creates Better Auth's idempotent rateLimit table for SQLite and Postgres", () => {
    expect(schemaStatements).toContain(rateLimitTableStatement);
    expect(rateLimitTableStatement).toBe(
      'CREATE TABLE IF NOT EXISTS "rateLimit" ("id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "count" INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL)',
    );
  });

  it("repairs a legacy SQLite table without discarding rate-limit rows", () => {
    expect(
      rateLimitRepairStatements("sqlite", {
        ...completeState,
        hasIdColumn: false,
        hasUniqueId: false,
        idIsNotNull: false,
      }),
    ).toEqual([
      'ALTER TABLE "rateLimit" ADD COLUMN "id" TEXT',
      'UPDATE "rateLimit" SET "id" = "key" WHERE "id" IS NULL',
      'CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_id_key" ON "rateLimit"("id")',
    ]);
  });

  it("repairs a legacy Postgres table and enforces non-null IDs", () => {
    expect(
      rateLimitRepairStatements("postgres", {
        ...completeState,
        hasIdColumn: false,
        hasUniqueId: false,
        idIsNotNull: false,
      }),
    ).toEqual([
      'ALTER TABLE "rateLimit" ADD COLUMN IF NOT EXISTS "id" TEXT',
      'UPDATE "rateLimit" SET "id" = "key" WHERE "id" IS NULL',
      'CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_id_key" ON "rateLimit"("id")',
      'ALTER TABLE "rateLimit" ALTER COLUMN "id" SET NOT NULL',
    ]);
  });

  it("resumes a partial table with null IDs and no unique index", () => {
    expect(
      rateLimitRepairStatements("sqlite", {
        ...completeState,
        hasNullIds: true,
        hasUniqueId: false,
        idIsNotNull: false,
      }),
    ).toEqual([
      'UPDATE "rateLimit" SET "id" = "key" WHERE "id" IS NULL',
      'CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_id_key" ON "rateLimit"("id")',
    ]);
  });

  it("repairs an actual partial SQLite table without losing its counter", () => {
    const directory = mkdtempSync(join(tmpdir(), "sweepsign-rate-limit-"));
    const databasePath = join(directory, "partial.sqlite");
    const database = new Database(databasePath);
    try {
      database.exec(
        'CREATE TABLE "rateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL, "id" TEXT)',
      );
      database
        .prepare(
          'INSERT INTO "rateLimit" ("key", "count", "lastRequest") VALUES (?, ?, ?)',
        )
        .run("198.51.100.9:/sign-up/email", 2, 1234567890);
      for (const statement of rateLimitRepairStatements("sqlite", {
        ...completeState,
        hasNullIds: true,
        hasUniqueId: false,
        idIsNotNull: false,
      })) {
        database.exec(statement);
      }

      expect(
        database
          .prepare(
            'SELECT "id", "key", "count", "lastRequest" FROM "rateLimit"',
          )
          .get(),
      ).toEqual({
        id: "198.51.100.9:/sign-up/email",
        key: "198.51.100.9:/sign-up/email",
        count: 2,
        lastRequest: 1234567890,
      });
      const indexes = database
        .prepare('PRAGMA index_list("rateLimit")')
        .all() as Array<{ name: string; unique: number }>;
      expect(
        indexes.some(
          (index) => index.name === "rateLimit_id_key" && Boolean(index.unique),
        ),
      ).toBe(true);
    } finally {
      database.close();
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("does nothing after the rate-limit schema is complete", () => {
    expect(rateLimitRepairStatements("sqlite", completeState)).toEqual([]);
  });
});
