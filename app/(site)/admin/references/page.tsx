/**
 * app/(site)/admin/references/page.tsx
 *
 * Names authors typed under "for readers of" and "inspired by" that nobody
 * has approved yet. Each is already usable on the pages that list it; approval
 * is what lets its public page exist. Most need one of three things: approve,
 * fix the spelling, or merge into the name that was already there.
 */

import { asc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { referenceAuthors } from "@/lib/db/schema";
import { rowsOf } from "@/lib/sql";
import { AdminNav, Flash, Hidden } from "../_ui";

export const dynamic = "force-dynamic";
const BACK = "/admin/references";

export default async function References({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [waiting, approved, used] = await Promise.all([
    db.select().from(referenceAuthors).where(eq(referenceAuthors.approved, false)).orderBy(asc(referenceAuthors.name)),
    db.select().from(referenceAuthors).where(eq(referenceAuthors.approved, true)).orderBy(asc(referenceAuthors.name)),
    db.execute(sql`select s as slug, count(*)::int as n from (select unnest(readers_of || inspired_by) as s from authors) x group by s`).then((r) => rowsOf<{ slug: string; n: number }>(r)),
  ]);
  const uses = new Map(used.map((u) => [u.slug, u.n]));
  return (
    <main className="wrap admin">
      <div className="page-head"><h1>Reference names</h1><p>{waiting.length === 0 ? "No name is waiting." : `${waiting.length} ${waiting.length === 1 ? "name is" : "names are"} waiting.`} A name is usable as soon as an author types it; it gets a public page once approved.</p></div>
      <AdminNav at="/admin/references" />
      <Flash done={sp.done} error={sp.error} />
      {waiting.length > 0 && (
        <ul className="admin-refs">
          {waiting.map((r) => (
            <li key={r.slug}>
              <div><h2>{r.name}</h2><small>{r.slug} · listed {uses.get(r.slug) ?? 0} {(uses.get(r.slug) ?? 0) === 1 ? "time" : "times"}</small></div>
              <form method="post" action="/api/admin/references"><Hidden values={{ slug: r.slug, back: BACK, action: "approve" }} /><button className="btn" type="submit">Approve</button></form>
              <form method="post" action="/api/admin/references" className="admin-inline"><Hidden values={{ slug: r.slug, back: BACK, action: "rename" }} />
                <label className="visually-hidden" htmlFor={`rn-${r.slug}`}>The name as it should read</label>
                <input className="input" id={`rn-${r.slug}`} name="name" defaultValue={r.name} required minLength={2} maxLength={120} /><button className="word" type="submit">Fix the spelling</button></form>
              <form method="post" action="/api/admin/references" className="admin-inline"><Hidden values={{ slug: r.slug, back: BACK, action: "merge" }} />
                <label className="visually-hidden" htmlFor={`mg-${r.slug}`}>Merge into</label>
                <select className="select" id={`mg-${r.slug}`} name="into" required defaultValue=""><option value="" disabled>Merge into…</option>
                  {approved.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
                  {waiting.filter((w) => w.slug !== r.slug).map((a) => <option key={a.slug} value={a.slug}>{a.name} (waiting)</option>)}
                </select><button className="word" type="submit">Merge</button></form>
            </li>
          ))}
        </ul>
      )}
      <section className="sec">
        <header><h2>Approved</h2><span>{approved.length} {approved.length === 1 ? "name" : "names"}</span></header>
        <p className="admin-approved">{approved.map((a) => a.name).join(" · ") || "None yet."}</p>
      </section>
    </main>
  );
}
