/**
 * app/api/comments/[id]/pin/route.ts
 *
 * The author's note: a launch's author pins one comment of their own first,
 * or takes the pin off. Pinning one unpins any other on that launch.
 */

import { and, eq } from "drizzle-orm";
import { fail, json, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { commentWithLaunch } from "../../shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await signedIn(req, { name: "comment-pin", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const row = await commentWithLaunch((await params).id);
  if (!row || row.comment.removedAt) return fail(404, "That comment isn't here any more.");
  if (row.author.userId !== who.viewer.id) return fail(403, "Only the launch's author can pin a comment.");
  if (row.comment.userId !== who.viewer.id) return fail(400, "The pinned comment is your own note. Pin one you wrote.");
  if (row.comment.parentId) return fail(400, "A reply can't be pinned. Pin a comment of its own.");

  const pinned = !row.comment.pinned;
  if (pinned) await db.update(comments).set({ pinned: false }).where(and(eq(comments.launchId, row.launch.id), eq(comments.pinned, true)));
  await db.update(comments).set({ pinned }).where(eq(comments.id, row.comment.id));
  return json({ pinned });
}
