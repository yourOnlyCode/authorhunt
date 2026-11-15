/**
 * scripts/migrate.ts
 *
 * Applies every file in supabase/migrations, in order, to DATABASE_URL.
 * Each file is written to be safe to run twice. (`supabase db push` does the
 * same job and records versions; use whichever the project is set up for.)
 */

import postgres from "postgres";
import { migrationSql } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL."); process.exit(1); }
  const client = postgres(url, { prepare: false, max: 1 });
  for (const file of migrationSql()) await client.unsafe(file);
  await client.end();
  console.log("Migrations applied.");
}

void main();
