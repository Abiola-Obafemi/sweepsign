import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { Kysely, PostgresDialect, SqliteDialect, sql } from "kysely";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "./database-url";
import {
  rateLimitRepairStatements,
  schemaStatements,
  type RateLimitSchemaState,
} from "./schema-statements";

type DatabaseShape = Record<string, never>;

const databaseUrl = resolveDatabaseUrl({
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
});
export const usesPostgres = Boolean(databaseUrl);
if (!usesPostgres) {
  const file = process.env.SWEEPSIGN_DB_PATH ?? ".data/sweepsign.sqlite";
  mkdirSync(dirname(file), { recursive: true });
}

const dialect = usesPostgres
  ? new PostgresDialect({
      // Supabase's pooler is the production target. Keep this small for
      // serverless request concurrency; it is not a browser connection.
      pool: new Pool({ connectionString: databaseUrl, max: 1 }),
    })
  : new SqliteDialect({
      database: new Database(
        process.env.SWEEPSIGN_DB_PATH ?? ".data/sweepsign.sqlite",
      ),
    });

export const db = new Kysely<DatabaseShape>({ dialect });

async function rateLimitSchemaState(): Promise<RateLimitSchemaState> {
  if (usesPostgres) {
    const column = await sql<{ is_nullable: string }>`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'rateLimit'
        AND column_name = 'id'
    `.execute(db);
    const hasIdColumn = column.rows.length > 0;
    const nullIds = hasIdColumn
      ? await sql<{ has_null_ids: boolean }>`
          SELECT EXISTS (
            SELECT 1 FROM "rateLimit" WHERE "id" IS NULL
          ) AS has_null_ids
        `.execute(db)
      : undefined;
    const uniqueId = hasIdColumn
      ? await sql<{ has_unique_id: boolean }>`
          SELECT EXISTS (
            SELECT 1
            FROM pg_index AS index_info
            INNER JOIN pg_class AS relation
              ON relation.oid = index_info.indrelid
            INNER JOIN pg_namespace AS namespace
              ON namespace.oid = relation.relnamespace
            INNER JOIN pg_attribute AS column_info
              ON column_info.attrelid = relation.oid
             AND column_info.attnum = ANY(index_info.indkey)
            WHERE namespace.nspname = current_schema()
              AND relation.relname = 'rateLimit'
              AND index_info.indisunique
              AND index_info.indnatts = 1
              AND column_info.attname = 'id'
          ) AS has_unique_id
        `.execute(db)
      : undefined;
    return {
      hasIdColumn,
      hasNullIds: nullIds?.rows[0]?.has_null_ids ?? false,
      hasUniqueId: uniqueId?.rows[0]?.has_unique_id ?? false,
      idIsNotNull: column.rows[0]?.is_nullable === "NO",
    };
  }

  const result = await sql<{
    name: string;
    notnull: number;
    pk: number;
  }>`PRAGMA table_info("rateLimit")`.execute(db);
  const idColumn = result.rows.find((column) => column.name === "id");
  const nullIds = idColumn
    ? await sql<{ has_null_ids: number }>`
        SELECT EXISTS (SELECT 1 FROM "rateLimit" WHERE "id" IS NULL) AS has_null_ids
      `.execute(db)
    : undefined;
  const indexes = await sql<{
    name: string;
    unique: number;
  }>`PRAGMA index_list("rateLimit")`.execute(db);
  return {
    hasIdColumn: Boolean(idColumn),
    hasNullIds: Boolean(nullIds?.rows[0]?.has_null_ids),
    hasUniqueId:
      Boolean(idColumn?.pk) ||
      indexes.rows.some(
        (index) => index.name === "rateLimit_id_key" && Boolean(index.unique),
      ),
    idIsNotNull: Boolean(idColumn?.pk) || Boolean(idColumn?.notnull),
  };
}

async function repairRateLimitSchema() {
  const dialectName = usesPostgres ? "postgres" : "sqlite";
  const state = await rateLimitSchemaState();
  for (const statement of rateLimitRepairStatements(dialectName, state)) {
    await sql.raw(statement).execute(db);
  }
}

let schemaPromise: Promise<void> | undefined;
export function ensureSchema() {
  schemaPromise ??= (async () => {
    if (process.env.NODE_ENV === "production" && !databaseUrl) {
      throw new Error(
        "DATABASE_URL or POSTGRES_URL is required for a production SweepSign deployment.",
      );
    }
    for (const statement of schemaStatements)
      await sql.raw(statement).execute(db);
    await repairRateLimitSchema();
  })();
  return schemaPromise;
}
