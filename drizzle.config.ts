import { defineConfig } from "drizzle-kit";

// Used only to draft SQL from the schema (`npx drizzle-kit generate`). The
// migrations that run are the hand-checked files in supabase/migrations.
export default defineConfig({ dialect: "postgresql", schema: "./lib/db/schema/index.ts", out: "./.data/drizzle" });
