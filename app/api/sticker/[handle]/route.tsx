/**
 * app/api/sticker/[handle]/route.tsx
 *
 * A sticker to lay over a video: the short link, large enough to read on a
 * phone, in two shapes (?shape=wide, the default, or tall). Reels and TikTok
 * allow no link a viewer can press, so the sticker is a picture of an address
 * that is easy to type (docs/development.md, Sharing a page on video).
 * White ground, a 2px ink border, square corners.
 */

import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";

const SHAPES = { wide: { width: 900, height: 300 }, tall: { width: 540, height: 720 } } as const;

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const handle = (await params).handle.toLowerCase().replace(/\.png$/, "");
  const [author] = await db.select({ handle: authors.handle, standing: authors.standing, publishedAt: authors.publishedAt }).from(authors).where(eq(authors.handle, handle)).limit(1);
  if (!author || author.standing !== "good" || !author.publishedAt) return new Response("There is no sticker at this address.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

  const tall = new URL(req.url).searchParams.get("shape") === "tall";
  const shape = tall ? SHAPES.tall : SHAPES.wide;
  const link = `authorhunt.com/${author.handle}`;
  // The address is the point of the sticker, so it is as large as its length allows.
  const linkSize = Math.min(tall ? 64 : 72, Math.floor(((tall ? 440 : 760) / link.length) * 1.75));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFFFF", border: "2px solid #111111", color: "#111111", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: tall ? 44 : 36, textAlign: "center" }}>
        <div style={{ width: tall ? 40 : 28, height: tall ? 40 : 28, background: "#D9361E", display: "flex" }} />
        <div style={{ display: "flex", marginTop: tall ? 44 : 22, fontSize: tall ? 40 : 34, letterSpacing: 3, textTransform: "uppercase" }}>Find me on Author Hunt</div>
        <div style={{ display: "flex", marginTop: tall ? 40 : 20, fontSize: linkSize, lineHeight: 1.1, borderBottom: "4px solid #D9361E", paddingBottom: 8 }}>{link}</div>
      </div>
    ),
    { ...shape, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } },
  );
}
