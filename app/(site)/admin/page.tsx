/**
 * app/(site)/admin/page.tsx
 *
 * The desk: what is waiting for the owner, as counts that link to the place
 * each is dealt with.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { deskCounts } from "@/lib/trust/cases";
import { AdminNav } from "./_ui";

export const dynamic = "force-dynamic";

export default async function Desk() {
  await requireAdmin();
  const c = await deskCounts();
  const rate = c.wl_total > 0 ? Math.round((c.wl_confirmed / c.wl_total) * 100) : 0;
  return (
    <main className="wrap admin">
      <div className="page-head"><h1>The desk</h1><p>Reports are reviewed by a person. Every decision here is yours, and is written to the log with your note.</p></div>
      <AdminNav at="/admin" />
      <section className="sec">
        <header><h2>Waiting</h2></header>
        <ul className="admin-counts">
          <li><Link href="/admin/reports"><b>{c.open_cases}</b><span>{c.open_cases === 1 ? "open case" : "open cases"}</span><small>{c.open_reports} open {c.open_reports === 1 ? "report" : "reports"} in all</small></Link></li>
          <li><Link href="/admin/reports?reason=undeclared_ai"><b>{c.ai_cases}</b><span>about AI-written work</span><small>Each follows the seven-day process</small></Link></li>
          <li><Link href="/admin/authors?standing=suspended"><b>{c.suspended}</b><span>{c.suspended === 1 ? "suspended page" : "suspended pages"}</span><small>{c.banned} banned</small></Link></li>
          <li><Link href="/admin/references"><b>{c.refs}</b><span>reference {c.refs === 1 ? "name" : "names"} awaiting approval</span><small>Usable now; no public page until approved</small></Link></li>
        </ul>
      </section>
      <section className="sec">
        <header><h2>The waitlist</h2><Link className="word" href="/admin/waitlist">By day and source</Link></header>
        <ul className="admin-counts">
          <li><Link href="/admin/waitlist"><b>{c.wl_total}</b><span>{c.wl_total === 1 ? "address" : "addresses"}</span></Link></li>
          <li><Link href="/admin/waitlist"><b>{c.wl_confirmed}</b><span>confirmed</span><small>{rate}% of the list</small></Link></li>
          <li><Link href="/admin/waitlist"><b>{c.wl_authors}</b><span>{c.wl_authors === 1 ? "author" : "authors"}</span></Link></li>
          <li><Link href="/admin/waitlist"><b>{c.wl_readers}</b><span>{c.wl_readers === 1 ? "reader" : "readers"}</span></Link></li>
        </ul>
      </section>
      <section className="sec">
        <header><h2>Places</h2></header>
        <ul className="admin-places">
          <li><Link className="word" href="/admin/reports">The report queue</Link> <span>Open reports, most reported and most visible first.</span></li>
          <li><Link className="word" href="/admin/authors">Pages by standing</Link> <span>Find a page; suspend, restore or ban it.</span></li>
          <li><Link className="word" href="/admin/log">The moderation log</Link> <span>Every step taken, newest first. Nothing is ever edited or removed from it.</span></li>
          <li><Link className="word" href="/admin/references">Reference names</Link> <span>Approve, correct or merge the names authors typed in.</span></li>
          <li><Link className="word" href="/admin/waitlist">The waitlist</Link> <span>Counts, and the list as a CSV.</span></li>
        </ul>
      </section>
    </main>
  );
}
