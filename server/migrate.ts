import { database } from "./auth.js";

const requiredTables = ["user", "session", "account", "verification"];
const found = database
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((row) => (row as { name: string }).name);

const missing = requiredTables.filter((table) => !found.includes(table));
if (missing.length) {
  throw new Error(`Authentication schema is incomplete: ${missing.join(", ")}`);
}

console.log("SweepSign database schema is ready.");
