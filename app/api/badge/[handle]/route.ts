/**
 * app/api/badge/[handle]/route.ts
 *
 * The badge an author puts on their own site, linked to their page:
 * "Featured on Author Hunt", or "First of the day" once a launch of theirs
 * has led a day. It is the exchange that verifies a site (the author links
 * to us, we follow the link back), so it is a plain SVG that any page can
 * embed and any cache can hold. Square corners, ink, one red mark.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors, launches } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const handle = (await params).handle.toLowerCase().replace(/\.svg$/, "");
  const [author] = await db.select({ id: authors.id, standing: authors.standing, publishedAt: authors.publishedAt }).from(authors).where(eq(authors.handle, handle)).limit(1);
  if (!author || author.standing !== "good" || !author.publishedAt) return new Response("There is no badge at this address.\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const [first] = await db.select({ id: launches.id }).from(launches).where(and(eq(launches.authorId, author.id), eq(launches.rankDay, 1), eq(launches.status, "closed"))).limit(1);
  const top = first ? "FIRST OF THE DAY ON" : "FEATURED ON";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56" role="img" aria-label="${first ? "First of the day on Author Hunt" : "Featured on Author Hunt"}">
  <title>${first ? "First of the day on Author Hunt" : "Featured on Author Hunt"}</title>
  <rect x="1" y="1" width="238" height="54" fill="#FFFFFF" stroke="#111111" stroke-width="2"/>
  <rect x="16" y="16" width="24" height="24" fill="#D9361E"/>
  <rect x="22" y="22" width="12" height="12" fill="#FFFFFF"/>
  <text x="54" y="23" font-family="Georgia, 'Times New Roman', serif" font-size="10" font-weight="700" letter-spacing="1.6" fill="#111111">${top}</text>
  <text x="54" y="43" font-family="Georgia, 'Times New Roman', serif" font-size="21" font-style="italic" fill="#111111">Author Hunt</text>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } });
}
