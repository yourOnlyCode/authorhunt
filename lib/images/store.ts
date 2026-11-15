/**
 * lib/images/store.ts
 *
 * Portraits, covers and gallery pictures (docs/development.md, Images).
 * A picture's type is read from its own bytes, never its name. Every one is
 * turned upright, has its metadata dropped (a photo's EXIF data can carry
 * where it was taken) and is stored as WebP at the size pages use. Files go
 * to Vercel Blob when it's configured and to public/uploads otherwise, so
 * uploads work in development with nothing set up. Removing a picture removes
 * the file, not only the row.
 */

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../db";
import { images } from "../db/schema";
import { blobEnabled } from "../env";

export type ImageKind = "portrait" | "cover" | "gallery";
export const IMAGE_KINDS: ImageKind[] = ["portrait", "cover", "gallery"];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** JPEG, PNG or WebP, told from the first bytes of the file. Anything else is null. */
export function sniffImage(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

export class ImageError extends Error {}

export type Processed = { data: Buffer; width: number; height: number };

/**
 * A portrait is cropped to 4:5 at up to 800 wide. A cover is fitted inside
 * 960 by 1440 and keeps its own shape: never stretched, never cropped. A
 * gallery picture is at most 1600 on its long side. Nothing is enlarged.
 */
export async function processImage(input: Buffer, kind: ImageKind): Promise<Processed> {
  try {
    // Turned upright first, in its own pass, so the sizes below are the sizes as seen.
    const upright = await sharp(input, { limitInputPixels: 60_000_000 }).rotate().toBuffer({ resolveWithObject: true });
    let pipeline = sharp(upright.data);
    if (kind === "portrait") {
      const width = Math.min(800, upright.info.width, Math.floor(upright.info.height * 0.8));
      pipeline = pipeline.resize(Math.max(width, 1), Math.max(Math.round(width * 1.25), 1), { fit: "cover", position: "attention" });
    } else if (kind === "cover") {
      pipeline = pipeline.resize(960, 1440, { fit: "inside", withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize(1600, 1600, { fit: "inside", withoutEnlargement: true });
    }
    // sharp writes no metadata unless asked to, which is what strips the EXIF data.
    const out = await pipeline.webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    return { data: out.data, width: out.info.width, height: out.info.height };
  } catch {
    throw new ImageError("That picture couldn't be read. Try saving it again as a JPEG or PNG.");
  }
}

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");
const LOCAL_NAME = /^\/uploads\/([a-f0-9]{32}\.webp)$/;

async function putFile(name: string, data: Buffer): Promise<string> {
  if (blobEnabled) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${name}`, data, { access: "public", contentType: "image/webp", addRandomSuffix: false });
    return blob.url;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), data);
  return `/uploads/${name}`;
}

async function deleteFile(url: string): Promise<void> {
  const local = LOCAL_NAME.exec(url);
  if (local) {
    // The name is matched against the pattern above, so it can't point outside the folder.
    await unlink(path.join(LOCAL_DIR, local[1]!)).catch(() => undefined);
    return;
  }
  if (blobEnabled && /^https:\/\//.test(url)) {
    const { del } = await import("@vercel/blob");
    await del(url).catch((e) => console.error("[images] couldn't delete", url, e));
  }
}

/** Check, process and store one uploaded file, and record it. */
export async function saveImage(input: { ownerUserId: string; kind: ImageKind; bytes: Buffer }): Promise<{ id: string; url: string; width: number; height: number }> {
  if (input.bytes.length > MAX_UPLOAD_BYTES) throw new ImageError("That file is over 8 MB. Choose a smaller one.");
  if (!sniffImage(input.bytes)) throw new ImageError("That isn't a JPEG, PNG or WebP picture.");
  const done = await processImage(input.bytes, input.kind);
  const url = await putFile(`${randomBytes(16).toString("hex")}.webp`, done.data);
  const row = (await db.insert(images).values({ ownerUserId: input.ownerUserId, kind: input.kind, url, width: done.width, height: done.height, bytes: done.data.length }).returning())[0]!;
  return { id: row.id, url, width: done.width, height: done.height };
}

/** Remove one of a person's own pictures: the file, then the row's mark. False if it isn't theirs or is already gone. */
export async function removeImage(ownerUserId: string, url: string): Promise<boolean> {
  const [row] = await db.select().from(images).where(and(eq(images.ownerUserId, ownerUserId), eq(images.url, url), isNull(images.removedAt))).limit(1);
  if (!row) return false;
  await deleteFile(row.url);
  await db.update(images).set({ removedAt: new Date() }).where(eq(images.id, row.id));
  return true;
}

/** Remove the pictures that a save replaced or dropped. */
export async function removeImages(ownerUserId: string, urls: (string | null | undefined)[]): Promise<void> {
  for (const url of urls) if (url) await removeImage(ownerUserId, url);
}
