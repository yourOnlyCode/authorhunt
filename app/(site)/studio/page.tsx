/**
 * /studio: the author's desk. With no page yet it offers to make one. With a
 * page it shows where things stand: whether the page is public and what it
 * still needs, each work and its launch, what's coming, and whether the
 * member tools are on. Nothing here is locked: launching is free, and the
 * member tools are described where they're off (AGENTS.md rule 3).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getViewerAuthor, requireViewer } from "@/lib/auth";
import { accessFor } from "@/lib/billing/server";
import { PRICE } from "@/lib/billing/access";
import { db } from "@/lib/db";
import { launches } from "@/lib/db/schema";
import { formatDay, launchDay } from "@/lib/ranking/day";
import { accessWords } from "@/lib/studio/page";
import { aiLabel, pageChecklist } from "@/lib/studio/rules";
import { worksOf } from "@/lib/studio/server";

export const metadata: Metadata = { title: "Desk" };

const STATE_WORDS = { scheduled: "Launching", live: "Live today", closed: "Launched", pulled: "Removed from the board" } as const;

export default async function StudioDesk() {
  const viewer = await requireViewer("/studio");
  const author = await getViewerAuthor();

  if (!author) {
    return (
      <main className="wrap studio">
        <div className="page-head">
          <h1>Welcome, {viewer.displayName.split(" ")[0]}</h1>
          <p>This is where an author keeps their page. Make yours, add what you&rsquo;ve written, and choose a day to put it on the board. Making a page and launching are free, for good.</p>
        </div>
        <section className="studio-part">
          <ol className="studio-steps">
            <li><b>Make your page.</b> A portrait, a few lines about you, your genres and where readers can find you.</li>
            <li><b>Say how you write.</b> Every page declares whether AI was used. It takes one choice.</li>
            <li><b>Launch.</b> Your page goes on a day&rsquo;s board once, and each work once, on days you choose.</li>
          </ol>
          <p className="studio-actions"><Link className="btn solid" href="/studio/page">Make your page</Link></p>
          <p className="hint">Here to read? You don&rsquo;t need a page. <Link className="word" href="/">See today&rsquo;s launches</Link></p>
        </section>
      </main>
    );
  }

  const now = new Date();
  const today = launchDay(now);
  const [access, works, allLaunches] = await Promise.all([
    accessFor(author, now),
    worksOf(author.id),
    db.select().from(launches).where(eq(launches.authorId, author.id)).orderBy(desc(launches.launchDay)),
  ]);
  const checklist = pageChecklist(author, works.length);
  const missing = checklist.filter((c) => !c.done);
  const pageLaunch = allLaunches.find((l) => l.kind === "author") ?? null;
  const launchOf = new Map(allLaunches.filter((l) => l.workId).map((l) => [l.workId as string, l]));
  const upcoming = allLaunches.filter((l) => l.status === "scheduled").sort((a, b) => a.launchDay.localeCompare(b.launchDay));
  const titleOf = (workId: string | null) => (workId ? works.find((w) => w.id === workId)?.title ?? "A work" : "Your page");
  const stateWords = (l: { status: keyof typeof STATE_WORDS; launchDay: string }) =>
    l.status === "scheduled" ? `Launching ${formatDay(l.launchDay)}` : l.status === "live" ? (l.launchDay === today ? "Live today" : "Live") : l.status === "closed" ? `Launched ${formatDay(l.launchDay, { month: "long", day: "numeric", year: "numeric" })}` : STATE_WORDS[l.status];

  return (
    <main className="wrap studio">
      <div className="page-head">
        <h1>{author.name}</h1>
        <p>
          {author.standing === "banned" ? "This page has been removed."
            : author.standing === "suspended" ? "Your page is hidden while a report is reviewed. You've been told what was reported and can answer."
            : author.publishedAt ? <>Your page is public at <Link className="word" href={`/author/${author.handle}`}>/author/{author.handle}</Link>.</>
            : "Your page is a draft. Only you can see it."}
        </p>
      </div>

      <div className="split studio-split">
        <div>
          {!author.publishedAt && author.standing === "good" && (
            <section className="sec">
              <header><h2>Before it can be public</h2><span>{missing.length === 0 ? "All in place" : `${missing.length} to go`}</span></header>
              <ul className="studio-checklist">
                {checklist.map((c) => <li key={c.key} className={c.done ? "done" : ""}><span aria-hidden="true">{c.done ? "✓" : "–"}</span> {c.label}{c.done ? "" : " (still needed)"}</li>)}
              </ul>
              <p className="studio-actions"><Link className="btn solid" href="/studio/page">{missing.length === 0 ? "Make it public" : "Finish your page"}</Link></p>
            </section>
          )}

          <section className="sec">
            <header><h2>Coming up</h2><Link className="word" href="/studio/launch">Launch something</Link></header>
            {upcoming.length === 0 ? (
              <p className="studio-empty">No launch is set. {author.publishedAt ? "Choose a day for your page or a work whenever you're ready. It's free." : "Once your page is public you can choose a day for it."}</p>
            ) : (
              <ul className="studio-rows">
                {upcoming.map((l) => <li key={l.id}><span><b>{titleOf(l.workId)}</b></span><span>{formatDay(l.launchDay)}</span></li>)}
              </ul>
            )}
          </section>

          <section className="sec">
            <header><h2>Your page and works</h2><Link className="word" href="/studio/works/new">Add a work</Link></header>
            <table className="table studio-table">
              <thead><tr><th scope="col">Title</th><th scope="col">Written</th><th scope="col">Launch</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                <tr>
                  <td><b>Your page</b><small>{author.kind === "publication" ? "A publication" : "An author page"}</small></td>
                  <td>{aiLabel(author.aiUse)}</td>
                  <td>{pageLaunch ? stateWords(pageLaunch) : "Not launched"}</td>
                  <td className="studio-do"><Link className="word" href="/studio/page">Edit</Link>{!pageLaunch && author.publishedAt && <Link className="word" href="/studio/launch?work=page">Launch</Link>}</td>
                </tr>
                {works.map((w) => {
                  const l = launchOf.get(w.id);
                  return (
                    <tr key={w.id}>
                      <td><b>{w.title}</b><small>{w.form}</small></td>
                      <td>{aiLabel(w.aiUse)}</td>
                      <td>{l ? stateWords(l) : "Not launched"}</td>
                      <td className="studio-do"><Link className="word" href={`/studio/works/${w.id}`}>Edit</Link>{!l && <Link className="word" href={`/studio/launch?work=${w.id}`}>Launch</Link>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {works.length === 0 && <p className="studio-empty">No works yet. Add a book, a short work, a serial or an issue, then launch each one on its own day.</p>}
          </section>
        </div>

        <aside className="rail">
          <section>
            <h2>Do</h2>
            <ul className="topic">
              <li><Link href="/studio/page">Edit page</Link></li>
              <li><Link href="/studio/works/new">Add a work</Link></li>
              <li><Link href="/studio/launch">Launch</Link></li>
              <li><Link href="/studio/updates">Post an update</Link></li>
              <li><Link href="/studio/followers">Followers</Link><small>{author.followerCount} {author.followerCount === 1 ? "reader follows" : "readers follow"} you</small></li>
              <li><Link href="/studio/analytics">Analytics</Link></li>
              <li><Link href="/studio/share">Share kit</Link></li>
              <li><Link href="/pricing">Membership</Link></li>
            </ul>
          </section>
          <section>
            <h2>Member tools</h2>
            <p className="studio-access">Member tools: {accessWords(access, author.trialEndsAt)}.</p>
            <small>
              {access === "free" ? <>Launching stays free. ${PRICE.monthly} a month or ${PRICE.yearly} a year adds emailing your followers, the coming-soon list, full analytics, a Support link and the full share kit. <Link className="word" href="/pricing">See member tools</Link></>
                : access === "trial" ? <>Thirty days of the member tools, with no card. When it ends they switch off and nothing public changes. <Link className="word" href="/pricing">See member tools</Link></>
                : "Emailing your followers, the coming-soon list, full analytics, a Support link and the full share kit."}
            </small>
          </section>
          <section>
            <h2>Standing</h2>
            <p className="studio-access">Momentum {Math.round(author.momentum)}</p>
            <small>Points for what you make and the support you receive, halving every thirty days. Never affected by membership.</small>
          </section>
        </aside>
      </div>
    </main>
  );
}
