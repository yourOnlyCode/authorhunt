/**
 * lib/actions/cheer.ts
 *
 * Cheering a launch, and taking a cheer back. One account, one cheer, never
 * your own launch (AGENTS.md rule 5): the primary key enforces the first two
 * and this function the third. The launch's count and score are recomputed on
 * the write path, so the board never counts at read time.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, cheers, comments, follows, launches, works } from "../db/schema";
import type { Viewer } from "../auth";
import { cheerWeight, launchScore } from "../ranking/score";
import { awardPoints, revokePoints } from "./points";
import { notify } from "./notify";

export class ActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function recomputeLaunch(launchId: string): Promise<{ cheerCount: number; commentCount: number; score: number }> {
  const [launch] = await db.select({ authorUserId: authors.userId }).from(launches).innerJoin(authors, eq(launches.authorId, authors.id)).where(eq(launches.id, launchId)).limit(1);
  const [c] = await db.select({ n: sql<number>`count(*)::int`, w: sql<number>`coalesce(sum(${cheers.weight}), 0)::float` }).from(cheers).where(eq(cheers.launchId, launchId));
  const [m] = await db.select({
    n: sql<number>`count(*) filter (where ${comments.removedAt} is null and ${comments.hiddenAt} is null)::int`,
    people: sql<number>`count(distinct ${comments.userId}) filter (where ${comments.removedAt} is null and ${comments.hiddenAt} is null and ${comments.userId} <> ${launch?.authorUserId ?? ""})::int`,
  }).from(comments).where(eq(comments.launchId, launchId));
  const next = { cheerCount: c?.n ?? 0, commentCount: m?.n ?? 0, score: launchScore({ cheerWeightSum: c?.w ?? 0, distinctCommenters: m?.people ?? 0 }) };
  await db.update(launches).set(next).where(eq(launches.id, launchId));
  return next;
}

export async function toggleCheer(viewer: Viewer, launchId: string, now: Date): Promise<{ cheered: boolean; count: number }> {
  const [row] = await db.select({ launch: launches, author: authors, work: works }).from(launches)
    .innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
    .where(eq(launches.id, launchId)).limit(1);
  if (!row || row.launch.status === "pulled") throw new ActionError(404, "That launch isn't here any more.");
  if (row.launch.status === "scheduled") throw new ActionError(400, "This launch hasn't started yet.");
  if (row.author.userId === viewer.id) throw new ActionError(400, "You can't cheer your own launch.");

  const [existing] = await db.select().from(cheers).where(and(eq(cheers.userId, viewer.id), eq(cheers.launchId, launchId))).limit(1);
  const subject = `${launchId}:${viewer.id}`;

  if (existing) {
    await db.delete(cheers).where(and(eq(cheers.userId, viewer.id), eq(cheers.launchId, launchId)));
    await revokePoints(row.author.id, "cheer_received", subject, now);
  } else {
    const [activity] = await db.select({ n: sql<number>`(select count(*) from ${cheers} where ${cheers.userId} = ${viewer.id})::int + (select count(*) from ${follows} where ${follows.userId} = ${viewer.id})::int + (select count(*) from ${comments} where ${comments.userId} = ${viewer.id})::int` }).from(sql`(select 1) as one`);
    const weight = cheerWeight({ isOwnLaunch: false, accountCreatedAt: viewer.createdAt, hasOtherActivity: (activity?.n ?? 0) > 0, now });
    await db.insert(cheers).values({ userId: viewer.id, launchId, weight }).onConflictDoNothing();
    await awardPoints(row.author.id, "cheer_received", { now, subject, scale: weight });
    // An author who cheers another author's launch earns a little too: the community supports itself.
    const [mine] = await db.select({ id: authors.id }).from(authors).where(eq(authors.userId, viewer.id)).limit(1);
    if (mine) await awardPoints(mine.id, "support_others", { now, subject });
    const title = row.work ? row.work.title : row.author.name;
    await notify({ userId: row.author.userId, kind: "cheer", title: `${viewer.displayName} cheered ${title}`, href: row.work ? `/work/${row.work.slug}` : `/author/${row.author.handle}`, groupKey: `cheer:${launchId}`, fromUserId: viewer.id });
  }
  const next = await recomputeLaunch(launchId);
  return { cheered: !existing, count: next.cheerCount };
}

export async function toggleFollow(viewer: Viewer, authorId: string, now: Date): Promise<{ following: boolean; count: number }> {
  const [author] = await db.select().from(authors).where(eq(authors.id, authorId)).limit(1);
  if (!author || author.standing !== "good") throw new ActionError(404, "That page isn't here any more.");
  if (author.userId === viewer.id) throw new ActionError(400, "This is your own page.");
  const [existing] = await db.select().from(follows).where(and(eq(follows.userId, viewer.id), eq(follows.authorId, authorId))).limit(1);
  const subject = `${authorId}:${viewer.id}`;
  if (existing) {
    await db.delete(follows).where(and(eq(follows.userId, viewer.id), eq(follows.authorId, authorId)));
    await revokePoints(authorId, "follower", subject, now);
  } else {
    await db.insert(follows).values({ userId: viewer.id, authorId }).onConflictDoNothing();
    await awardPoints(authorId, "follower", { now, subject });
    await notify({ userId: author.userId, kind: "follower", title: `${viewer.displayName} follows you`, href: `/author/${author.handle}`, groupKey: `follower:${authorId}`, fromUserId: viewer.id });
  }
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.authorId, authorId));
  await db.update(authors).set({ followerCount: n?.n ?? 0 }).where(eq(authors.id, authorId));
  return { following: !existing, count: n?.n ?? 0 };
}
