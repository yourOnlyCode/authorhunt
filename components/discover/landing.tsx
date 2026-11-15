/**
 * components/discover/landing.tsx
 *
 * The page a filter value gets: a heading and one intro line, the authors who
 * carry the value in Momentum order, recent works where the value belongs to
 * works too, and a rail of sibling values so a reader can keep walking. Five
 * routes draw it, so they can't drift apart.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import type { AuthorCard, Counted, WorkCard } from "@/lib/queries/directory";
import { AuthorRow } from "./author-row";
import { ListJsonLd } from "./json-ld";
import { WorkRow } from "./work-row";

type Props = {
  path: string;
  label: string;
  title: ReactNode;
  plainTitle: string;
  intro: string;
  cards: AuthorCard[];
  total: number;
  /** The same filter on the full directory, for more than fits here and for adding other filters. */
  directoryHref: string;
  works?: { heading: string; cards: WorkCard[] };
  siblings: { heading: string; base: string; items: Counted[]; all?: { href: string; label: string } };
  empty: string;
  viewer: Viewer | null;
};

export function Landing({ path, label, title, plainTitle, intro, cards, total, directoryHref, works, siblings, empty, viewer }: Props) {
  const signedIn = Boolean(viewer);
  const hideMature = !viewer?.adultConfirmedAt;
  return (
    <>
      <ListJsonLd name={plainTitle} description={intro} path={path} items={cards.map((c) => ({ name: c.name, path: `/author/${c.handle}` }))} />
      <div className="wrap">
        <header className="page-head">
          <span className="sc">{label}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
      </div>
      <div className="wrap split">
        <main>
          <section className="sec">
            <header><h2>Authors</h2><span>{total} {total === 1 ? "author" : "authors"}, by Momentum</span></header>
            {cards.length === 0
              ? <p className="empty">{empty} <Link className="word" href="/authors">See all authors</Link>.</p>
              : <ol>{cards.map((card) => <AuthorRow key={card.id} card={card} signedIn={signedIn} viewerId={viewer?.id} hideMature={hideMature} />)}</ol>}
            {cards.length > 0 && <Link className="more word" href={directoryHref}>{total > cards.length ? `See all ${total} in the directory` : "Narrow these in the directory"}</Link>}
          </section>
          {works && works.cards.length > 0 && (
            <section className="sec">
              <header><h2>{works.heading}</h2></header>
              <ol>{works.cards.map((card) => <WorkRow key={card.id} card={card} hideMature={hideMature} />)}</ol>
            </section>
          )}
        </main>
        <aside className="rail">
          {siblings.items.length > 0 && (
            <section>
              <h2>{siblings.heading}</h2>
              <div className="genres">
                {siblings.items.map((s) => <Link key={s.slug} href={`${siblings.base}/${s.slug}`}>{s.name} <span className="n">{s.count}</span></Link>)}
              </div>
              {siblings.all && <Link className="more word" href={siblings.all.href}>{siblings.all.label}</Link>}
            </section>
          )}
          <section>
            <h2>Browse</h2>
            <ul>
              <li className="topic"><Link href="/authors">All authors</Link></li>
              <li className="topic"><Link href="/genre">Every genre</Link></li>
              <li className="topic"><Link href="/for-readers-of">For readers of</Link></li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
