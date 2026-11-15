/**
 * PUT and DELETE /api/studio/works/[id]
 *
 * Changes one of the signed-in author's works, or deletes one that has never
 * been on a board. A work that has launched keeps its address and can't be
 * deleted: its launch, cheers and comments belong to the day's record.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json } from "@/lib/api";
import { db } from "@/lib/db";
import { launches, moderationLog, works } from "@/lib/db/schema";
import { removeImages } from "@/lib/images/store";
import { readInput, studioAuthor } from "@/lib/studio/server";
import { droppedImages, uniqueWorkSlug, WorkBody, workValues } from "@/lib/studio/work-input";

type Ctx = { params: Promise<{ id: string }> };

async function find(req: Request, ctx: Ctx) {
  const who = await studioAuthor(req, { name: "studio-work", max: 30, windowSec: 60 });
  if ("response" in who) return who;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return { response: fail(404, "That work wasn't found.") };
  const [work] = await db.select().from(works).where(and(eq(works.id, id), eq(works.authorId, who.author.id))).limit(1);
  if (!work) return { response: fail(404, "That work wasn't found.") };
  const [launch] = await db.select().from(launches).where(eq(launches.workId, work.id)).limit(1);
  return { ...who, work, launch: launch ?? null };
}

export async function PUT(req: Request, ctx: Ctx) {
  const found = await find(req, ctx);
  if ("response" in found) return found.response;
  const { viewer, work, launch } = found;
  const body = await readInput(req, WorkBody);
  if ("response" in body) return body.response;
  const checked = await workValues(body.data, viewer.id, work);
  if ("error" in checked) return fail(400, checked.error);
  // The address follows the title only until the work has a launch; after that links to it must keep working.
  const slug = !launch && body.data.title !== work.title ? await uniqueWorkSlug(body.data.title, work.id) : work.slug;
  const saved = (await db.update(works).set({ ...checked.values, slug }).where(eq(works.id, work.id)).returning())[0]!;
  await removeImages(viewer.id, droppedImages(work, saved));
  if (work.aiUse && saved.aiUse !== work.aiUse) {
    await db.insert(moderationLog).values({ actorId: viewer.id, action: "declaration_changed", targetKind: "work", targetId: work.id, note: `${work.aiUse} to ${saved.aiUse}` });
  }
  return json({ work: saved });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const found = await find(req, ctx);
  if ("response" in found) return found.response;
  const { viewer, work, launch } = found;
  if (launch) return fail(409, launch.status === "scheduled" ? "This has a launch set. Cancel the launch first." : "This has launched, so it stays. You can still change its details.");
  // A public page needed a link or a work to go public, and keeps one.
  if (found.author.publishedAt && !found.author.website && found.author.links.length === 0) {
    const all = await db.select({ id: works.id }).from(works).where(eq(works.authorId, found.author.id)).limit(2);
    if (all.length < 2) return fail(409, "A public page needs a link or a work. Add a link to your page first, then delete this.");
  }
  await db.delete(works).where(eq(works.id, work.id));
  await removeImages(viewer.id, droppedImages(work, { coverUrl: null, gallery: [] }));
  return json({ deleted: true });
}
