/**
 * lib/cron/momentum.ts
 *
 * The hourly recount of Momentum. Points halve every thirty days, so a score
 * goes stale without any new event; this recomputes every author who has an
 * event recent enough to still be worth something. The sum itself is
 * refreshMomentum's (lib/actions/points.ts), from the ledger only: no plan,
 * no trial, no Support (AGENTS.md rule 2).
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import { refreshMomentum } from "../actions/points";
import { rowsOf } from "../sql";
import { chunks } from "./pure";

const WINDOW_DAYS = 400;
const BATCH = 25;

export async function recomputeMomentum(now: Date): Promise<{ authors: number; cleared: number }> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const rows = rowsOf<{ author_id: string }>(await db.execute(sql`select distinct author_id from point_events where created_at >= ${since.toISOString()}`));
  const ids = rows.map((r) => r.author_id);
  for (const batch of chunks(ids, BATCH)) await Promise.all(batch.map((id) => refreshMomentum(id, now)));

  // An author whose last event has aged out of the window still holds a
  // crumb of the old score. Nothing will recompute it again, so set it to zero.
  const stale = rowsOf<{ id: string }>(await db.execute(sql`
    update authors set momentum = 0
    where momentum > 0
      and not exists (select 1 from point_events pe where pe.author_id = authors.id and pe.created_at >= ${since.toISOString()})
    returning id`));
  return { authors: ids.length, cleared: stale.length };
}
