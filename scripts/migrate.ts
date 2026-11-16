/**
 * scripts/migrate.ts
 *
 * Applies every file in supabase/migrations, in order, to DATABASE_URL.
 * Each file is written to be safe to run twice. (`supabase db push` does the
 * same job and records versions; use whichever the project is set up for.)
 */

import "./env";
import postgres from "postgres";
import { migrationSql } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL isn't set. Put it in .env.local in this folder (DATABASE_URL=postgresql://...), or pass it on the command line."); process.exit(1); }
  console.log(`Applying migrations to ${new URL(url).host} ...`);
  const client = postgres(url, { prepare: false, max: 1 });
  for (const file of migrationSql()) await client.unsafe(file);
  await client.end();
  console.log("Migrations applied.");
}

void main();
