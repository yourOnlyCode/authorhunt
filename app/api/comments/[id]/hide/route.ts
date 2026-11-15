/**
 * app/api/comments/[id]/hide/route.ts
 *
 * A launch's author can hide a comment on their own launch from the public
 * view (POST), and show it again (DELETE). Hiding is logged and put in the
 * review queue, so it can't be used to bury fair criticism without a person
 * seeing it (docs/product-structure.md, section 2).
 */

import { eq } from "drizzle-orm";
import { fail, json, signedIn } from "@/lib/api";
import { recomputeLaunch } from "@/lib/actions/cheer";
import { db } from "@/lib/db";
import { comments, moderationLog, reports } from "@/lib/db/schema";
import { commentWithLaunch } from "../../shared";

type Ctx = { params: Promise<{ id: string }> };

async function setHidden(req: Request, { params }: Ctx, hide: boolean) {
  const who = await signedIn(req, { name: "comment-hide", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const row = await commentWithLaunch((await params).id);
  if (!row || row.comment.removedAt) return fail(404, "That comment isn't here any more.");
  if (row.author.userId !== who.viewer.id) return fail(403, "Only the launch's author can hide a comment on it.");
  if (row.comment.userId === who.viewer.id) return fail(400, "This is your own comment. You can remove it instead.");
  if (Boolean(row.comment.hiddenAt) === hide) return json({ hidden: hide });

  await db.update(comments).set({ hiddenAt: hide ? new Date() : null }).where(eq(comments.id, row.comment.id));
  await db.insert(moderationLog).values({ actorId: who.viewer.id, action: hide ? "comment_hidden_by_author" : "comment_shown_by_author", targetKind: "comment", targetId: row.comment.id });
  if (hide) await db.insert(reports).values({ reporterId: who.viewer.id, targetKind: "comment", targetId: row.comment.id, reason: "other", note: "Hidden by the launch's author. Check that it wasn't fair criticism." });
  const counts = await recomputeLaunch(row.launch.id);
  return json({ hidden: hide, commentCount: counts.commentCount });
}

export const POST = (req: Request, ctx: Ctx) => setHidden(req, ctx, true);
export const DELETE = (req: Request, ctx: Ctx) => setHidden(req, ctx, false);
