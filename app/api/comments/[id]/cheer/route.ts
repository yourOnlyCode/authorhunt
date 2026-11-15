/**
 * app/api/comments/[id]/cheer/route.ts
 *
 * Cheer a comment, or take the cheer back. One account, one cheer (the
 * primary key), and never your own comment. The count is a column moved by
 * one on the write path. Comment cheers order the thread and nothing else:
 * they never enter a launch's score (docs/development.md, section 4).
 */

import { and, eq, sql } from "drizzle-orm";
import { fail, json, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { commentCheers, comments } from "@/lib/db/schema";
import { commentWithLaunch } from "../../shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await signedIn(req, { name: "comment-cheer", max: 60, windowSec: 60 });
  if ("response" in who) return who.response;
  const row = await commentWithLaunch((await params).id);
  if (!row || row.comment.removedAt || row.comment.hiddenAt) return fail(404, "That comment isn't here any more.");
  if (row.comment.userId === who.viewer.id) return fail(400, "You can't cheer your own comment.");

  const mine = and(eq(commentCheers.userId, who.viewer.id), eq(commentCheers.commentId, row.comment.id));
  const [existing] = await db.select().from(commentCheers).where(mine).limit(1);
  let step = 0;
  if (existing) {
    await db.delete(commentCheers).where(mine);
    step = -1;
  } else {
    const made = await db.insert(commentCheers).values({ userId: who.viewer.id, commentId: row.comment.id }).onConflictDoNothing().returning();
    step = made.length ? 1 : 0;
  }
  const [next] = await db.update(comments).set({ cheerCount: sql`greatest(${comments.cheerCount} + ${step}, 0)` }).where(eq(comments.id, row.comment.id)).returning({ count: comments.cheerCount });
  return json({ cheered: !existing, count: next?.count ?? 0 });
}
