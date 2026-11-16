/**
 * app/(site)/work/[slug]/opengraph-image.tsx
 *
 * The link preview for a work. Work marked Mature, or not public, gets a
 * card that names the site and nothing else (docs/product-structure.md,
 * section 5: mature work is left out of link preview cards).
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors, launches, works } from "@/lib/db/schema";
import { OG_SIZE, ogCard } from "@/components/author/og-card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A launch on Author Hunt";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db.select({ work: works, author: authors, status: launches.status }).from(works)
    .innerJoin(authors, eq(works.authorId, authors.id)).leftJoin(launches, eq(launches.workId, works.id)).where(eq(works.slug, slug)).limit(1);
  const open = row && row.author.standing === "good" && row.author.publishedAt && row.status !== "pulled" && !row.work.mature;
  if (!row || !open) return ogCard({ kicker: "Author Hunt", title: "Find your next favorite author", foot: "authorhunt.com" });
  return ogCard({ kicker: row.work.form, title: row.work.title, line: `by ${row.author.name}`, foot: `authorhunt.com/${row.author.handle}` });
}
