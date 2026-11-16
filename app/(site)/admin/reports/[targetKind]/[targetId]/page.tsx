/**
 * app/(site)/admin/reports/[targetKind]/[targetId]/page.tsx
 *
 * One case: the thing reported, every report on it, the history of whoever it
 * belongs to, and the decisions open to the owner, each a form with a note.
 * The reporter's name is shown here and nowhere else.
 *
 * A report of undeclared AI gets the process from docs/product-structure.md,
 * section 7, as a checklist: tell the author, record the answer, decide,
 * appeal. The page offers no detector and no score, on purpose (AGENTS.md
 * rule 7): the owner decides on what a person can point to.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AI_USE_LABELS } from "@/lib/trust/actions";
import { aiCaseOn, historyFor, reportsOn, sanctionOf } from "@/lib/trust/cases";
import { actionLabel, AI_ANSWER_DAYS, answerDeadline, appealDeadline, APPEAL_DAYS, decisionLabel } from "@/lib/trust/policy";
import { isTargetKind, reasonLabel, TARGET_LABELS } from "@/lib/trust/reasons";
import { resolveTarget } from "@/lib/trust/targets";
import { AdminNav, Flash, Hidden, Note, onDay, StandingWord, when } from "../../../_ui";

export const dynamic = "force-dynamic";

export default async function CasePage({ params, searchParams }: { params: Promise<{ targetKind: string; targetId: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const { targetKind, targetId } = await params;
  const sp = await searchParams;
  if (!isTargetKind(targetKind)) notFound();
  const now = new Date();
  const t = await resolveTarget(targetKind, targetId, now);
  const reports = await reportsOn(targetKind, targetId);
  if (!t && reports.length === 0) notFound();
  const back = `/admin/reports/${targetKind}/${targetId}`;
  const base = { targetKind, targetId, back };

  if (!t) {
    return (
      <main className="wrap admin">
        <div className="page-head"><h1>Something that is no longer here</h1><p>It was deleted by its owner after it was reported. The reports are kept.</p></div>
        <AdminNav at="/admin/reports" />
        <ReportTable reports={reports} />
      </main>
    );
  }

  const owner = { userId: t.ownerUserId, authorId: t.author?.id ?? null };
  const [history, ai, s] = await Promise.all([historyFor(owner), aiCaseOn(targetKind, targetId), sanctionOf(owner)]);
  const open = reports.filter((r) => r.status === "open");
  const standing = t.author?.standing ?? t.ownerStanding;
  const isAi = Boolean(t.author) && (reports.some((r) => r.reason === "undeclared_ai") || ai.opened !== null);
  const declared = t.work ? t.work.aiUse : t.author?.aiUse ?? null;
  const mature = t.work ? t.work.mature : t.author?.mature ?? false;
  const canMark = Boolean(t.work) || ((t.kind === "author" || t.kind === "launch") && Boolean(t.author));
  const pulled = t.launchStatus === "pulled";
  const own = t.ownerUserId === admin.id;
  const earlierConfirmed = history.some((r) => r.action === "ai_case_confirmed");
  const due = ai.opened ? answerDeadline(ai.opened.createdAt) : null;
  const mayFind = Boolean(ai.opened) && (ai.answers.length > 0 || (due !== null && now >= due));

  return (
    <main className="wrap admin">
      <div className="page-head">
        <p className="sc">{TARGET_LABELS[t.kind]} · {open.length} open {open.length === 1 ? "report" : "reports"}</p>
        <h1>{t.title}</h1>
        <p>Now: {t.state}.{t.href && <> <a className="word" href={t.href}>See it on the site</a></>}</p>
      </div>
      <AdminNav at="/admin/reports" />
      <Flash done={sp.done} error={sp.error} />
      {isAi && <p className="notice admin-rule"><b>A detector&apos;s score is not evidence. Decide on what a person can point to.</b> That means the author&apos;s own statements, drafts they can or can&apos;t show, a writing record, model boilerplate left in the text.</p>}

      <div className="split">
        <div>
          <section className="sec">
            <header><h2>What was reported</h2></header>
            {t.excerpt && <blockquote className="admin-excerpt">{t.excerpt}</blockquote>}
            <dl className="facts">
              {t.author && <div><dt>Page</dt><dd><Link className="word" href={`/admin/authors/${t.author.id}`}>{t.author.name}</Link> (<Link className="word" href={`/author/${t.author.handle}`} prefetch={false}>/{t.author.handle}</Link>)</dd></div>}
              {!t.author && <div><dt>Account</dt><dd>{t.ownerName}, with no page</dd></div>}
              {t.author && <div><dt>Declared</dt><dd>{declared ? AI_USE_LABELS[declared] : "Not declared"}{t.work && t.author.aiUse ? `. The page: ${AI_USE_LABELS[t.author.aiUse]}` : ""}</dd></div>}
              {canMark && <div><dt>Mature</dt><dd>{mature ? "Marked Mature" : "Not marked"}</dd></div>}
              {t.work && <div><dt>Notes</dt><dd>{[...t.work.contentNotes, t.work.contentNoteText].filter(Boolean).join("; ") || "No content notes"}</dd></div>}
            </dl>
          </section>

          <section className="sec">
            <header><h2>Reports</h2><span>The reporter is shown to you only</span></header>
            <ReportTable reports={reports} />
          </section>

          {isAi && (
            <section className="sec">
              <header><h2>The process for undeclared AI</h2><span>Every step is logged</span></header>
              <ol className="admin-steps">
                <li data-done={ai.opened ? "true" : undefined}>
                  <h3>1. Tell the author, and give them {AI_ANSWER_DAYS} days</h3>
                  {ai.opened ? (
                    <p>Told on {when(ai.opened.createdAt)} by {ai.opened.actorName}. An answer is due by {onDay(due as Date)}.{ai.earlierCases > 0 ? ` This target has had ${ai.earlierCases} earlier ${ai.earlierCases === 1 ? "case" : "cases"}.` : ""}</p>
                  ) : (
                    <form className="stack" method="post" action="/api/admin/cases">
                      <Hidden values={{ ...base, action: "ai_open" }} />
                      <p>The page stays up unless the evidence is already strong; suspending is a separate decision below. The author gets this as a notification and an email, with the date they must answer by.</p>
                      <div className="field-row"><label htmlFor="ai-message">What was reported, in your words</label>
                        <textarea className="textarea" id="ai-message" name="message" required minLength={20} maxLength={3000} />
                        <span className="hint">Say what in the work is in question and what would answer it: drafts, notes, a writing record, an account of how it was made. Don&apos;t name or describe who reported it.</span></div>
                      <div><button className="btn" type="submit">Tell the author</button></div>
                    </form>
                  )}
                </li>
                <li data-done={ai.answers.length > 0 ? "true" : undefined}>
                  <h3>2. The author&apos;s answer</h3>
                  {ai.answers.map((a) => <blockquote key={a.id} className="admin-excerpt">{a.note}<small>{a.actorId === t.ownerUserId ? "Written by the author" : `Entered by ${a.actorName}`}, {when(a.createdAt)}</small></blockquote>)}
                  {ai.opened && !ai.decision ? (
                    <form className="stack" method="post" action="/api/admin/cases">
                      <Hidden values={{ ...base, action: "ai_answer" }} />
                      <div className="field-row"><label htmlFor="ai-answer">Record an answer</label>
                        <textarea className="textarea" id="ai-answer" name="answer" required minLength={10} maxLength={6000} />
                        <span className="hint">What they sent and what it shows: which drafts, what dates, what they said. An answer they write on the site appears here by itself.</span></div>
                      <div><button className="btn" type="submit">Record the answer</button></div>
                    </form>
                  ) : !ai.opened ? <p>Waiting on step 1.</p> : null}
                </li>
                <li data-done={ai.decision ? "true" : undefined}>
                  <h3>3. Decide</h3>
                  {ai.decision ? (
                    <p>{actionLabel(ai.decision.action)} on {when(ai.decision.createdAt)} by {ai.decision.actorName}. {ai.decision.note}</p>
                  ) : (
                    <form className="stack" method="post" action="/api/admin/cases">
                      <Hidden values={{ ...base, action: "ai_decide" }} />
                      {!mayFind && <p>A finding against the author can be entered once they have been told and have answered, or once the {AI_ANSWER_DAYS} days have passed. Closing as not confirmed needs neither.</p>}
                      {earlierConfirmed && <p className="error-text">This author already has a confirmed case. A corrected declaration stands for a first case only.</p>}
                      <fieldset className="admin-choices">
                        <legend className="label">Outcome</legend>
                        <label><input type="radio" name="outcome" value="not_confirmed" required /> Not confirmed. Closed and noted; the reporter and the author are told.</label>
                        <label><input type="radio" name="outcome" value="corrected" disabled={!mayFind || earlierConfirmed} /> The text is the author&apos;s own, but AI tools were used around it and not declared, and it&apos;s a first case. The corrected declaration stands, with the change in the log.</label>
                        <label><input type="radio" name="outcome" value="ban" disabled={!mayFind || own} /> The text was written by AI, in whole or in part; or a repeated case. The work is removed and the author banned: the page is gone, launches pulled, the account closed to Author Hunt.</label>
                      </fieldset>
                      <div className="field-row"><label htmlFor="ai-value">The corrected declaration</label>
                        <select className="select" id="ai-value" name="value" defaultValue="assisted">
                          <option value="assisted">{AI_USE_LABELS.assisted}</option>
                        </select><span className="hint">Used only for the second outcome.</span></div>
                      {standing === "suspended" && <label className="admin-check"><input type="checkbox" name="lift" value="1" defaultChecked /> Lift the suspension if the page stays</label>}
                      <Note id="ai-note" required hint="What the decision rests on: what a person can point to. A detector's score is not a ground. Kept in the log; never sent to anyone." />
                      <div><button className="btn solid" type="submit">Enter the decision</button></div>
                    </form>
                  )}
                </li>
                <li data-done={s.appealDecision ? "true" : undefined}>
                  <h3>4. One appeal, in writing, within {APPEAL_DAYS} days</h3>
                  <Appeal back={back} userId={t.ownerUserId} standing={standing} s={s} now={now} />
                </li>
              </ol>
            </section>
          )}

          <section className="sec">
            <header><h2>Decide</h2><span>Closing a case tells the reporter and the owner</span></header>
            <div className="admin-acts">
              <details><summary>Dismiss</summary>
                <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "dismiss" }} />
                  <p>Nothing changes. Every open report on this is closed as unfounded.</p>
                  <Note id="n-dismiss" required /><div><button className="btn" type="submit">Dismiss</button></div></form>
              </details>
              {(t.kind === "comment" || t.kind === "image") && !t.hidden && (
                <details><summary>Remove the {t.kind === "comment" ? "comment" : "picture"}</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "remove" }} />
                    <p>The {t.kind === "comment" ? "comment" : "picture"} is gone; the account stays.</p>
                    <Note id="n-remove" /><div><button className="btn" type="submit">Remove</button></div></form>
                </details>
              )}
              {t.kind === "comment" && t.hidden && (
                <details><summary>Put the comment back</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "restore_comment" }} />
                    <Note id="n-unremove" /><div><button className="btn" type="submit">Put it back</button></div></form>
                </details>
              )}
              {t.kind !== "comment" && t.launchId && !pulled && (
                <details><summary>Pull the launch</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "pull" }} />
                    <p>Off the board. The page stays.</p>
                    <Note id="n-pull" /><div><button className="btn" type="submit">Pull the launch</button></div></form>
                </details>
              )}
              {t.kind !== "comment" && t.launchId && pulled && (
                <details><summary>Put the launch back</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "restore_launch" }} />
                    <p>Live if its day is today, closed if the day has passed.</p>
                    <Note id="n-unpull" /><div><button className="btn" type="submit">Put it back</button></div></form>
                </details>
              )}
              {canMark && !mature && (
                <details><summary>Mark Mature</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "mature" }} />
                    <p>Adds the mark to {t.work ? "the work" : "the page"}. The usual fix for a missing mark; a ban is for repeated refusal.</p>
                    <Note id="n-mature" /><div><button className="btn" type="submit">Mark Mature</button></div></form>
                </details>
              )}
              {t.work && (
                <details><summary>Add a content note</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "content_note" }} />
                    <div className="field-row"><label htmlFor="cn-text">The note</label><input className="input" id="cn-text" name="text" required minLength={3} maxLength={200} /><span className="hint">A few words, as a reader would want them: &ldquo;death of a parent&rdquo;.</span></div>
                    <Note id="n-cn" /><div><button className="btn" type="submit">Add the note</button></div></form>
                </details>
              )}
              {!own && standing === "good" && (
                <details><summary>Suspend while it&apos;s decided</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "suspend" }} />
                    <p>{t.author ? "The page and its launches are hidden and the account can't post." : "The account can't post."} For serious reports where the evidence is already strong. The reports stay open.</p>
                    <Note id="n-suspend" required /><div><button className="btn" type="submit">Suspend</button></div></form>
                </details>
              )}
              {!own && standing !== "good" && (
                <details><summary>Restore to good standing</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "restore" }} />
                    <p>Lifts the {standing === "banned" ? "ban" : "suspension"}. Launches a ban pulled stay pulled, and cheers it discounted stay discounted.</p>
                    <Note id="n-restore" required /><div><button className="btn" type="submit">Restore</button></div></form>
                </details>
              )}
              {!own && standing !== "banned" && !isAi && (
                <details><summary>Ban</summary>
                  <form className="stack" method="post" action="/api/admin/cases"><Hidden values={{ ...base, action: "ban" }} />
                    <p>For plagiarism, impersonation, buying or trading cheers at scale, harassment after a warning, or evading a ban. {t.author ? "The page is gone from the site, its launches are pulled, " : "The account is closed, "}and the cheers the account gave stop counting. It doesn&apos;t touch their Lorec account.</p>
                    <Note id="n-ban" required hint="The evidence, as a person could check it. Kept in the log; never sent to anyone." /><div><button className="btn solid" type="submit">Ban</button></div></form>
                </details>
              )}
            </div>
            {isAi && standing !== "banned" && <p className="admin-aside">A ban for undeclared AI is entered at step 3 of the process above, after the author has been told and has had their say.</p>}
          </section>
        </div>

        <aside className="rail">
          <section>
            <h2>Whose it is</h2>
            <ul>
              <li>{t.author ? <Link className="word" href={`/admin/authors/${t.author.id}`}>{t.author.name}</Link> : t.ownerName}<small><StandingWord standing={standing} /></small></li>
              {!isAi && standing !== "good" && <li><Appeal back={back} userId={t.ownerUserId} standing={standing} s={s} now={now} /></li>}
            </ul>
          </section>
          <section>
            <h2>History</h2>
            {history.length === 0 ? <p className="admin-aside">Nothing earlier about this person.</p> : (
              <ul>{history.map((h) => <li key={h.id}><b>{actionLabel(h.action)}</b><small>{when(h.createdAt)}, {h.actorId === t.ownerUserId ? "by them" : `by ${h.actorName}`}</small>{h.note && <small className="admin-lognote">{h.note}</small>}</li>)}</ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function ReportTable({ reports }: { reports: Awaited<ReturnType<typeof reportsOn>> }) {
  if (reports.length === 0) return <p className="admin-aside">No reports. This case was opened on your own doubt.</p>;
  return (
    <div className="admin-scroll"><table className="table">
      <thead><tr><th>Reason</th><th>What they are going on</th><th>Reporter</th><th>When</th></tr></thead>
      <tbody>{reports.map((r) => (
        <tr key={r.id}>
          <td>{reasonLabel(r.reason)}</td>
          <td>{r.note}{r.status === "decided" && <small className="admin-lognote">{decisionLabel(r.decision)}{r.decidedAt ? `, ${when(r.decidedAt)}` : ""}</small>}</td>
          <td>{r.reporterName}{r.weight < 1 && <small className="admin-lognote">Earlier reports mostly unfounded</small>}</td>
          <td>{when(r.createdAt)}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

/** The one appeal: what is on record, a place to enter one that came by email, and the decision on it. */
function Appeal({ back, userId, standing, s, now }: { back: string; userId: string; standing: string; s: Awaited<ReturnType<typeof sanctionOf>>; now: Date }) {
  if (!s.sanction) return <p>Nothing to appeal: there has been no suspension or ban.</p>;
  const until = appealDeadline(s.sanction.createdAt);
  return (
    <div className="stack">
      <p>{actionLabel(s.sanction.action)} on {when(s.sanction.createdAt)}. An appeal can be made until {onDay(until)}.</p>
      {s.appeals.map((a) => <blockquote key={a.id} className="admin-excerpt">{a.note}<small>{a.actorId === userId ? "Written by them" : `Entered by ${a.actorName}`}, {when(a.createdAt)}</small></blockquote>)}
      {s.appealDecision && <p><b>Decided {when(s.appealDecision.createdAt)}.</b> {s.appealDecision.note}</p>}
      {s.appeals.length === 0 && standing !== "good" && now <= until && (
        <details><summary>Enter an appeal that came by email</summary>
          <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId, back, action: "appeal_record" }} />
            <div className="field-row"><label htmlFor="ap-text">What they wrote</label><textarea className="textarea" id="ap-text" name="text" required minLength={10} maxLength={6000} /><span className="hint">A banned account can&apos;t sign in, so its appeal arrives by email.</span></div>
            <div><button className="btn" type="submit">Put it on record</button></div></form>
        </details>
      )}
      {s.appeals.length === 0 && now > until && <p>No appeal was made in time.</p>}
      {s.appeals.length > 0 && !s.appealDecision && (
        <form className="stack" method="post" action="/api/admin/standing"><Hidden values={{ userId, back, action: "appeal_decide" }} />
          <fieldset className="admin-choices"><legend className="label">The appeal</legend>
            <label><input type="radio" name="outcome" value="stands" required /> The decision stands.</label>
            <label><input type="radio" name="outcome" value="overturned" /> Overturned: restore to good standing.</label>
          </fieldset>
          <Note id="ap-note" required /><div><button className="btn" type="submit">Decide the appeal</button></div></form>
      )}
    </div>
  );
}
