/**
 * /studio/analytics: how many readers came to your pages and what they
 * pressed, from the site's own count (no cookie). Everyone gets the last
 * seven days as totals. The day-by-day record, where readers came from and
 * which links they pressed are a member tool (docs/monetization.md); a free
 * author sees that described under their totals.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { siteEvents } from "@/lib/db/schema";
import { hostOf } from "@/lib/seo/links";
import { addDays, formatDay, launchDay } from "@/lib/ranking/day";
import { requireAuthor } from "@/lib/studio/page";

export const metadata: Metadata = { title: "Analytics" };

const MEMBER_DAYS = 90;
const count = sql<number>`count(*)::int`;

export default async function AnalyticsPage() {
  const { author } = await requireAuthor("/studio/analytics");
  const member = await isMember(author);
  const today = launchDay(new Date());
  const weekStart = addDays(today, -6);
  const mine = eq(siteEvents.authorId, author.id);

  const week = await db.select({ kind: siteEvents.kind, n: count }).from(siteEvents).where(and(mine, gte(siteEvents.day, weekStart))).groupBy(siteEvents.kind);
  const weekOf = (kind: "view" | "click") => week.find((w) => w.kind === kind)?.n ?? 0;

  const since = addDays(today, -(MEMBER_DAYS - 1));
  const full = member ? await Promise.all([
    db.select({ day: siteEvents.day, kind: siteEvents.kind, n: count }).from(siteEvents).where(and(mine, gte(siteEvents.day, since))).groupBy(siteEvents.day, siteEvents.kind),
    db.select({ via: siteEvents.via, n: count }).from(siteEvents).where(and(mine, gte(siteEvents.day, since), eq(siteEvents.kind, "view"), isNotNull(siteEvents.via))).groupBy(siteEvents.via).orderBy(desc(count)).limit(12),
    db.select({ target: siteEvents.target, n: count }).from(siteEvents).where(and(mine, gte(siteEvents.day, since), eq(siteEvents.kind, "click"), isNotNull(siteEvents.target))).groupBy(siteEvents.target).orderBy(desc(count)).limit(20),
    db.select({ path: siteEvents.path, n: count }).from(siteEvents).where(and(mine, gte(siteEvents.day, since), eq(siteEvents.kind, "view"))).groupBy(siteEvents.path).orderBy(desc(count)).limit(10),
  ]) : null;

  const days: { day: string; views: number; clicks: number }[] = [];
  if (full) {
    const byDay = new Map<string, { views: number; clicks: number }>();
    for (const r of full[0]) {
      const d = byDay.get(String(r.day)) ?? { views: 0, clicks: 0 };
      if (r.kind === "view") d.views = r.n; else d.clicks = r.n;
      byDay.set(String(r.day), d);
    }
    for (let i = MEMBER_DAYS - 1; i >= 0; i--) { const day = addDays(today, -i); days.push({ day, ...(byDay.get(day) ?? { views: 0, clicks: 0 }) }); }
  }
  const peak = Math.max(1, ...days.map((d) => d.views));
  const totalViews = days.reduce((s, d) => s + d.views, 0);
  const totalClicks = days.reduce((s, d) => s + d.clicks, 0);
  const active = days.filter((d) => d.views > 0 || d.clicks > 0).reverse();

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Analytics</h1>
        <p>Visits to your page and your works&rsquo; pages, and the links readers pressed there. Counted by the site itself, with no cookie, by New York days.</p>
      </div>

      <section className="studio-part">
        <h2>The last seven days</h2>
        <dl className="studio-totals">
          <div><dt>Page views</dt><dd>{weekOf("view")}</dd></div>
          <div><dt>Links pressed</dt><dd>{weekOf("click")}</dd></div>
          <div><dt>Followers</dt><dd>{author.followerCount}</dd></div>
        </dl>
        <p className="hint">{formatDay(weekStart, { month: "long", day: "numeric" })} to {formatDay(today, { month: "long", day: "numeric" })}.</p>
      </section>

      {!full ? (
        <section className="studio-part">
          <h2>The full record</h2>
          <div className="studio-quiet">
            <p>Day by day for ninety days, where your readers came from, and which of your links they pressed are a member tool. <Link className="word" href="/pricing">See member tools</Link></p>
          </div>
        </section>
      ) : (
        <>
          <section className="studio-part">
            <h2>Ninety days</h2>
            <p>{totalViews} page {totalViews === 1 ? "view" : "views"} and {totalClicks} {totalClicks === 1 ? "link" : "links"} pressed since {formatDay(since, { month: "long", day: "numeric" })}.</p>
            <div className="studio-chart" role="img" aria-label={`Page views by day for ninety days. The busiest day had ${peak === 1 && totalViews === 0 ? 0 : peak}.`}>
              {days.map((d) => <span key={d.day} title={`${formatDay(d.day, { month: "short", day: "numeric" })}: ${d.views}`} style={{ height: `${Math.round((d.views / peak) * 100)}%` }} />)}
            </div>
            <p className="studio-chart-ends"><span>{formatDay(since, { month: "short", day: "numeric" })}</span><span>Today</span></p>
            {active.length === 0 ? <p className="studio-empty">Nothing counted yet. Share your short link and it will start to fill.</p> : (
              <table className="table studio-table">
                <thead><tr><th scope="col">Day</th><th scope="col" className="num">Page views</th><th scope="col" className="num">Links pressed</th></tr></thead>
                <tbody>{active.slice(0, 30).map((d) => <tr key={d.day}><td>{formatDay(d.day)}</td><td className="num">{d.views}</td><td className="num">{d.clicks}</td></tr>)}</tbody>
              </table>
            )}
            {active.length > 30 && <p className="hint">The thirty most recent days with any visits are listed; the chart shows all ninety.</p>}
          </section>

          <section className="studio-part">
            <h2>Where readers came from</h2>
            <p className="hint">A link shared from Author Hunt says where it was shared, so a visit through it can be counted here.</p>
            {full[1].length === 0 ? <p className="studio-empty">No visits through a shared link yet.</p> : (
              <table className="table studio-table">
                <thead><tr><th scope="col">Through</th><th scope="col" className="num">Page views</th></tr></thead>
                <tbody>{full[1].map((r) => <tr key={r.via}><td>{r.via}</td><td className="num">{r.n}</td></tr>)}</tbody>
              </table>
            )}
          </section>

          <section className="studio-part">
            <h2>Links readers pressed</h2>
            {full[2].length === 0 ? <p className="studio-empty">No link has been pressed yet.</p> : (
              <table className="table studio-table">
                <thead><tr><th scope="col">Link</th><th scope="col" className="num">Pressed</th></tr></thead>
                <tbody>{full[2].map((r) => <tr key={r.target}><td><b>{hostOf(r.target ?? "")}</b><small className="studio-break">{r.target}</small></td><td className="num">{r.n}</td></tr>)}</tbody>
              </table>
            )}
          </section>

          <section className="studio-part">
            <h2>Pages viewed</h2>
            {full[3].length === 0 ? <p className="studio-empty">No views yet.</p> : (
              <table className="table studio-table">
                <thead><tr><th scope="col">Page</th><th scope="col" className="num">Views</th></tr></thead>
                <tbody>{full[3].map((r) => <tr key={r.path}><td className="studio-break">{r.path}</td><td className="num">{r.n}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
