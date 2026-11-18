/**
 * lib/studio/day-counts.ts
 *
 * The days an author can set a launch on, with how many launches each has
 * so far, so a day can be chosen knowing how full it is. Before the site
 * opens these are opening day and the four weeks after (days.ts); once open,
 * the next four weeks. Counts only: no titles and no names, so a scheduled
 * launch stays its author's own business until its day.
 */

import { and, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { launches } from "../db/schema";
import { launchAt } from "../env";
import { addDays, launchDay } from "../ranking/day";
import { EARLY_DAYS, earlyDays } from "./days";

export type DayCount = { day: string; count: number };

export async function launchDays(now: Date): Promise<DayCount[]> {
  const early = earlyDays(now, launchAt());
  const days = early.length > 0 ? early : Array.from({ length: EARLY_DAYS }, (_, i) => addDays(launchDay(now), i));
  const rows = await db.select({ day: launches.launchDay, n: sql<number>`count(*)::int` }).from(launches)
    .where(and(gte(launches.launchDay, days[0]!), lte(launches.launchDay, days[days.length - 1]!), ne(launches.status, "pulled")))
    .groupBy(launches.launchDay);
  const counts = new Map(rows.map((r) => [r.day, r.n]));
  return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}
