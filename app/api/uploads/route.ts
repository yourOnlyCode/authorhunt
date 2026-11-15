/**
 * POST and DELETE /api/uploads
 *
 * POST takes one picture (multipart: file, and kind = portrait, cover or
 * gallery), checks and resizes it (lib/images/store.ts) and answers with its
 * address. Signed-in accounts only, thirty a day. DELETE ?url= removes one of
 * the person's own pictures that nothing shows any more: the form uses it for
 * a picture uploaded and then replaced before saving. A picture a page or a
 * work still shows is removed by saving the form without it.
 */

import { eq } from "drizzle-orm";
import { fail, json, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { authors, works } from "@/lib/db/schema";
import { ImageError, IMAGE_KINDS, MAX_UPLOAD_BYTES, removeImage, saveImage, type ImageKind } from "@/lib/images/store";

export async function POST(req: Request) {
  const who = await signedIn(req, { name: "upload", max: 30, windowSec: 86_400 });
  if ("response" in who) return who.response;
  // Turned away by its stated size before the body is read, where the size is stated.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 100_000) return fail(413, "That file is over 8 MB. Choose a smaller one.");
  let form: FormData;
  try { form = await req.formData(); } catch { return fail(400, "That upload couldn't be read."); }
  const kind = String(form.get("kind") ?? "");
  if (!IMAGE_KINDS.includes(kind as ImageKind)) return fail(400, "Say what the picture is for: a portrait, a cover or a gallery.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Choose a picture to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "That file is over 8 MB. Choose a smaller one.");
  try {
    const image = await saveImage({ ownerUserId: who.viewer.id, kind: kind as ImageKind, bytes: Buffer.from(await file.arrayBuffer()) });
    return json({ image }, 201);
  } catch (e) {
    if (e instanceof ImageError) return fail(400, e.message);
    throw e;
  }
}

export async function DELETE(req: Request) {
  const who = await signedIn(req, { name: "upload-remove", max: 60, windowSec: 600 });
  if ("response" in who) return who.response;
  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!url) return fail(400, "Say which picture.");
  const [author] = await db.select().from(authors).where(eq(authors.userId, who.viewer.id)).limit(1);
  if (author) {
    const theirs = await db.select({ coverUrl: works.coverUrl, gallery: works.gallery }).from(works).where(eq(works.authorId, author.id));
    const shown = author.portraitUrl === url || theirs.some((w) => w.coverUrl === url || w.gallery.some((g) => g.url === url));
    if (shown) return fail(409, "That picture is in use. Save the form without it and it's removed.");
  }
  const removed = await removeImage(who.viewer.id, url);
  return removed ? json({ removed: true }) : fail(404, "That picture wasn't found.");
}
