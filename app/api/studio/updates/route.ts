/**
 * POST and DELETE /api/studio/updates
 *
 * A short post from an author: progress, a cover, an event, an excerpt, news.
 * Free. The first one each day earns Momentum (the ledger keeps it to one a
 * day), and followers hear of it once: updates from one author on one day
 * share a group key, so they are one line in the bell and in the evening email.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { awardPoints } from "@/lib/actions/points";
import { fail, json } from "@/lib/api";
import { db } from "@/lib/db";
import { updates, works } from "@/lib/db/schema";
import { launchDay } from "@/lib/ranking/day";
import { LIMITS, UPDATE_KIND_VALUES } from "@/lib/studio/rules";
import { notPublicReason, readInput, studioAuthor, tellFollowers } from "@/lib/studio/server";

const Body = z.object({
  kind: z.enum(UPDATE_KIND_VALUES).default("news"),
  body: z.string().trim().min(1, "Write something first.").max(LIMITS.updateBody, `Keep an update under ${LIMITS.updateBody} characters.`),
  workId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request) {
  const who = await studioAuthor(req, { name: "studio-update", max: 10, windowSec: 600 });
  if ("response" in who) return who.response;
  const { author } = who;
  const body = await readInput(req, Body);
  if ("response" in body) return body.response;
  const blocked = notPublicReason(author);
  if (blocked) return fail(409, blocked);
  const now = new Date();

  let workId: string | null = null;
  if (body.data.workId) {
    const [work] = await db.select({ id: works.id }).from(works).where(and(eq(works.id, body.data.workId), eq(works.authorId, author.id))).limit(1);
    if (!work) return fail(404, "That work wasn't found.");
    workId = work.id;
  }

  const update = (await db.insert(updates).values({ authorId: author.id, workId, kind: body.data.kind, body: body.data.body }).returning())[0]!;
  const earned = await awardPoints(author.id, "post_update", { now, subject: update.id });
  const text = body.data.body.replace(/\s+/g, " ");
  await tellFollowers(author, {
    kind: "followed_update",
    title: `${author.name} posted an update`,
    body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
    href: `/author/${author.handle}`,
    groupKey: `update:${author.id}:${launchDay(now)}`,
  });
  return json({ update, earned }, 201);
}

export async function DELETE(req: Request) {
  const who = await studioAuthor(req, { name: "studio-update", max: 10, windowSec: 600 });
  if ("response" in who) return who.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return fail(404, "That update wasn't found.");
  const gone = await db.delete(updates).where(and(eq(updates.id, id), eq(updates.authorId, who.author.id))).returning({ id: updates.id });
  if (gone.length === 0) return fail(404, "That update wasn't found.");
  return json({ deleted: true });
}
