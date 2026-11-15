/**
 * app/(site)/launches/[day]/page.tsx
 *
 * One day's whole board, today's or a past one, in the order the board
 * itself keeps (lib/queries/board.ts). A day is a date in America/New_York
 * (AGENTS.md rule 6); a date that isn't one, or hasn't come yet, is not found.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { boardFor } from "@/lib/queries/board";
import { addDays, formatDay, launchDay } from "@/lib/ranking/day";
import { appUrl } from "@/lib/env";
import { JsonLd } from "@/components/author/json-ld";
import { LaunchRow } from "@/components/board/launch-row";

type Props = { params: Promise<{ day: string }> };
const FULL: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric", year: "numeric" };

/** The day, if it is a real calendar date no later than today. */
function validDay(raw: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const at = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== raw) return null;
  return raw <= today ? raw : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const day = validDay((await params).day, launchDay(new Date()));
  if (!day) return { title: "Not found", robots: { index: false } };
  const title = `Launches on ${formatDay(day, { month: "long", day: "numeric", year: "numeric" })}`;
  const description = `Every author and work launched on Author Hunt on ${formatDay(day, FULL)}, in the order readers cheered them.`;
  return { title, description, alternates: { canonical: `/launches/${day}` }, openGraph: { title, description, url: `/launches/${day}`, type: "website", siteName: "Author Hunt" } };
}

export default async function DayPage({ params }: Props) {
  const now = new Date();
  const today = launchDay(now);
  const day = validDay((await params).day, today);
  if (!day) notFound();
  const viewer = await getViewer();
  const board = await boardFor(day, { viewerId: viewer?.id ?? null, now });
  const isToday = day === today;
  const prev = addDays(day, -1);
  const next = isToday ? null : addDays(day, 1);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `Launches on ${formatDay(day, FULL)}`, url: `${appUrl}/launches/${day}`,
    itemListElement: board.filter((c) => !c.mature).map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, url: `${appUrl}${c.href}` })),
  };

  const days = (
    <nav className="daynav" aria-label="Other days">
      <Link className="word" href={`/launches/${prev}`} rel="prev">{formatDay(prev, { weekday: "long", month: "long", day: "numeric" })}</Link>
      <Link className="word" href="/launches">All days</Link>
      {next ? <Link className="word" href={next === today ? "/" : `/launches/${next}`} rel="next">{next === today ? "Today" : formatDay(next, { weekday: "long", month: "long", day: "numeric" })}</Link> : <span />}
    </nav>
  );

  return (
    <div className="wrap daypage">
      <JsonLd data={jsonLd} />
      <section className="sec">
        <header><h1>{isToday ? <>Launches <span className="it">today</span></> : "Launches of the day"}</h1><span>{formatDay(day, FULL)}</span></header>
        {days}
        {board.length === 0
          ? <p className="thread-empty">{isToday ? "Nothing has launched yet today." : "Nothing launched on this day."}</p>
          : <ol>{board.map((card, i) => <LaunchRow key={card.id} card={card} rank={card.quiet ? null : i + 1} variant={i === 0 && !card.quiet ? "first" : "row"} signedIn={Boolean(viewer)} hideMature={!viewer?.adultConfirmedAt} />)}</ol>}
      </section>
    </div>
  );
}
