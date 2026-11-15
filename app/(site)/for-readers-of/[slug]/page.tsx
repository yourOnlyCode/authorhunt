/**
 * app/(site)/for-readers-of/[slug]/page.tsx
 *
 * Authors who say "if you like this writer, try me". It is what a reader's
 * search for "authors like Ursula K. Le Guin" should find. A name an author
 * typed in has no page until an admin approves it (lib/db/schema).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingData, landingMeta, landingTotal } from "@/lib/discover/landing";
import { directoryHref } from "@/lib/discover/params";
import { approvedReference, facets } from "@/lib/queries/directory";
import { Landing } from "@/components/discover/landing";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

const intro = (name: string) => `Authors on Author Hunt who say: if you like ${name}, try me.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ref = await approvedReference(slug);
  if (!ref) notFound();
  return landingMeta({ title: `For readers of ${ref.name}`, description: intro(ref.name), path: `/for-readers-of/${slug}`, total: await landingTotal({ readersOf: slug }) });
}

export default async function ForReadersOfPage({ params }: Props) {
  const { slug } = await params;
  const ref = await approvedReference(slug);
  if (!ref) notFound();
  const [{ viewer, list }, facet] = await Promise.all([landingData({ readersOf: slug }), facets()]);
  const inspired = facet.inspiredBy.find((r) => r.slug === slug);
  return (
    <Landing
      path={`/for-readers-of/${slug}`} label="For readers of" title={<>For readers of <span className="it">{ref.name}</span></>} plainTitle={`For readers of ${ref.name}`} intro={intro(ref.name)}
      cards={list.cards} total={list.total} directoryHref={directoryHref({ readersOf: slug })}
      siblings={{
        heading: "Readers of others", base: "/for-readers-of", items: facet.readersOf.filter((r) => r.slug !== slug).slice(0, 14),
        all: inspired ? { href: `/inspired-by/${slug}`, label: `Authors inspired by ${ref.name}` } : { href: "/for-readers-of", label: "Every name" },
      }}
      empty={`No one has named ${ref.name} this way yet.`} viewer={viewer}
    />
  );
}
