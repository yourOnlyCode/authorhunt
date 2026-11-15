/**
 * app/(site)/launches/page.tsx
 *
 * The archive: the last thirty days that had launches, each with the launch
 * that led it. Today is listed only once its counts are showing, so the
 * quiet hours' shuffled order is never read as a ranking.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authors, launches, works } from "@/lib/db/schema";
import { toCards } from "@/lib/queries/board";
import { formatDay, inQuietHours, launchDay } from "@/lib/ranking/day";
import { Cover, Portrait } from "@/components/ui/picture";

export const dynamic = "force-dynamic";

const title = "Every day's launches";
const description = "The archive of Author Hunt's daily boards: each day's launches, and the one readers cheered most.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/launches" }, openGraph: { title, description, url: "/launches", type: "website", siteName: "Author Hunt" } };

export default async function LaunchArchive() {
  const now = new Date();
  const today = launchDay(now);
  const shown = and(lte(launches.launchDay, today), inArray(launches.status, ["live", "closed"]), eq(authors.standing, "good"));
  const days = await db.select({ day: launches.launchDay, n: sql<number>`count(*)::int` }).from(launches).innerJoin(authors, eq(launches.authorId, authors.id))
    .where(shown).groupBy(launches.launchDay).orderBy(desc(launches.launchDay)).limit(30);
  const list = days.filter((d) => !inQuietHours(now, d.day));
  // One row per day: the day's best launch, as the board orders it.
  const tops = list.length
    ? await db.selectDistinctOn([launches.launchDay], { launch: launches, author: authors, work: works }).from(launches)
        .innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
        .where(and(inArray(launches.launchDay, list.map((d) => d.day)), ne(launches.status, "pulled"), ne(launches.status, "scheduled"), eq(authors.standing, "good")))
        .orderBy(desc(launches.launchDay), desc(launches.score), launches.createdAt)
    : [];
  const cards = new Map((await toCards(tops, null, now)).map((c) => [c.day, c]));

  return (
    <div className="wrap daypage">
      <section className="sec">
        <header><h1>Every day&apos;s <span className="it">launches</span></h1><span>The last thirty days with a board</span></header>
        {list.length === 0 ? <p className="thread-empty">No day has closed yet. <Link className="word" href="/">See today&apos;s board</Link>.</p> : (
          <ol className="archive">
            {list.map((d) => {
              const top = cards.get(d.day);
              return (
                <li className="row small" key={d.day}>
                  <div className="rank" />
                  {top
                    ? top.kind === "author"
                      ? <Portrait className="pic" url={top.pictureUrl} color={top.color} label={top.authorName} blurred={top.mature} />
                      : <Cover className="pic" url={top.pictureUrl} color={top.color} label={top.title} blurred={top.mature} />
                    : <div />}
                  <div>
                    <h3><Link href={`/launches/${d.day}`}>{d.day === today ? "Today" : formatDay(d.day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</Link></h3>
                    {top && <p className="tag it">{d.day === today ? "Leading" : "First of the day"}: {top.title}{top.kind === "work" ? `, ${top.byline}` : ""}</p>}
                  </div>
                  <div className="acts"><span className="daycount">{d.n === 1 ? "1 launch" : `${d.n} launches`}</span></div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
