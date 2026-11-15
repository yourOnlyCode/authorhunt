/**
 * app/api/comments/[id]/route.ts
 *
 * A comment's writer can change it (it is then marked "edited") or take it
 * down. A removed comment keeps its row, so replies under it still have a
 * place to sit; the page shows "removed" where it was.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { recomputeLaunch } from "@/lib/actions/cheer";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { CommentBody, commentWithLaunch } from "../shared";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ body: CommentBody });

export async function PATCH(req: Request, { params }: Ctx) {
  const who = await signedIn(req, { name: "comment-edit", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const row = await commentWithLaunch((await params).id);
  if (!row || row.comment.removedAt) return fail(404, "That comment isn't here any more.");
  if (row.comment.userId !== who.viewer.id) return fail(403, "Only its writer can change a comment.");
  const parsed = await readBody(req, Body);
  if ("response" in parsed) return parsed.response;
  if (parsed.data.body === row.comment.body) return json({ ok: true, edited: false });
  await db.update(comments).set({ body: parsed.data.body, editedAt: new Date() }).where(eq(comments.id, row.comment.id));
  return json({ ok: true, edited: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const who = await signedIn(req, { name: "comment-edit", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const row = await commentWithLaunch((await params).id);
  if (!row || row.comment.removedAt) return fail(404, "That comment isn't here any more.");
  if (row.comment.userId !== who.viewer.id) return fail(403, "Only its writer can remove a comment.");
  await db.update(comments).set({ removedAt: new Date(), pinned: false }).where(eq(comments.id, row.comment.id));
  const counts = await recomputeLaunch(row.launch.id);
  return json({ ok: true, commentCount: counts.commentCount });
}
