import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { ensureSchema } = await import("../lib/db");

await ensureSchema();
console.log("SweepSign database schema is ready.");
