/**
 * lib/studio/server.ts
 *
 * What the studio's routes share: finding the signed-in author, telling an
 * author's followers something, and the rules for putting a launch on a day
 * (docs/development.md, section 4). Nothing here asks about membership:
 * making a page and launching are free (AGENTS.md rule 3). A member tool's
 * route calls isMember itself.
 */

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import type { NextResponse } from "next/server";
import type { output as zOutput, ZodTypeAny } from "zod";
import { awardPoints } from "../actions/points";
import { notify, type NotificationKind } from "../actions/notify";
import { fail, signedIn } from "../api";
import type { Viewer } from "../auth";
import { db } from "../db";
import { authors, follows, images, launches, works, type Author, type Launch, type Work } from "../db/schema";
import { aiAccepted } from "./rules";

type Limit = { name: string; max: number; windowSec: number };

export async function authorOf(userId: string): Promise<Author | null> {
  const [page] = await db.select().from(authors).where(eq(authors.userId, userId)).limit(1);
  return page ?? null;
}

/** A signed-in, rate-limited viewer and their page, which may not exist yet. A banned page can change nothing. */
export async function studioViewer(req: Request, limit: Limit): Promise<{ viewer: Viewer; author: Author | null } | { response: NextResponse }> {
  const who = await signedIn(req, limit);
  if ("response" in who) return who;
  const author = await authorOf(who.viewer.id);
  if (author?.standing === "banned") return { response: fail(403, "This page has been removed, so it can't be changed.") };
  return { viewer: who.viewer, author };
}

/** The same, for routes that need the page to exist. */
export async function studioAuthor(req: Request, limit: Limit): Promise<{ viewer: Viewer; author: Author } | { response: NextResponse }> {
  const who = await studioViewer(req, limit);
  if ("response" in who) return who;
  if (!who.author) return { response: fail(404, "Make your page first.") };
  return { viewer: who.viewer, author: who.author };
}

/** Why this page can't appear in public right now, or null if it can. */
export function notPublicReason(author: Author): string | null {
  if (author.standing !== "good") return "Your page is under review, so this is paused until that's decided.";
  if (!author.publishedAt) return "Make your page public first.";
  if (!aiAccepted(author.aiUse)) return "Say how your work is written first: the AI declaration on your page. Author Hunt does not accept work written by AI.";
  return null;
}

/** Whether a picture's address is one this person uploaded and hasn't removed. */
export async function ownImages(userId: string, urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = await db.select({ url: images.url }).from(images)
    .where(and(eq(images.ownerUserId, userId), inArray(images.url, urls), isNull(images.removedAt)));
  return new Set(rows.map((r) => r.url));
}

/** One notification for each follower, a few at a time. The author's own account is skipped by notify. */
export async function tellFollowers(author: Author, input: { kind: NotificationKind; title: string; body?: string; href: string; groupKey?: string }): Promise<number> {
  const rows = await db.select({ userId: follows.userId }).from(follows).where(eq(follows.authorId, author.id));
  for (let i = 0; i < rows.length; i += 20) {
    await Promise.all(rows.slice(i, i + 20).map((r) => notify({ ...input, userId: r.userId, fromUserId: author.userId })));
  }
  return rows.length;
}

export { DAY_PATTERN, EARLY_DAYS, EARLY_DAY_ROOM, dayProblem, earlyDays, firstDayWithRoom } from "./days";

/** Whether the author already has a launch on that day (one a day), leaving out the one being moved. */
export async function dayTaken(authorId: string, day: string, exceptId?: string): Promise<boolean> {
  const rows = await db.select({ id: launches.id }).from(launches).where(and(
    eq(launches.authorId, authorId), eq(launches.launchDay, day), ne(launches.status, "pulled"),
  ));
  return rows.some((r) => r.id !== exceptId);
}

export function launchHref(author: Author, work: Work | null): string {
  return work ? `/work/${work.slug}` : `/author/${author.handle}`;
}

/**
 * What happens the moment a launch is live: the points, and a word to the
 * author's followers. Called here only for a launch that starts live. One set
 * for a later day is made live by the day's job, which does this then, so it
 * must not be called for a scheduled launch or the points would be given twice.
 */
export async function wentLive(author: Author, launch: Launch, work: Work | null, now: Date): Promise<void> {
  await awardPoints(author.id, launch.kind === "author" ? "launch_page" : "launch_work", { now, subject: launch.id });
  await tellFollowers(author, {
    kind: "followed_launch",
    title: work ? `${author.name} launched ${work.title}` : `${author.name} launched their page`,
    body: work?.tagline || author.tagline,
    href: launchHref(author, work),
    groupKey: `launch:${launch.id}`,
  });
}

export async function worksOf(authorId: string): Promise<Work[]> {
  return db.select().from(works).where(eq(works.authorId, authorId)).orderBy(works.createdAt);
}

export { dayWords } from "./days";

/**
 * readBody from lib/api.ts, for a schema with defaults: this one answers with
 * the schema's output (defaults filled in) where that one types its input.
 */
export async function readInput<S extends ZodTypeAny>(req: Request, schema: S): Promise<{ data: zOutput<S> } | { response: NextResponse }> {
  let raw: unknown;
  try { raw = await req.json(); } catch { return { response: fail(400, "That request couldn't be read.") }; }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { response: fail(400, parsed.error.issues[0]?.message ?? "Something in that request isn't right.") };
  return { data: parsed.data as zOutput<S> };
}
