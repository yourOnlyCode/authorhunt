/**
 * app/(site)/platform/[slug]/page.tsx
 *
 * Works published through one platform (KDP, IngramSpark, a publisher, the
 * author's own site), and the authors behind them. A hidden platform, which
 * today is Lorec's own until its publishing is ready, has no page at all.
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

const intro = (name: string) => `Books and other work published through ${name}, and the authors who launched them here.`;

async function platformName(slug: string): Promise<string> {
  const look = await lookups();
  const name = look.platforms.get(slug);
  if (!name || look.hiddenPlatforms.has(slug)) notFound();
  return name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = await platformName(slug);
  return landingMeta({ title: `Published through ${name}`, description: intro(name), path: `/platform/${slug}`, total: await landingTotal({ platform: slug }) });
}

export default async function PlatformPage({ params }: Props) {
  const { slug } = await params;
  const name = await platformName(slug);
  const [{ viewer, list }, works, facet] = await Promise.all([landingData({ platform: slug }), recentWorks({ platform: slug }, 12), facets()]);
  return (
    <Landing
      path={`/platform/${slug}`} label="Published through" title={<>Published through <span className="it">{name}</span></>} plainTitle={`Published through ${name}`} intro={intro(name)}
      cards={list.cards} total={list.total} directoryHref={directoryHref({ platform: slug })}
      works={{ heading: "Recent launches", cards: works }}
      siblings={{ heading: "Published elsewhere", base: "/platform", items: facet.platforms.filter((p) => p.slug !== slug) }}
      empty={`Nothing published through ${name} has launched here yet.`} viewer={viewer}
    />
  );
}
