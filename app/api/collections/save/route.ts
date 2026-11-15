import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { collectionItems, collections } from "@/lib/db/schema";

const Body = z.object({ authorId: z.string().uuid().optional(), workId: z.string().uuid().optional(), collectionId: z.string().uuid().optional() })
  .refine((b) => Boolean(b.authorId) !== Boolean(b.workId), "Save one author or one work.");

/** Put an author or a work in a collection, or take it out. With no collection named it's the reader's "Saved", made on first use. */
export async function POST(req: Request) {
  const who = await signedIn(req, { name: "save", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { authorId, workId, collectionId } = body.data;

  let [collection] = collectionId
    ? await db.select().from(collections).where(and(eq(collections.id, collectionId), eq(collections.userId, who.viewer.id))).limit(1)
    : await db.select().from(collections).where(and(eq(collections.userId, who.viewer.id), eq(collections.slug, "saved"))).limit(1);
  if (!collection && collectionId) return fail(404, "That collection isn't yours.");
  if (!collection) [collection] = await db.insert(collections).values({ userId: who.viewer.id, name: "Saved", slug: "saved" }).onConflictDoNothing().returning();
  if (!collection) return fail(500, "The collection couldn't be made.");

  const match = and(eq(collectionItems.collectionId, collection.id), authorId ? eq(collectionItems.authorId, authorId) : eq(collectionItems.workId, workId as string));
  const [existing] = await db.select().from(collectionItems).where(match).limit(1);
  if (existing) await db.delete(collectionItems).where(eq(collectionItems.id, existing.id));
  else await db.insert(collectionItems).values({ collectionId: collection.id, authorId: authorId ?? null, workId: workId ?? null });
  return json({ saved: !existing, collectionId: collection.id });
}
