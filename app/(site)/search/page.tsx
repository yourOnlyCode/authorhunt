/**
 * app/(site)/search/page.tsx
 *
 * The header's search line lands here. One query looks across authors (name,
 * tagline, city), works (title, tagline) and the filter values themselves
 * (genres, cities, reference authors), which answer with a link to their own
 * page. With nothing typed it offers places to start. Results pages are kept
 * out of search engines: they are the reader's words, not a page of ours.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, sql } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors } from "@/lib/db/schema";
import { authorCards, directory, facets, likePattern, publicAuthor, recentWorks } from "@/lib/queries/directory";
import { AuthorRow } from "@/components/discover/author-row";
import { WorkRow } from "@/components/discover/work-row";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string | string[] }> };

const read = (q: string | string[] | undefined) => ((Array.isArray(q) ? q[0] : q) ?? "").trim().slice(0, 80);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = read((await searchParams).q);
  return {
    title: q ? `Search: ${q}` : "Search",
    description: "Search Author Hunt for authors, books, genres and cities.",
    alternates: { canonical: "/search" },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = read((await searchParams).q);
  const viewer = await getViewer();
  const signedIn = Boolean(viewer);
  const hideMature = !viewer?.adultConfirmedAt;
  const facet = await facets();

  const form = (
    <form className="search-form" action="/search" role="search">
      <label className="visually-hidden" htmlFor="search-q">Search</label>
      <input className="input" id="search-q" name="q" type="search" defaultValue={q} placeholder="An author, a title, a genre, a city" />
      <button className="btn solid" type="submit">Search</button>
    </form>
  );

  if (!q) {
    const top = await directory({}, { viewerId: viewer?.id ?? null, limit: 5, now: new Date() });
    return (
      <div className="wrap search-page">
        <header className="page-head"><h1>Search</h1><p>Look for an author, a title, a genre or a city.</p>{form}</header>
        <section className="sec">
          <header><h2>Start with a genre</h2></header>
          <div className="genres">{facet.genres.slice(0, 16).map((g) => <Link key={g.slug} href={`/genre/${g.slug}`}>{g.name}</Link>)}</div>
        </section>
        {facet.readersOf.length > 0 && (
          <section className="sec">
            <header><h2>Or a writer you love</h2></header>
            <div className="genres">{facet.readersOf.slice(0, 12).map((r) => <Link key={r.slug} href={`/for-readers-of/${r.slug}`}>For readers of {r.name}</Link>)}</div>
          </section>
        )}
        {top.cards.length > 0 && (
          <section className="sec">
            <header><h2>Rising authors</h2></header>
            <ol>{top.cards.map((card) => <AuthorRow key={card.id} card={card} signedIn={signedIn} viewerId={viewer?.id} hideMature={hideMature} />)}</ol>
            <Link className="more word" href="/authors">All authors</Link>
          </section>
        )}
      </div>
    );
  }

  const pattern = likePattern(q);
  const lower = q.toLowerCase();
  const has = (name: string) => name.toLowerCase().includes(lower);
  const [people, works] = await Promise.all([
    db.select().from(authors)
      .where(and(publicAuthor(), sql`(${authors.name} ilike ${pattern} or ${authors.tagline} ilike ${pattern} or ${authors.city} ilike ${pattern})`))
      .orderBy(desc(authors.momentum)).limit(20),
    recentWorks({ q }, 20),
  ]);
  const cards = await authorCards(people, viewer?.id ?? null);
  const places = [
    ...facet.genres.filter((g) => has(g.name)).map((g) => ({ href: `/genre/${g.slug}`, label: g.name, what: "Genre", count: g.count })),
    ...facet.cities.filter((c) => has(c.name)).map((c) => ({ href: `/city/${c.slug}`, label: c.name, what: "City", count: c.count })),
    ...facet.readersOf.filter((r) => has(r.name)).map((r) => ({ href: `/for-readers-of/${r.slug}`, label: `For readers of ${r.name}`, what: "Writer", count: r.count })),
    ...facet.inspiredBy.filter((r) => has(r.name)).map((r) => ({ href: `/inspired-by/${r.slug}`, label: `Inspired by ${r.name}`, what: "Writer", count: r.count })),
  ].slice(0, 12);
  const nothing = cards.length === 0 && works.length === 0 && places.length === 0;

  return (
    <div className="wrap search-page">
      <header className="page-head"><h1>Search</h1><p>Results for <span className="it">{q}</span></p>{form}</header>
      {nothing && <p className="empty">Nothing here matches that. Try fewer words, or <Link className="word" href="/authors">browse all authors</Link>.</p>}
      {places.length > 0 && (
        <section className="sec">
          <header><h2>Places to look</h2></header>
          <ul className="leaders">
            {places.map((p) => <li key={p.href}><Link href={p.href}><span>{p.label}</span><i aria-hidden="true" /><b>{p.count} {p.count === 1 ? "author" : "authors"}</b></Link></li>)}
          </ul>
        </section>
      )}
      {cards.length > 0 && (
        <section className="sec">
          <header><h2>Authors</h2><span>{cards.length === 20 ? "The first 20" : cards.length}</span></header>
          <ol>{cards.map((card) => <AuthorRow key={card.id} card={card} signedIn={signedIn} viewerId={viewer?.id} hideMature={hideMature} />)}</ol>
        </section>
      )}
      {works.length > 0 && (
        <section className="sec">
          <header><h2>Books and other work</h2><span>{works.length === 20 ? "The first 20" : works.length}</span></header>
          <ol>{works.map((card) => <WorkRow key={card.id} card={card} hideMature={hideMature} />)}</ol>
        </section>
      )}
    </div>
  );
}
