/**
 * lib/discover/collections.ts
 *
 * Reading and naming collections. A collection is a reader's own list of
 * authors and works: private until they share it, and never a public signal
 * (a save earns no points and moves no rank, docs/development.md section 5).
 *
 * "Saved" is the collection Save writes to in one press, found by its slug.
 * It keeps its name and can't be deleted, so that press always has somewhere
 * to land.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { collectionItems, collections, users, type Collection } from "../db/schema";
import { slugify } from "../slug";
import { authorCardsByIds, workCardsByIds, type AuthorCard, type WorkCard } from "../queries/directory";

export const SAVED_SLUG = "saved";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CollectionSummary = { id: string; name: string; slug: string; isPublic: boolean; itemCount: number; ownerName: string };

// No column holds a collection's size, so it is counted here; a reader has a handful of collections.
const itemCount = sql<number>`(select count(*)::int from collection_items ci where ci.collection_id = ${collections.id})`;
const summary = { id: collections.id, name: collections.name, slug: collections.slug, isPublic: collections.isPublic, itemCount, ownerName: users.displayName };

export async function collectionsOf(userId: string): Promise<CollectionSummary[]> {
  const rows = await db.select(summary).from(collections).innerJoin(users, eq(users.id, collections.userId))
    .where(eq(collections.userId, userId)).orderBy(sql`${collections.slug} = ${SAVED_SLUG} desc`, collections.createdAt);
  return rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) }));
}

/** Collections their owners have shared, newest first, leaving out empty ones. */
export async function sharedCollections(limit = 12): Promise<CollectionSummary[]> {
  const rows = await db.select(summary).from(collections).innerJoin(users, eq(users.id, collections.userId))
    .where(and(eq(collections.isPublic, true), eq(users.standing, "good"), sql`exists (select 1 from collection_items ci where ci.collection_id = ${collections.id})`))
    .orderBy(desc(collections.createdAt)).limit(limit);
  return rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) }));
}

export type CollectionView = {
  collection: Collection;
  ownerName: string;
  ownerStanding: string;
  authors: (AuthorCard & { itemId: string })[];
  works: (WorkCard & { itemId: string })[];
};

/** A collection and what is in it, newest save first. Items whose page is no longer public are left out. */
export async function collectionView(id: string, viewerId: string | null): Promise<CollectionView | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db.select({ collection: collections, ownerName: users.displayName, ownerStanding: users.standing })
    .from(collections).innerJoin(users, eq(users.id, collections.userId)).where(eq(collections.id, id)).limit(1);
  if (!row) return null;
  const items = await db.select().from(collectionItems).where(eq(collectionItems.collectionId, id)).orderBy(desc(collectionItems.createdAt));
  const authorItem = new Map(items.filter((i) => i.authorId).map((i) => [i.authorId as string, i.id]));
  const workItem = new Map(items.filter((i) => i.workId).map((i) => [i.workId as string, i.id]));
  const [authorCards, workCards] = await Promise.all([authorCardsByIds([...authorItem.keys()], viewerId), workCardsByIds([...workItem.keys()])]);
  return {
    ...row,
    authors: authorCards.map((c) => ({ ...c, itemId: authorItem.get(c.id) as string })),
    works: workCards.map((c) => ({ ...c, itemId: workItem.get(c.id) as string })),
  };
}

/** A slug for this name that the reader doesn't already use: "local-authors", then "local-authors-2". */
export async function freeSlug(userId: string, name: string, exceptId?: string): Promise<string | null> {
  const base = slugify(name);
  if (!base) return null;
  const taken = new Set((await db.select({ id: collections.id, slug: collections.slug }).from(collections).where(eq(collections.userId, userId)))
    .filter((c) => c.id !== exceptId).map((c) => c.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 200; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return null;
}
