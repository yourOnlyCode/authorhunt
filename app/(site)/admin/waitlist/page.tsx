/**
 * app/(site)/admin/waitlist/page.tsx
 *
 * The waitlist before opening (docs/launch.md): how many joined each day, as
 * authors and as readers, how many confirmed, and where they came from. The
 * day is a launch day, New York's, like every other day on the site.
 */

import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DAY_ZONE, formatDay } from "@/lib/ranking/day";
import { rowsOf } from "@/lib/sql";
import { AdminNav } from "../_ui";

export const dynamic = "force-dynamic";

type DayRow = { day: string; authors: number; readers: number; confirmed: number };
type SrcRow = { src: string | null; total: number; confirmed: number };
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%");

export default async function Waitlist() {
  await requireAdmin();
  const [days, sources] = await Promise.all([
    db.execute(sql`select to_char(created_at at time zone ${DAY_ZONE}, 'YYYY-MM-DD') as day,
        count(*) filter (where kind = 'author')::int as authors, count(*) filter (where kind = 'reader')::int as readers,
        count(*) filter (where confirmed_at is not null)::int as confirmed
      from waitlist group by 1 order by 1 desc limit 120`).then((r) => rowsOf<DayRow>(r)),
    db.execute(sql`select src, count(*)::int as total, count(*) filter (where confirmed_at is not null)::int as confirmed from waitlist group by src order by 2 desc limit 60`).then((r) => rowsOf<SrcRow>(r)),
  ]);
  const total = sources.reduce((a, s) => a + s.total, 0);
  const confirmed = sources.reduce((a, s) => a + s.confirmed, 0);
  const authorCount = days.reduce((a, d) => a + d.authors, 0);
  const readerCount = days.reduce((a, d) => a + d.readers, 0);

  return (
    <main className="wrap admin">
      <div className="page-head"><h1>The waitlist</h1><p>Each confirmed address gets an invitation on opening day. Unconfirmed ones get nothing more than the one reminder.</p></div>
      <AdminNav at="/admin/waitlist" />
      <ul className="admin-counts">
        <li><div><b>{total}</b><span>{total === 1 ? "address" : "addresses"}</span></div></li>
        <li><div><b>{confirmed}</b><span>confirmed</span><small>{pct(confirmed, total)} of the list</small></div></li>
        <li><div><b>{authorCount}</b><span>{authorCount === 1 ? "author" : "authors"}</span></div></li>
        <li><div><b>{readerCount}</b><span>{readerCount === 1 ? "reader" : "readers"}</span></div></li>
      </ul>
      {/* A file download, not a page, so a plain link: next/link would try to fetch it as one. */}
      <p className="admin-aside"><a className="word" href="/api/admin/waitlist/export" download>Download the list as a CSV</a>. It holds people&apos;s addresses: keep it off shared drives.</p>

      <section className="sec">
        <header><h2>By day</h2></header>
        {days.length === 0 ? <p className="admin-empty">Nobody has joined yet.</p> : (
          <div className="admin-scroll"><table className="table">
            <thead><tr><th>Day</th><th>Authors</th><th>Readers</th><th>Joined</th><th>Confirmed</th></tr></thead>
            <tbody>{days.map((d) => (
              <tr key={d.day}><td>{formatDay(d.day)}</td><td>{d.authors}</td><td>{d.readers}</td><td>{d.authors + d.readers}</td><td>{d.confirmed} ({pct(d.confirmed, d.authors + d.readers)})</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      <section className="sec">
        <header><h2>By source</h2><span>The src a link carried</span></header>
        {sources.length === 0 ? <p className="admin-empty">Nothing yet.</p> : (
          <div className="admin-scroll"><table className="table">
            <thead><tr><th>Source</th><th>Joined</th><th>Confirmed</th></tr></thead>
            <tbody>{sources.map((s) => <tr key={s.src ?? ""}><td>{s.src ?? "No source"}</td><td>{s.total}</td><td>{s.confirmed} ({pct(s.confirmed, s.total)})</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </main>
  );
}
