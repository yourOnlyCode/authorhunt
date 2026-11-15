/**
 * /studio/launch: put your page or a work on a day's board. Free, every
 * time (AGENTS.md rule 3). What can't launch yet is listed with what it
 * needs, rather than left out without a word.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { LaunchControls, LaunchForm } from "@/components/studio/actions";
import { db } from "@/lib/db";
import { launches } from "@/lib/db/schema";
import { addDays, formatDay, launchDay } from "@/lib/ranking/day";
import { requireAuthor } from "@/lib/studio/page";
import { LAUNCH_WINDOW_DAYS } from "@/lib/studio/rules";
import { notPublicReason, worksOf } from "@/lib/studio/server";

export const metadata: Metadata = { title: "Launch" };

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ work?: string }> }) {
  const { work: preset } = await searchParams;
  const { author } = await requireAuthor("/studio/launch");
  const now = new Date();
  const today = launchDay(now);
  const lastDay = addDays(today, LAUNCH_WINDOW_DAYS);
  const [works, all] = await Promise.all([worksOf(author.id), db.select().from(launches).where(eq(launches.authorId, author.id)).orderBy(asc(launches.launchDay))]);
  const launched = new Set(all.map((l) => l.workId ?? "page"));
  const blocked = notPublicReason(author);
  const choices = [
    ...(!launched.has("page") ? [{ value: "page", label: `Your page: ${author.name}` }] : []),
    ...works.filter((w) => !launched.has(w.id) && w.aiUse).map((w) => ({ value: w.id, label: `${w.title} (${w.form})` })),
  ];
  const undeclared = works.filter((w) => !launched.has(w.id) && !w.aiUse);
  const scheduled = all.filter((l) => l.status === "scheduled");
  const titleOf = (workId: string | null) => (workId ? works.find((w) => w.id === workId)?.title ?? "A work" : "Your page");

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Launch</h1>
        <p>A launch puts your page, or one work, on one day&rsquo;s board, where readers cheer, comment and follow. Your page launches once and each work once, one launch a day. It&rsquo;s free, every time.</p>
      </div>

      <section className="studio-part">
        <h2>How a day goes</h2>
        <ul className="studio-points">
          <li>A day runs midnight to midnight, New York time. For its first four hours the board is shuffled and shows no counts, so nobody wins on a head start.</li>
          <li>The order after that comes from readers&rsquo; cheers and comments, and from nothing else. A membership never moves a launch.</li>
          <li>Ask for readers, not for cheers. &ldquo;My novel is on Author Hunt today, come and see&rdquo; is welcome anywhere. Asking people to cheer, trading cheers or paying for them is against the rules and can get a launch removed.</li>
          <li>A launch set for a later day has a coming-soon page, where readers can ask to be told on the morning.</li>
        </ul>
      </section>

      <section className="studio-part">
        <h2>Choose a day</h2>
        {blocked ? (
          <p className="notice">{blocked} <Link className="word" href="/studio/page">Go to your page</Link></p>
        ) : choices.length === 0 ? (
          <p className="notice">Everything you have is launched or has its day set. <Link className="word" href="/studio/works/new">Add a work</Link></p>
        ) : (
          <LaunchForm choices={choices} today={today} lastDay={lastDay} preset={preset ?? ""} />
        )}
        {undeclared.length > 0 && (
          <div className="studio-quiet">
            <p className="label">Not ready yet</p>
            <ul>{undeclared.map((w) => <li key={w.id}><b>{w.title}</b> needs its AI declaration first. <Link className="word" href={`/studio/works/${w.id}`}>Add it</Link></li>)}</ul>
          </div>
        )}
      </section>

      <section className="studio-part">
        <h2>Set for later</h2>
        {scheduled.length === 0 ? <p className="studio-empty">Nothing is set for a later day.</p> : (
          <ul className="studio-rows">
            {scheduled.map((l) => (
              <li key={l.id}>
                <span><b>{titleOf(l.workId)}</b><small>{formatDay(l.launchDay, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</small></span>
                <LaunchControls id={l.id} day={l.launchDay} today={today} lastDay={lastDay} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
