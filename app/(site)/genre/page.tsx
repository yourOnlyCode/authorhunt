/**
 * app/(site)/genre/page.tsx
 *
 * Every genre, with how many authors write in it. Genres are a fixed list
 * kept by admins, so one with no authors yet is still shown: a reader should
 * see the whole shelf, and an author should see where there's room.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { facets } from "@/lib/queries/directory";
import { lookups } from "@/lib/queries/lookups";
import { ListJsonLd } from "@/components/discover/json-ld";

export const dynamic = "force-dynamic";

const TITLE = "Genres";
const DESCRIPTION = "Every genre on Author Hunt, with how many authors write in each.";

export async function generateMetadata(): Promise<Metadata> {
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/genre" }, openGraph: { title: TITLE, description: DESCRIPTION, url: "/genre" } };
}

export default async function GenresPage() {
  const [look, facet] = await Promise.all([lookups(), facets()]);
  const counts = new Map(facet.genres.map((g) => [g.slug, g.count]));
  const all = [...look.genres].map(([slug, name]) => ({ slug, name, count: counts.get(slug) ?? 0 })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="wrap index-page">
      <ListJsonLd name={TITLE} description={DESCRIPTION} path="/genre" items={all.map((g) => ({ name: g.name, path: `/genre/${g.slug}` }))} />
      <header className="page-head"><h1>Genres</h1><p>{DESCRIPTION}</p></header>
      <ul className="leaders">
        {all.map((g) => (
          <li key={g.slug}><Link href={`/genre/${g.slug}`}><span>{g.name}</span><i aria-hidden="true" /><b>{g.count} {g.count === 1 ? "author" : "authors"}</b></Link></li>
        ))}
      </ul>
      <p className="after"><Link className="word" href="/authors">All authors</Link></p>
    </div>
  );
}
