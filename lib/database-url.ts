type DatabaseEnvironment = {
  DATABASE_URL?: string;
  POSTGRES_URL?: string;
};

export function resolveDatabaseUrl(environment: DatabaseEnvironment) {
  const configured =
    environment.DATABASE_URL?.trim() || environment.POSTGRES_URL?.trim();
  if (!configured) return undefined;

  const url = new URL(configured);
  // node-postgres 8 currently interprets sslmode=require as verify-full.
  // Supabase documents `require` as encrypted without CA verification; the
  // compatibility flag preserves that standard libpq meaning until a
  // project-specific CA certificate is configured.
  if (
    url.searchParams.get("sslmode") === "require" &&
    !url.searchParams.has("uselibpqcompat")
  ) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}
