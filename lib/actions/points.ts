/**
 * lib/actions/points.ts
 *
 * Writing to the Momentum ledger. The rules (how much, how often) are in
 * lib/ranking/points.ts; this file only counts what's already there and adds
 * a row when the act still earns.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, pointEvents } from "../db/schema";
import { dayStart, launchDay } from "../ranking/day";
import { momentum, POINTS, stillEarns, type PointKind } from "../ranking/points";

export async function awardPoints(authorId: string, kind: PointKind, opts: { now: Date; subject?: string; scale?: number }): Promise<boolean> {
  const start = dayStart(launchDay(opts.now));
  const [counted] = await db.select({
    ever: sql<number>`count(*)::int`,
    today: sql<number>`count(*) filter (where ${pointEvents.createdAt} >= ${start.toISOString()})::int`,
  }).from(pointEvents).where(and(eq(pointEvents.authorId, authorId), eq(pointEvents.kind, kind)));
  if (!stillEarns(kind, { ever: counted?.ever ?? 0, today: counted?.today ?? 0 })) return false;
  const points = POINTS[kind].points * (opts.scale ?? 1);
  if (points <= 0) return false;
  await db.insert(pointEvents).values({ authorId, kind, points, subject: opts.subject ?? null, createdAt: opts.now });
  await refreshMomentum(authorId, opts.now);
  return true;
}

/** Take back the points one act earned (a cheer withdrawn, a follow undone). */
export async function revokePoints(authorId: string, kind: PointKind, subject: string, now: Date): Promise<void> {
  await db.delete(pointEvents).where(and(eq(pointEvents.authorId, authorId), eq(pointEvents.kind, kind), eq(pointEvents.subject, subject)));
  await refreshMomentum(authorId, now);
}

/** Recompute one author's Momentum from the last year of the ledger. Older rows have decayed to nothing. */
export async function refreshMomentum(authorId: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - 365 * 86_400_000);
  const events = await db.select({ points: pointEvents.points, createdAt: pointEvents.createdAt }).from(pointEvents)
    .where(and(eq(pointEvents.authorId, authorId), gte(pointEvents.createdAt, since)));
  const value = momentum(events, now);
  await db.update(authors).set({ momentum: value }).where(eq(authors.id, authorId));
  return value;
}
