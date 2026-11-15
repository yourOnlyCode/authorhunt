/**
 * app/[handle]/route.ts
 *
 * The short link: authorhunt.com/maren, easy to read aloud and to put in a
 * profile (docs/development.md, Sharing a page on video). It answers only for
 * a handle that exists, with a permanent redirect to the author's page, and
 * keeps ?via= so the author's analytics still say where the reader came
 * from. Real routes (/authors, /pricing) are static segments, which Next
 * matches before this one; lib/slug.ts keeps those names from being handles.
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const handle = (await params).handle.toLowerCase();
  const found = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(handle)
    ? (await db.select({ handle: authors.handle, standing: authors.standing }).from(authors).where(eq(authors.handle, handle)).limit(1))[0]
    : undefined;
  if (!found || found.standing !== "good") return new NextResponse("There is no page at this address.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const to = new URL(`/author/${found.handle}`, req.url);
  const via = new URL(req.url).searchParams.get("via");
  if (via) to.searchParams.set("via", via);
  return NextResponse.redirect(to, 308);
}
