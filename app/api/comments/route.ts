/**
 * app/api/comments/route.ts
 *
 * Writing a comment on a launch (docs/product-structure.md, section 2).
 * Threads are one level deep, so a reply to a reply is filed under the same
 * top-level comment. Commenters count toward a launch's score once each, so
 * the launch is recomputed here, on the write path. An account under ten
 * minutes old can't comment yet: the wait is the cheapest answer to a burst
 * of fresh sign-ups on a launch day.
 */

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { recomputeLaunch } from "@/lib/actions/cheer";
import { notify } from "@/lib/actions/notify";
import { awardPoints } from "@/lib/actions/points";
import { db } from "@/lib/db";
import { authors, comments } from "@/lib/db/schema";
import { CommentBody, launchHref, launchWithAuthor } from "./shared";

const Body = z.object({ launchId: z.string().uuid(), body: CommentBody, parentId: z.string().uuid().optional() });
const NEW_ACCOUNT_WAIT_MS = 10 * 60_000;

export async function POST(req: Request) {
  const who = await signedIn(req, { name: "comment", max: 8, windowSec: 60 });
  if ("response" in who) return who.response;
  const { viewer } = who;
  const parsed = await readBody(req, Body);
  if ("response" in parsed) return parsed.response;
  const { launchId, body, parentId } = parsed.data;
  const now = new Date();

  if (now.getTime() - viewer.createdAt.getTime() < NEW_ACCOUNT_WAIT_MS) return fail(403, "New accounts wait ten minutes before commenting. Try again shortly.");

  const row = await launchWithAuthor(launchId);
  if (!row || row.launch.status === "pulled" || row.author.standing !== "good") return fail(404, "That launch isn't here any more.");
  if (row.launch.status === "scheduled") return fail(400, "Comments open when this launches.");

  // The comment being answered, and the top-level comment the reply is filed under.
  let answered: typeof comments.$inferSelect | null = null;
  if (parentId) {
    [answered = null] = await db.select().from(comments).where(and(eq(comments.id, parentId), eq(comments.launchId, launchId))).limit(1);
    if (!answered || answered.removedAt || answered.hiddenAt) return fail(404, "The comment you're answering isn't here any more.");
  }
  const topId = answered ? answered.parentId ?? answered.id : null;

  const [made] = await db.insert(comments).values({ launchId, userId: viewer.id, parentId: topId, body, createdAt: now }).returning();
  if (!made) return fail(500, "That comment couldn't be saved.");
  const counts = await recomputeLaunch(launchId);

  // Momentum: an author answering a reader on their own launch, or joining in on someone else's.
  const [mine] = await db.select({ id: authors.id }).from(authors).where(eq(authors.userId, viewer.id)).limit(1);
  if (mine && mine.id === row.author.id) {
    if (answered && answered.userId !== viewer.id) await awardPoints(mine.id, "reply_on_own", { now, subject: made.id });
  } else if (mine) {
    await awardPoints(mine.id, "support_others", { now, subject: made.id });
  }

  const title = row.work ? row.work.title : row.author.name;
  const href = `${launchHref(row)}#comment-${made.id}`;
  const told = new Set<string>([viewer.id]);
  if (answered) {
    told.add(answered.userId);
    await notify({ userId: answered.userId, kind: "reply", title: `${viewer.displayName} replied to you on ${title}`, body: body.slice(0, 200), href, fromUserId: viewer.id });
  }
  if (!told.has(row.author.userId)) {
    told.add(row.author.userId);
    await notify({ userId: row.author.userId, kind: "comment", title: `${viewer.displayName} commented on ${title}`, body: body.slice(0, 200), href, fromUserId: viewer.id });
  }
  // An @handle that names a real page tells that author, once, unless they were already told above.
  const handles = [...new Set([...body.matchAll(/(?:^|[^\w@])@([a-z0-9][a-z0-9-]{1,30}[a-z0-9])/gi)].map((m) => (m[1] as string).toLowerCase()))].slice(0, 5);
  if (handles.length) {
    const named = await db.select({ userId: authors.userId }).from(authors).where(and(inArray(authors.handle, handles), eq(authors.standing, "good")));
    for (const n of named) {
      if (told.has(n.userId)) continue;
      told.add(n.userId);
      await notify({ userId: n.userId, kind: "reply", title: `${viewer.displayName} mentioned you on ${title}`, body: body.slice(0, 200), href, fromUserId: viewer.id });
    }
  }
  return json({ id: made.id, parentId: made.parentId, commentCount: counts.commentCount }, 201);
}
