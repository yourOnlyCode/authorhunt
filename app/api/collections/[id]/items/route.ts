/**
 * app/api/collections/[id]/items/route.ts
 *
 * Take one item out of a collection, by the item's own id. Adding goes
 * through the save route, which the Save button already calls.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { collectionItems, collections } from "@/lib/db/schema";
import { UUID } from "@/lib/discover/collections";

const Body = z.object({ itemId: z.string().uuid() });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await signedIn(req, { name: "collection-edit", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { id } = await params;
  const [collection] = UUID.test(id)
    ? await db.select().from(collections).where(and(eq(collections.id, id), eq(collections.userId, who.viewer.id))).limit(1)
    : [];
  if (!collection) return fail(404, "That collection isn't yours.");
  const removed = await db.delete(collectionItems).where(and(eq(collectionItems.id, body.data.itemId), eq(collectionItems.collectionId, collection.id))).returning({ id: collectionItems.id });
  if (removed.length === 0) return fail(404, "That isn't in this collection.");
  return json({ ok: true });
}
