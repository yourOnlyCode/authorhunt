/**
 * app/(site)/standing/page.tsx
 *
 * What a reported or sanctioned person sees: whether their account and page
 * are in good standing, what a suspension or a ban means, and where to answer.
 * It never says who reported, and it shows none of the owner's notes.
 *
 * lib/auth treats a banned account as signed out, so a banned person can't be
 * shown anything of their own here. The signed-out page therefore says where
 * to write, instead of sending everyone to sign in.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, getViewerAuthor, signInHref } from "@/lib/auth";
import { openAiCasesFor, sanctionOf } from "@/lib/trust/cases";
import { AI_ANSWER_DAYS, answerDeadline, appealDeadline, APPEAL_DAYS, appealState, REPORTS_ADDRESS } from "@/lib/trust/policy";

export const metadata: Metadata = { title: "Your standing", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(d);
const mail = <a className="word" href={`mailto:${REPORTS_ADDRESS}`}>{REPORTS_ADDRESS}</a>;

export default async function StandingPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const sp = await searchParams;
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <main className="wrap standing">
        <div className="page-head"><h1>Your standing</h1><p><Link className="word" href={signInHref("/standing")}>Sign in</Link> to see whether your account and page are in good standing.</p></div>
        <div className="prose standing-body">
          <p>If your account was suspended or banned and you can&apos;t sign in, write to {mail} from the address the account uses. Say what you want looked at again, and why. A person reads it.</p>
          <p>There is one appeal, in writing, within {APPEAL_DAYS} days of the decision.</p>
        </div>
      </main>
    );
  }

  const page = await getViewerAuthor();
  const owner = { userId: viewer.id, authorId: page?.id ?? null };
  const [s, cases] = await Promise.all([sanctionOf(owner), openAiCasesFor(owner)]);
  const standing = page && page.standing !== "good" ? page.standing : viewer.standing;
  const now = new Date();
  const state = appealState({ standing, sanctionedAt: s.sanction?.createdAt ?? null, appealsSince: s.appeals.length, now });

  return (
    <main className="wrap standing">
      <div className="page-head">
        <h1>Your standing</h1>
        <p>{standing === "good" ? (page ? "Your account and your page are in good standing." : "Your account is in good standing.") : standing === "suspended" ? (page ? "Your page is suspended while a report is reviewed." : "Your account is suspended while a report is reviewed.") : "Your page has been removed from Author Hunt."}</p>
      </div>
      {sp.error && <p className="notice warn standing-flash" role="alert">{sp.error}</p>}
      {sp.done && <p className="notice standing-flash" role="status">{sp.done}</p>}

      <div className="stack standing-body">
        {cases.map((c) => (
          <section key={`${c.kind}:${c.id}`} className="notice stack">
            <h2 className="sc">A report about how your work was written</h2>
            <p>A reader has reported that AI was used in something of yours and not declared. Nothing has been decided, and {standing === "good" ? "your page stays up" : "nothing more changes"} while it is read. The message we sent you is in <Link className="word" href="/notifications">your notifications</Link>.</p>
            <p>You have {AI_ANSWER_DAYS} days, until {day(answerDeadline(c.opened.createdAt))}, to answer. What helps: drafts, notes, a writing record, an account of how it was made. A person reads your answer and decides. No detector&apos;s score is used.</p>
            <form className="stack" method="post" action="/api/standing/appeal">
              <input type="hidden" name="caseKind" value={c.kind} /><input type="hidden" name="caseId" value={c.id} />
              <div className="field-row"><label htmlFor={`answer-${c.id}`}>Your answer</label>
                <textarea className="textarea" id={`answer-${c.id}`} name="text" required minLength={20} maxLength={5000} />
                <span className="hint">Files can go to {REPORTS_ADDRESS}; say here that you have sent them.</span></div>
              <div><button className="btn solid" type="submit">Send your answer</button></div>
            </form>
          </section>
        ))}

        {standing === "suspended" && (
          <section className="prose">
            <p>A suspension is not a decision. It means a serious report is being reviewed by a person, and {page ? "your page and its launches are hidden" : "your account can't post"} until it is settled. You can still read the site{page ? ", and your page, works and followers are kept as they were" : ""}.</p>
            <p>We never say who made a report.</p>
          </section>
        )}
        {standing === "banned" && (
          <section className="prose">
            <p>A ban means the page is gone from the site and from search, its launches are off the board, and the account can&apos;t make another page. It was a person&apos;s decision on what was reported and what you answered.</p>
          </section>
        )}

        {state === "open" && (
          <form className="stack notice" method="post" action="/api/standing/appeal">
            <h2 className="sc">{standing === "banned" ? "Appeal" : "Answer"}</h2>
            <p>There is one, in writing{s.sanction ? `, by ${day(appealDeadline(s.sanction.createdAt))}` : ""}. Say what you want looked at again, and why.</p>
            <div className="field-row"><label htmlFor="appeal-text">What you want us to read</label>
              <textarea className="textarea" id="appeal-text" name="text" required minLength={20} maxLength={5000} />
              <span className="hint">Files can go to {REPORTS_ADDRESS}; say here that you have sent them.</span></div>
            <div><button className="btn solid" type="submit">Send</button></div>
          </form>
        )}
        {state === "used" && (
          <section className="notice stack">
            <h2 className="sc">What you sent</h2>
            {s.appeals.map((a) => <blockquote key={a.id} className="standing-quote">{a.note}</blockquote>)}
            <p>{s.appealDecision ? "It has been read and decided; the outcome is in your notifications." : "A person is reading it. You'll be told what is decided."}</p>
          </section>
        )}
        {state === "late" && <p className="notice">The {APPEAL_DAYS} days for an appeal have passed. You can still write to {mail}.</p>}

        {standing === "good" && cases.length === 0 && (
          <section className="prose">
            <p>Nothing is open about you. If something of yours is ever reported, a person looks at it, and you&apos;re told what was decided either way.</p>
            <p>Questions about a decision can go to {mail}.</p>
          </section>
        )}
      </div>
    </main>
  );
}
