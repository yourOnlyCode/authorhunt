/**
 * app/(site)/author/[handle]/opengraph-image.tsx
 *
 * The link preview for an author's page. A page marked Mature, or not
 * public, gets a card that names the site and nothing else.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";
import { lookups } from "@/lib/queries/lookups";
import { OG_SIZE, ogCard } from "@/components/author/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "An author on Author Hunt";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [author] = await db.select().from(authors).where(eq(authors.handle, handle.toLowerCase())).limit(1);
  if (!author || author.standing !== "good" || !author.publishedAt || author.mature) return ogCard({ kicker: "Author Hunt", title: "Find your next favourite author", foot: "authorhunt.com" });
  const look = await lookups();
  const genre = author.genres[0] ? look.genres.get(author.genres[0]) : null;
  const kicker = [genre, author.city].filter(Boolean).join("  ·  ") || (author.kind === "publication" ? "A publication" : "An author");
  return ogCard({ kicker, title: author.name, line: author.tagline || undefined, foot: `authorhunt.com/${author.handle}` });
}
