/**
 * app/(site)/city/[slug]/page.tsx
 *
 * Authors based in one city, as they state it. A city exists here once one
 * public page names it; there is no list of cities to check against.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingData, landingMeta } from "@/lib/discover/landing";
import { directoryHref } from "@/lib/discover/params";
import { facets } from "@/lib/queries/directory";
import { Landing } from "@/components/discover/landing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const intro = (name: string) => `Authors based in ${name}, by Momentum. Find someone writing near you.`;

async function cityOf(slug: string) {
  const facet = await facets();
  const city = facet.cities.find((c) => c.slug === slug);
  if (!city) notFound();
  return { city, facet };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { city } = await cityOf(slug);
  return landingMeta({ title: `Authors in ${city.name}`, description: intro(city.name), path: `/city/${slug}`, total: city.count });
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const { city, facet } = await cityOf(slug);
  const { viewer, list } = await landingData({ city: slug });
  return (
    <Landing
      path={`/city/${slug}`} label="City" title={<>Authors in <span className="it">{city.name}</span></>} plainTitle={`Authors in ${city.name}`} intro={intro(city.name)}
      cards={list.cards} total={list.total} directoryHref={directoryHref({ city: slug })}
      siblings={{ heading: "Other cities", base: "/city", items: facet.cities.filter((c) => c.slug !== slug).slice(0, 14) }}
      empty={`No one based in ${city.name} has a page yet.`} viewer={viewer}
    />
  );
}
