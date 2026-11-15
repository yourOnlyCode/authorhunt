/**
 * app/(site)/admin/authors/[id]/page.tsx
 *
 * One page's standing: what it is now, what has been reported about it and
 * anything of its owner's, the log, its launches, and the three controls
 * (suspend, restore, ban). Each control needs a note, because the note is the
 * record of what the decision rests on.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors, launches, reports, users, works, type ReportTarget } from "@/lib/db/schema";
import { rowsOf } from "@/lib/sql";
import { formatDay } from "@/lib/ranking/day";
import { AI_USE_LABELS } from "@/lib/trust/actions";
import { historyFor, sanctionOf } from "@/lib/trust/cases";
import { actionLabel, appealDeadline, decisionLabel, isUuid } from "@/lib/trust/policy";
import { reasonLabel, TARGET_LABELS } from "@/lib/trust/reasons";
import { AdminNav, Flash, Hidden, Note, onDay, StandingWord, when } from "../../_ui";

export const dynamic = "force-dynamic";

type About = { id: string; target_kind: ReportTarget; target_id: string; reason: string; note: string; status: string; decision: string | null; created_at: string | Date };

export default async function AuthorAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const [row] = await db.select({ a: authors, u: users }).from(authors).innerJoin(users, eq(authors.userId, users.id)).where(eq(authors.id, id)).limit(1);
  if (!row) notFound();
  const { a, u } = row;
  const owner = { userId: a.userId, authorId: a.id };
  const back = `/admin/authors/${a.id}`;
  const [history, s, theirs, about] = await Promise.all([
    historyFor(owner), sanctionOf(owner),
    db.select({ l: launches, title: works.title }).from(launches).leftJoin(works, eq(launches.workId, works.id)).where(eq(launches.authorId, a.id)).orderBy(desc(launches.launchDay)),
    // Reports on the page, its works and launches, and its owner's comments, in one read.
    db.execute(sql`select r.id, r.target_kind, r.target_id, r.reason, r.note, r.status, r.decision, r.created_at from ${reports} r where
      (r.target_kind = 'author' and r.target_id = ${a.id})
      or (r.target_kind = 'work' and r.target_id in (select id::text from works where author_id = ${a.id}::uuid))
      or (r.target_kind = 'launch' and r.target_id in (select id::text from launches where author_id = ${a.id}::uuid))
      or (r.target_kind = 'comment' and r.target_id in (select id::text from comments where user_id = ${a.userId}))
      or (r.target_kind = 'image' and r.target_id in (select id::text from images where owner_user_id = ${a.userId}))
      order by r.created_at desc limit 100`).then((res) => rowsOf<About>(res)),
  ]);
  const own = a.userId === admin.id;

  return (
    <main className="wrap admin">
      <div className="page-head">
        <p className="sc">Page</p>
        <h1>{a.name}</h1>
        <p><StandingWord standing={a.standing} /> · <Link className="word" href={`/author/${a.handle}`} prefetch={false}>/{a.handle}</Link> · {u.email} · {a.aiUse ? AI_USE_LABELS[a.aiUse] : "No declaration yet"}{a.mature ? " · Mature" : ""}</p>
      </div>
      <AdminNav at="/admin/authors" />
      <Flash done={sp.done} error={sp.error} />

      <div className="split">
        <div>
          <section className="sec">
            <header><h2>Standing</h2></header>
            {a.standing !== "good" && s.sanction && <p className="admin-aside">{actionLabel(s.sanction.action)} on {when(s.sanction.createdAt)}. An appeal can be made until {onDay(appealDeadline(s.sanction.createdAt))}.</p>}
            {s.appeals.map((ap) => <blockquote key={ap.id} className="admin-excerpt">{ap.note}<small>{ap.actorId === a.userId ? "Their appeal" : `An appeal entered by ${ap.actorName}`}, {when(ap.createdAt)}</small></blockquote>)}
            {s.appealDecision && <p className="admin-aside"><b>Appeal decided {when(s.appealDecision.createdAt)}.</b> {s.appealDecision.note}</p>}
            {own ? <p className="admin-aside">This is your own page.</p> : (
              <div className="admin-acts">
                {s.appeals.length > 0 && !s.appealDecision && a.standing !== "good" && (
                  <details open><summary>Decide the appeal</summary>
                    <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId: a.userId, back, action: "appeal_decide" }} />
                      <fieldset className="admin-choices"><legend className="label">The appeal</legend>
                        <label><input type="radio" name="outcome" value="stands" required /> The decision stands.</label>
                        <label><input type="radio" name="outcome" value="overturned" /> Overturned: restore to good standing.</label>
                      </fieldset>
                      <Note id="n-appeal" required /><div><button className="btn" type="submit">Decide the appeal</button></div></form>
                  </details>
                )}
                {a.standing !== "good" && s.appeals.length === 0 && (
                  <details><summary>Enter an appeal that came by email</summary>
                    <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId: a.userId, back, action: "appeal_record" }} />
                      <div className="field-row"><label htmlFor="ap-text">What they wrote</label><textarea className="textarea" id="ap-text" name="text" required minLength={10} maxLength={6000} /></div>
                      <div><button className="btn" type="submit">Put it on record</button></div></form>
                  </details>
                )}
                {a.standing === "good" && (
                  <details><summary>Suspend</summary>
                    <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId: a.userId, back, action: "suspend" }} />
                      <p>The page and its launches are hidden and the account can&apos;t post, while a report is decided.</p>
                      <Note id="n-suspend" required /><div><button className="btn" type="submit">Suspend</button></div></form>
                  </details>
                )}
                {a.standing !== "good" && (
                  <details><summary>Restore to good standing</summary>
                    <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId: a.userId, back, action: "restore" }} />
                      <p>Lifts the {a.standing === "banned" ? "ban" : "suspension"}. Launches a ban pulled stay pulled until each is put back below, and cheers it discounted stay discounted.</p>
                      <Note id="n-restore" required /><div><button className="btn" type="submit">Restore</button></div></form>
                  </details>
                )}
                {a.standing !== "banned" && (
                  <details><summary>Ban</summary>
                    <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId: a.userId, back, action: "ban" }} />
                      <p>The page is gone from the site and from search, its launches are pulled, the cheers the account gave stop counting, and the account can&apos;t make another page. For undeclared AI, go through the process on the case first: the author is told and has seven days to answer. A detector&apos;s score is not evidence.</p>
                      <Note id="n-ban" required hint="The evidence, as a person could check it. Kept in the log; never sent to anyone." /><div><button className="btn solid" type="submit">Ban</button></div></form>
                  </details>
                )}
              </div>
            )}
          </section>

          <section className="sec">
            <header><h2>Reports</h2><span>About the page, its works, its launches and its owner&apos;s comments</span></header>
            {about.length === 0 ? <p className="admin-aside">None.</p> : (
              <div className="admin-scroll"><table className="table">
                <thead><tr><th>About</th><th>Reason</th><th>Note</th><th>State</th></tr></thead>
                <tbody>{about.map((r) => (
                  <tr key={r.id}>
                    <td><Link className="word" href={`/admin/reports/${r.target_kind}/${r.target_id}`}>{TARGET_LABELS[r.target_kind] ?? r.target_kind}</Link></td>
                    <td>{reasonLabel(r.reason)}</td><td>{r.note}</td>
                    <td>{r.status === "open" ? "Open" : decisionLabel(r.decision)}<small className="admin-lognote">{when(new Date(r.created_at))}</small></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>

          <section className="sec">
            <header><h2>Launches</h2></header>
            {theirs.length === 0 ? <p className="admin-aside">None.</p> : (
              <div className="admin-scroll"><table className="table">
                <thead><tr><th>Launch</th><th>Day</th><th>Status</th><th><span className="visually-hidden">Change</span></th></tr></thead>
                <tbody>{theirs.map(({ l, title }) => (
                  <tr key={l.id}>
                    <td>{title ?? "The page itself"}</td><td>{formatDay(l.launchDay, { month: "long", day: "numeric", year: "numeric" })}</td><td>{l.status}</td>
                    <td>
                      <form method="post" action="/api/admin/cases" className="admin-inline">
                        <Hidden values={{ targetKind: "launch", targetId: l.id, back, action: l.status === "pulled" ? "restore_launch" : "pull" }} />
                        <label className="visually-hidden" htmlFor={`ln-${l.id}`}>Note for the log</label>
                        <input className="input" id={`ln-${l.id}`} name="note" placeholder="Note for the log" maxLength={1000} />
                        <button className="word" type="submit">{l.status === "pulled" ? "Put back" : "Pull"}</button>
                      </form>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </div>

        <aside className="rail">
          <section>
            <h2>The log</h2>
            {history.length === 0 ? <p className="admin-aside">Nothing has been decided about this page.</p> : (
              <ul>{history.map((h) => <li key={h.id}><b>{actionLabel(h.action)}</b><small>{when(h.createdAt)}, {h.actorId === a.userId ? "by them" : `by ${h.actorName}`}</small>{h.note && <small className="admin-lognote">{h.note}</small>}</li>)}</ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
