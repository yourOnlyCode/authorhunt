/**
 * app/owner/page.tsx
 *
 * The owner's view of the waiting list before sign-in exists. It is opened
 * with the preview secret (visit /?preview=<secret> once, which sets a
 * cookie), and is not found for everyone else. It shows counts only; the
 * addresses themselves stay in the database.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/sql";
import { launchAt } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The list", robots: { index: false, follow: false } };

type DayRow = { day: string; joined: number; confirmed: number };
type SrcRow = { src: string | null; joined: number; confirmed: number };
type ViewRow = { day: string; views: number };

export default async function Owner() {
  const secret = process.env.PREVIEW_SECRET;
  const held = (await cookies()).get("ah_preview")?.value;
  if (!secret || held !== secret) notFound();

  const [totals] = rowsOf<{ total: number; confirmed: number; authors: number; readers: number }>(await db.execute(sql`
    select count(*)::int as total, count(confirmed_at)::int as confirmed,
           count(*) filter (where kind = 'author')::int as authors, count(*) filter (where kind = 'reader')::int as readers
    from waitlist`));
  const days = rowsOf<DayRow>(await db.execute(sql`
    select to_char((created_at at time zone 'America/New_York')::date, 'YYYY-MM-DD') as day, count(*)::int as joined, count(confirmed_at)::int as confirmed
    from waitlist group by 1 order by 1 desc limit 30`));
  const sources = rowsOf<SrcRow>(await db.execute(sql`
    select src, count(*)::int as joined, count(confirmed_at)::int as confirmed from waitlist group by 1 order by 2 desc limit 20`));
  const views = rowsOf<ViewRow>(await db.execute(sql`
    select to_char(day, 'YYYY-MM-DD') as day, count(*)::int as views from site_events where kind = 'view' and path = '/' group by 1 order by 1 desc limit 30`));
  const viewsBy = new Map(views.map((v) => [v.day, Number(v.views)]));
  const t = totals ?? { total: 0, confirmed: 0, authors: 0, readers: 0 };
  const opens = launchAt();
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "");

  return (
    <main className="wrap" style={{ maxWidth: 860, paddingBottom: 72 }}>
      <div className="page-head">
        <h1>The list</h1>
        <p>{t.total} joined, {t.confirmed} confirmed ({pct(t.confirmed, t.total) || "none yet"}). {t.authors} authors, {t.readers} readers.{opens ? ` Opening ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "America/New_York" }).format(opens)} Eastern.` : " No opening time is set."}</p>
      </div>
      <h2 className="label" style={{ marginTop: 32 }}>By day (Eastern)</h2>
      {days.length === 0 ? <p style={{ marginTop: 12 }}>Nobody has joined yet.</p> : (
        <table className="table" style={{ marginTop: 8 }}>
          <thead><tr><th>Day</th><th>Visits</th><th>Joined</th><th>Confirmed</th><th>Visits that joined</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.day}><td>{d.day}</td><td>{viewsBy.get(d.day) ?? 0}</td><td>{d.joined}</td><td>{d.confirmed}</td><td>{pct(Number(d.joined), viewsBy.get(d.day) ?? 0)}</td></tr>)}</tbody>
        </table>
      )}
      <h2 className="label" style={{ marginTop: 36 }}>By link (the ?src= on the address people came through)</h2>
      {sources.length === 0 ? <p style={{ marginTop: 12 }}>Nothing yet.</p> : (
        <table className="table" style={{ marginTop: 8 }}>
          <thead><tr><th>Link</th><th>Joined</th><th>Confirmed</th></tr></thead>
          <tbody>{sources.map((s) => <tr key={s.src ?? "none"}><td>{s.src ?? "(none)"}</td><td>{s.joined}</td><td>{s.confirmed}</td></tr>)}</tbody>
        </table>
      )}
      <p style={{ marginTop: 28, color: "var(--muted)" }}>Visits are counted without cookies and include repeat visits. Addresses are in the waitlist table in Supabase.</p>
    </main>
  );
}
