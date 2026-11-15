/**
 * app/(site)/admin/reports/page.tsx
 *
 * The queue (docs/product-structure.md, section 6): open reports grouped by
 * what they are about, ordered by how many separate accounts reported it and
 * then by how visible it is, a live launch today first. The order is only
 * where to look first. Nothing is hidden or sanctioned by being in it.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { queue } from "@/lib/trust/cases";
import { decisionLabel } from "@/lib/trust/policy";
import { REASONS, reasonLabel, TARGET_LABELS } from "@/lib/trust/reasons";
import { AdminNav, Flash, StandingWord, when } from "../_ui";

export const dynamic = "force-dynamic";

export default async function Reports({ searchParams }: { searchParams: Promise<{ status?: string; reason?: string; done?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "decided" ? "decided" : "open";
  const reason = REASONS.find((r) => r.key === sp.reason)?.key;
  const groups = await queue({ status, reason }, new Date());
  const link = (next: { status?: string; reason?: string }) => {
    const q = new URLSearchParams();
    const s = next.status ?? status; const r = "reason" in next ? next.reason : reason;
    if (s === "decided") q.set("status", "decided");
    if (r) q.set("reason", r);
    const qs = q.toString();
    return qs ? `/admin/reports?${qs}` : "/admin/reports";
  };

  return (
    <main className="wrap admin">
      <div className="page-head"><h1>Reports</h1><p>Most reported first, then most visible. A reporter whose earlier reports were mostly unfounded counts for less in the order, and is still shown.</p></div>
      <AdminNav at="/admin/reports" />
      <Flash done={sp.done} error={sp.error} />
      <div className="kinds" role="group" aria-label="Open or decided">
        <Link href={link({ status: "open" })} aria-current={status === "open" ? "true" : undefined}>Open</Link>
        <Link href={link({ status: "decided" })} aria-current={status === "decided" ? "true" : undefined}>Decided</Link>
      </div>
      <div className="kinds" role="group" aria-label="Reason">
        <Link href={link({ reason: undefined })} aria-current={!reason ? "true" : undefined}>Every reason</Link>
        {REASONS.map((r) => <Link key={r.key} href={link({ reason: r.key })} aria-current={reason === r.key ? "true" : undefined}>{r.label}</Link>)}
      </div>

      {groups.length === 0 ? <p className="admin-empty">{status === "open" ? "Nothing is waiting." : "Nothing has been decided yet."}</p> : (
        <ol className="admin-queue">
          {groups.map((g) => {
            const t = g.target;
            const discounted = g.reports.filter((r) => r.weight < 1).length;
            return (
              <li key={`${g.kind}:${g.id}`}>
                <div className="admin-queue-head">
                  <span className="sc">{TARGET_LABELS[g.kind]}</span>
                  <h2><Link href={`/admin/reports/${g.kind}/${g.id}`}>{t ? t.title : "Something that is no longer here"}</Link></h2>
                  {t?.liveToday && !t.hidden && <span className="flag admin-flag">Live today</span>}
                </div>
                <p className="admin-meta">
                  <span>{g.reporters} {g.reporters === 1 ? "account" : "separate accounts"}</span>
                  <span>{g.reasons.map(reasonLabel).join("; ")}</span>
                  {t && <span>Now: {t.state}</span>}
                  {t?.href && <a className="word" href={t.href}>See it on the site</a>}
                </p>
                {t && (
                  <p className="admin-meta">
                    <span>{t.author ? <Link className="word" href={`/admin/authors/${t.author.id}`}>{t.author.name}</Link> : t.ownerName}</span>
                    <StandingWord standing={t.author?.standing ?? t.ownerStanding} />
                    <span>{g.priorDecisions === 0 ? "No earlier decisions" : `${g.priorDecisions} earlier ${g.priorDecisions === 1 ? "decision" : "decisions"}`}</span>
                    {discounted > 0 && <span>{discounted} of these reporters {discounted === 1 ? "has" : "have"} mostly unfounded reports</span>}
                  </p>
                )}
                <ul className="admin-notes">
                  {g.reports.slice(0, 4).map((r) => (
                    <li key={r.id}><b>{reasonLabel(r.reason)}.</b> {r.note} <small>{when(r.createdAt)}{r.status === "decided" ? `. ${decisionLabel(r.decision)}` : ""}</small></li>
                  ))}
                  {g.reports.length > 4 && <li><Link className="word" href={`/admin/reports/${g.kind}/${g.id}`}>{g.reports.length - 4} more</Link></li>}
                </ul>
                <Link className="word" href={`/admin/reports/${g.kind}/${g.id}`}>Open the case</Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
