/**
 * app/api/comments/shared.ts
 *
 * What every comment route needs first: the comment, the launch it is on and
 * who that launch belongs to. Kept in one place so each route's permission
 * check reads the same facts.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { authors, comments, launches, works } from "@/lib/db/schema";

export const CommentBody = z.string().trim().min(1, "Write something first.").max(4000, "That's longer than a comment can be (4,000 characters).");

const Id = z.string().uuid();

/** Where a launch lives, for links in notifications. */
export function launchHref(row: { work: { slug: string } | null; author: { handle: string } }): string {
  return row.work ? `/work/${row.work.slug}` : `/author/${row.author.handle}`;
}

export async function launchWithAuthor(launchId: string) {
  const [row] = await db.select({ launch: launches, author: authors, work: works }).from(launches)
    .innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
    .where(eq(launches.id, launchId)).limit(1);
  return row ?? null;
}

export async function commentWithLaunch(rawId: string) {
  const id = Id.safeParse(rawId);
  if (!id.success) return null;
  const [row] = await db.select({ comment: comments, launch: launches, author: authors, work: works }).from(comments)
    .innerJoin(launches, eq(comments.launchId, launches.id)).innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
    .where(eq(comments.id, id.data)).limit(1);
  return row ?? null;
}
