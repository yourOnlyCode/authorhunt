/**
 * lib/db/index.ts
 *
 * The one database handle. With DATABASE_URL set it is Supabase Postgres
 * through the transaction pooler (prepare: false, which the pooler needs).
 * Without it, outside production, it is PGlite: a real Postgres compiled to
 * WebAssembly, kept in .data/pglite, so `npm run dev` works with no accounts
 * set up. Both speak the same SQL and the same Drizzle API.
 */

import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
/** Where the local database lives. LOCAL_DB_DIR lets two dev servers run side by side, each with its own. */
export const LOCAL_DIR = process.env.LOCAL_DB_DIR ? path.resolve(process.env.LOCAL_DB_DIR) : path.join(process.cwd(), ".data", "pglite");

/** Every migration's SQL, oldest first. Each file is safe to run twice. */
export function migrationSql(): string[] {
  if (!fs.existsSync(MIGRATIONS)) return [];
  return fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort().map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
}

function connect(): { db: Db; local: PGlite | null } {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 10 });
    return { db: drizzlePg(client, { schema }) as unknown as Db, local: null };
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_DB !== "1") {
    throw new Error("DATABASE_URL is not set. Author Hunt needs its own Supabase project in production (docs/setup-checklist.md).");
  }
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const local = new PGlite(LOCAL_DIR);
  // PGlite runs one query at a time in the order asked, so migrations queued
  // here finish before any request's query. They are idempotent.
  for (const sql of migrationSql()) void local.exec(sql);
  return { db: drizzleLite(local, { schema }) as unknown as Db, local };
}

// Next's dev server reloads modules; one connection must survive that. It is made on first
// use, not on import, so a build (which imports every route) never opens the database.
const held = globalThis as unknown as { __ahDb?: ReturnType<typeof connect> };
const conn = () => held.__ahDb ?? (held.__ahDb = connect());

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = conn().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});
export const usingLocalDb = !process.env.DATABASE_URL;
export { schema };
