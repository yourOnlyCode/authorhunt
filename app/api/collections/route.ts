/**
 * app/api/collections/route.ts
 *
 * Make a named collection. The one-press Save has its own route
 * (./save/route.ts), which also makes "Saved" the first time it's needed.
 */

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { freeSlug } from "@/lib/discover/collections";

const Body = z.object({ name: z.string().trim().min(1, "Give the collection a name.").max(60, "Keep the name under 60 characters.") });
const MAX_COLLECTIONS = 50;

export async function POST(req: Request) {
  const who = await signedIn(req, { name: "collection-new", max: 10, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;

  const [have] = await db.select({ n: sql<number>`count(*)::int` }).from(collections).where(eq(collections.userId, who.viewer.id));
  if (Number(have?.n ?? 0) >= MAX_COLLECTIONS) return fail(400, `A reader can keep ${MAX_COLLECTIONS} collections. Delete one to make another.`);
  const slug = await freeSlug(who.viewer.id, body.data.name);
  if (!slug) return fail(400, "That name needs at least one letter or number.");
  const [made] = await db.insert(collections).values({ userId: who.viewer.id, name: body.data.name, slug }).onConflictDoNothing().returning();
  if (!made) return fail(409, "You already have a collection with that name.");
  return json({ id: made.id, name: made.name, slug: made.slug }, 201);
}
