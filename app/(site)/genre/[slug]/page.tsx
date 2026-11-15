/**
 * app/(site)/genre/[slug]/page.tsx
 *
 * One genre: its authors by Momentum, its recent works, and the other genres.
 * This is the page a search for "cozy mystery authors" should find.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingData, landingMeta, landingTotal } from "@/lib/discover/landing";
import { directoryHref } from "@/lib/discover/params";
import { facets, recentWorks } from "@/lib/queries/directory";
import { lookups } from "@/lib/queries/lookups";
import { Landing } from "@/components/discover/landing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const intro = (name: string) => `${name} authors on Author Hunt, and what they've launched lately.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = (await lookups()).genres.get(slug);
  if (!name) notFound();
  return landingMeta({ title: `${name} authors`, description: intro(name), path: `/genre/${slug}`, total: await landingTotal({ genre: slug }) });
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  const name = (await lookups()).genres.get(slug);
  if (!name) notFound();
  const [{ viewer, list }, works, facet] = await Promise.all([landingData({ genre: slug }), recentWorks({ genre: slug }, 8), facets()]);
  return (
    <Landing
      path={`/genre/${slug}`} label="Genre" title={name} plainTitle={`${name} authors`} intro={intro(name)}
      cards={list.cards} total={list.total} directoryHref={directoryHref({ genre: slug })}
      works={{ heading: `Recent in ${name}`, cards: works }}
      siblings={{ heading: "Other genres", base: "/genre", items: facet.genres.filter((g) => g.slug !== slug).slice(0, 14), all: { href: "/genre", label: "Every genre" } }}
      empty={`No one has a page under ${name} yet.`} viewer={viewer}
    />
  );
}
