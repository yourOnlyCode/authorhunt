/**
 * app/(site)/inspired-by/[slug]/page.tsx
 *
 * Authors who name this writer as someone who shaped their work. The sibling
 * of "For readers of": that one is a promise to the reader, this one is the
 * author's own account of where they come from.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingData, landingMeta, landingTotal } from "@/lib/discover/landing";
import { directoryHref } from "@/lib/discover/params";
import { approvedReference, facets } from "@/lib/queries/directory";
import { Landing } from "@/components/discover/landing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const intro = (name: string) => `Authors on Author Hunt whose work was shaped by ${name}.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ref = await approvedReference(slug);
  if (!ref) notFound();
  return landingMeta({ title: `Authors inspired by ${ref.name}`, description: intro(ref.name), path: `/inspired-by/${slug}`, total: await landingTotal({ inspiredBy: slug }) });
}

export default async function InspiredByPage({ params }: Props) {
  const { slug } = await params;
  const ref = await approvedReference(slug);
  if (!ref) notFound();
  const [{ viewer, list }, facet] = await Promise.all([landingData({ inspiredBy: slug }), facets()]);
  const readers = facet.readersOf.find((r) => r.slug === slug);
  return (
    <Landing
      path={`/inspired-by/${slug}`} label="Inspired by" title={<>Inspired by <span className="it">{ref.name}</span></>} plainTitle={`Authors inspired by ${ref.name}`} intro={intro(ref.name)}
      cards={list.cards} total={list.total} directoryHref={directoryHref({ inspiredBy: slug })}
      siblings={{
        heading: "Inspired by others", base: "/inspired-by", items: facet.inspiredBy.filter((r) => r.slug !== slug).slice(0, 14),
        all: readers ? { href: `/for-readers-of/${slug}`, label: `For readers of ${ref.name}` } : undefined,
      }}
      empty={`No one has named ${ref.name} this way yet.`} viewer={viewer}
    />
  );
}
