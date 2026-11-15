/**
 * app/(site)/page.tsx
 *
 * Home: today's board, then yesterday's and last week's, beside a rail
 * (docs/product-structure.md: the structure is Product Hunt's). The kind of
 * launch is a tab above the list.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { boardCount, boardFor, comingSoon, risingAuthors, topBetween, type BoardFilter } from "@/lib/queries/board";
import { lookups } from "@/lib/queries/lookups";
import { addDays, formatDay, launchDay } from "@/lib/ranking/day";
import { LaunchRow } from "@/components/board/launch-row";
import { LetterForm } from "@/components/site/letter-form";
import { Portrait } from "@/components/ui/picture";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const dynamic = "force-dynamic";

const KINDS: { key: BoardFilter; label: string }[] = [
  { key: "all", label: "Everything" }, { key: "book", label: "Books" }, { key: "author", label: "Authors" },
  { key: "short", label: "Short works" }, { key: "serial", label: "Serials" }, { key: "issue", label: "Magazines and journals" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const filter = (KINDS.find((k) => k.key === kind)?.key ?? "all") as BoardFilter;
  const now = new Date();
  const today = launchDay(now);
  const yesterday = addDays(today, -1);
  const viewer = await getViewer();
  const viewerId = viewer?.id ?? null;
  const [board, total, past, week, soon, rising, look] = await Promise.all([
    boardFor(today, { viewerId, filter, limit: 20, now }), boardCount(today),
    boardFor(yesterday, { viewerId, limit: 5, now }), topBetween(addDays(today, -8), addDays(today, -2), { viewerId, limit: 5, now }),
    comingSoon(now, 4), risingAuthors(3), lookups(),
  ]);
  const signedIn = Boolean(viewer);
  const hideMature = !viewer?.adultConfirmedAt;

  return (
    <>
      <div className="letter"><div className="wrap">
        <span><b className="hl">The Sunday letter.</b> The week&apos;s top launches, in the genres you read.</span>
        <LetterForm />
      </div></div>

      <div className="wrap split">
        <main>
          <section className="sec">
            <header><h1>Top launches <span className="it">today</span></h1><span>{formatDay(today)}</span></header>
            <nav className="kinds" aria-label="Kind of launch">
              {KINDS.map((k) => <Link key={k.key} href={k.key === "all" ? "/" : `/?kind=${k.key}`} aria-current={k.key === filter ? "page" : undefined}>{k.label}</Link>)}
            </nav>
            {board.length === 0
              ? <p style={{ paddingBlock: 28 }}>Nothing of this kind has launched yet today. <Link className="word" href="/studio">Launch something</Link>, or see <Link className="word" href={`/launches/${yesterday}`}>yesterday&apos;s board</Link>.</p>
              : <ol>{board.map((card, i) => <LaunchRow key={card.id} card={card} rank={card.quiet ? null : i + 1} variant={i === 0 && filter === "all" ? "first" : "row"} signedIn={signedIn} hideMature={hideMature} />)}</ol>}
            {total > board.length && <Link className="more word" href={`/launches/${today}`}>See all {total} of today&apos;s launches</Link>}
          </section>

          {past.length > 0 && (
            <section className="sec">
              <header><h2>Yesterday&apos;s top launches</h2><span>{formatDay(yesterday)}</span></header>
              <ol>{past.map((card, i) => <LaunchRow key={card.id} card={card} rank={i + 1} variant="small" signedIn={signedIn} hideMature={hideMature} />)}</ol>
              <Link className="more word" href={`/launches/${yesterday}`}>See all of yesterday&apos;s launches</Link>
            </section>
          )}

          {week.length > 0 && (
            <section className="sec">
              <header><h2>Last week&apos;s top launches</h2><span>{formatDay(addDays(today, -8), { month: "long", day: "numeric" })} to {formatDay(addDays(today, -2), { month: "long", day: "numeric" })}</span></header>
              <ol>{week.map((card, i) => <LaunchRow key={card.id} card={card} rank={i + 1} variant="small" signedIn={signedIn} hideMature={hideMature} />)}</ol>
            </section>
          )}
        </main>

        <aside className="rail">
          {soon.length > 0 && (
            <section><h2>Launching soon</h2><ul>
              {soon.map((c) => (
                <li className="soon" key={c.id}>
                  <time dateTime={c.day}>{formatDay(c.day, { month: "short", day: "numeric" })}</time>
                  <div><Link className="word" href={c.href}>{c.title}</Link><small>{[c.genre?.name, c.waiting > 0 ? `${c.waiting} readers waiting` : null].filter(Boolean).join(" · ")}</small></div>
                </li>
              ))}
            </ul></section>
          )}
          <section><h2>Rising authors</h2><ul>
            {rising.map((a) => (
              <li className="person" key={a.id}>
                <Portrait url={a.portraitUrl} color={a.color} label={a.name} />
                <div><Link href={`/author/${a.handle}`}><b>{a.name}</b></Link><small>{[a.genre, a.city].filter(Boolean).join(" · ")}</small></div>
                <span className="up" title="Momentum">↑ {a.momentum}</span>
              </li>
            ))}
          </ul><Link className="more word" href="/authors">All authors</Link></section>
          <section><h2>Browse</h2><div className="genres">
            {[...look.genres].slice(0, 10).map(([slug, name]) => <Link key={slug} href={`/genre/${slug}`}>{name}</Link>)}
            <Link href="/authors">Near me</Link>
          </div></section>
        </aside>
      </div>
    </>
  );
}
