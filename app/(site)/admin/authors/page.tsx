/**
 * app/(site)/admin/authors/page.tsx
 *
 * Pages by standing, with a search by name or handle. This is where the owner
 * finds a page that nobody reported, or one that is suspended and waiting.
 */

import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors, users, type Standing } from "@/lib/db/schema";
import { AdminNav, StandingWord, onDay } from "../_ui";

export const dynamic = "force-dynamic";
const STANDINGS: { key: Standing | "all"; label: string }[] = [{ key: "all", label: "Every page" }, { key: "suspended", label: "Suspended" }, { key: "banned", label: "Banned" }, { key: "good", label: "Good standing" }];

export default async function AuthorsAdmin({ searchParams }: { searchParams: Promise<{ standing?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const standing = STANDINGS.find((s) => s.key === sp.standing)?.key ?? "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const conds = [];
  if (standing !== "all") conds.push(eq(authors.standing, standing));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(authors.name, like), ilike(authors.handle, like), ilike(users.email, like)));
  }
  const [rows, counts] = await Promise.all([
    db.select({ a: authors, email: users.email, account: users.standing }).from(authors).innerJoin(users, eq(authors.userId, users.id))
      .where(conds.length ? and(...conds) : undefined).orderBy(sql`case ${authors.standing} when 'suspended' then 0 when 'banned' then 1 else 2 end`, desc(authors.createdAt)).limit(100),
    db.select({ standing: authors.standing, n: sql<number>`count(*)::int` }).from(authors).groupBy(authors.standing),
  ]);
  const count = (k: string) => (k === "all" ? counts.reduce((a, c) => a + c.n, 0) : counts.find((c) => c.standing === k)?.n ?? 0);
  const href = (k: string) => { const p = new URLSearchParams(); if (k !== "all") p.set("standing", k); if (q) p.set("q", q); const s = p.toString(); return s ? `/admin/authors?${s}` : "/admin/authors"; };

  return (
    <main className="wrap admin">
      <div className="page-head"><h1>Pages</h1><p>A suspended page is hidden while a report is decided. A banned page is gone from the site and from search.</p></div>
      <AdminNav at="/admin/authors" />
      <div className="kinds" role="group" aria-label="Standing">
        {STANDINGS.map((s) => <Link key={s.key} href={href(s.key)} aria-current={standing === s.key ? "true" : undefined}>{s.label} ({count(s.key)})</Link>)}
      </div>
      <form className="admin-search" method="get" action="/admin/authors" role="search">
        {standing !== "all" && <input type="hidden" name="standing" value={standing} />}
        <label className="visually-hidden" htmlFor="author-q">Find a page by name, handle or email</label>
        <input className="input" id="author-q" name="q" type="search" defaultValue={q} placeholder="Name, handle or email" />
        <button className="btn" type="submit">Find</button>
      </form>
      {rows.length === 0 ? <p className="admin-empty">No page matches.</p> : (
        <div className="admin-scroll"><table className="table">
          <thead><tr><th>Page</th><th>Standing</th><th>Account</th><th>Made</th></tr></thead>
          <tbody>{rows.map(({ a, email }) => (
            <tr key={a.id}>
              <td><Link className="word" href={`/admin/authors/${a.id}`}>{a.name}</Link><small className="admin-lognote">/{a.handle}{a.publishedAt ? "" : ", not public yet"}</small></td>
              <td><StandingWord standing={a.standing} /></td>
              <td>{email}</td>
              <td>{onDay(a.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {rows.length === 100 && <p className="admin-aside">Showing the first 100. Search to narrow it.</p>}
    </main>
  );
}
