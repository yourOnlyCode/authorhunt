/**
 * app/api/collections/[id]/route.ts
 *
 * Rename, share or delete a collection. Only its owner can; anyone else gets
 * the same "not found" as for a collection that doesn't exist, so the route
 * never confirms that a private collection is there.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { freeSlug, SAVED_SLUG, UUID } from "@/lib/discover/collections";

const Patch = z.object({
  name: z.string().trim().min(1, "Give the collection a name.").max(60, "Keep the name under 60 characters.").optional(),
  isPublic: z.boolean().optional(),
}).refine((b) => b.name !== undefined || b.isPublic !== undefined, "Nothing to change.");

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string, userId: string) {
  if (!UUID.test(id)) return null;
  const [row] = await db.select().from(collections).where(and(eq(collections.id, id), eq(collections.userId, userId))).limit(1);
  return row ?? null;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const who = await signedIn(req, { name: "collection-edit", max: 30, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Patch);
  if ("response" in body) return body.response;
  const collection = await owned((await params).id, who.viewer.id);
  if (!collection) return fail(404, "That collection isn't yours.");

  const set: { name?: string; slug?: string; isPublic?: boolean } = {};
  const { name, isPublic } = body.data;
  if (name !== undefined && name !== collection.name) {
    if (collection.slug === SAVED_SLUG) return fail(400, "Saved keeps its name, because Save puts things there. Make a new collection for another name.");
    const slug = await freeSlug(who.viewer.id, name, collection.id);
    if (!slug) return fail(400, "That name needs at least one letter or number.");
    set.name = name; set.slug = slug;
  }
  if (isPublic !== undefined) set.isPublic = isPublic;
  if (Object.keys(set).length === 0) return json({ id: collection.id, name: collection.name, slug: collection.slug, isPublic: collection.isPublic });
  const [saved] = await db.update(collections).set(set).where(eq(collections.id, collection.id)).returning();
  if (!saved) return fail(500, "That couldn't be saved.");
  return json({ id: saved.id, name: saved.name, slug: saved.slug, isPublic: saved.isPublic });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const who = await signedIn(req, { name: "collection-edit", max: 30, windowSec: 60 });
  if ("response" in who) return who.response;
  const collection = await owned((await params).id, who.viewer.id);
  if (!collection) return fail(404, "That collection isn't yours.");
  if (collection.slug === SAVED_SLUG) return fail(400, "Saved can't be deleted, because Save puts things there. You can take everything out of it.");
  await db.delete(collections).where(eq(collections.id, collection.id));
  return json({ ok: true });
}
