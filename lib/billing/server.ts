/**
 * lib/billing/server.ts
 *
 * Loads the facts lib/billing/access.ts decides on. The rule stays pure and
 * tested there; this file only reads the database.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { comps, subscriptions, type Author } from "../db/schema";
import { authorAccess, hasMemberTools, type Access } from "./access";

export async function accessFor(author: Pick<Author, "id" | "userId" | "trialEndsAt">, now: Date = new Date()): Promise<Access> {
  const [[sub], [comp]] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1),
    db.select().from(comps).where(eq(comps.userId, author.userId)).orderBy(desc(comps.createdAt)).limit(1),
  ]);
  return authorAccess({
    trialEndsAt: author.trialEndsAt,
    subscription: sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null,
    comp: comp ? { until: comp.until } : null,
  }, now);
}

export async function isMember(author: Pick<Author, "id" | "userId" | "trialEndsAt">, now: Date = new Date()): Promise<boolean> {
  return hasMemberTools(await accessFor(author, now));
}
