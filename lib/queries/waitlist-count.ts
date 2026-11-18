/**
 * lib/queries/waitlist-count.ts
 *
 * How many confirmed addresses are on the waiting list, for the line under
 * the splash's join form (lib/waitlist.ts says when it shows and how it
 * reads). The splash renders on every request, so the count is held for ten
 * minutes rather than counted each time (AGENTS.md: counts a page shows are
 * never a COUNT(*) at read time). Each server holds its own copy, which is
 * fine for a number that is rounded to the ten and moves slowly.
 */

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/sql";

const HOLD_MS = 10 * 60_000;
let held: { at: number; confirmed: number } | null = null;

export async function confirmedOnList(now = Date.now()): Promise<number> {
  if (held && now - held.at < HOLD_MS) return held.confirmed;
  try {
    const [row] = rowsOf<{ confirmed: number }>(await db.execute(sql`select count(confirmed_at)::int as confirmed from waitlist`));
    held = { at: now, confirmed: row?.confirmed ?? 0 };
  } catch {
    // The page must render even if the database doesn't answer; with no number, no line is shown.
    return held?.confirmed ?? 0;
  }
  return held.confirmed;
}
