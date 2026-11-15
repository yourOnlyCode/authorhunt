/**
 * scripts/dev-db.ts
 *
 * Runs before `npm run dev`. With no DATABASE_URL, it makes the local database
 * in .data/pglite and fills it with sample data the first time, so the app has
 * something to show with nothing set up. With DATABASE_URL set it does nothing.
 */

import fs from "node:fs";
import path from "node:path";

async function main() {
  if (process.env.DATABASE_URL) return;
  const dir = process.env.LOCAL_DB_DIR ? path.resolve(process.env.LOCAL_DB_DIR) : path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const marker = path.join(dir, "..", `${path.basename(dir)}.seeded`);
  if (fs.existsSync(marker)) return;
  const { seed } = await import("./seed");
  const res = await seed();
  fs.writeFileSync(marker, new Date().toISOString());
  console.log(`Local database ready: ${res.authors} sample authors. Sign in at /sign-in with a sample account.`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
