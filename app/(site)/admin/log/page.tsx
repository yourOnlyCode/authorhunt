/**
 * app/(site)/admin/log/page.tsx
 *
 * moderation_log, newest first. It is append-only: this page reads it and
 * offers nothing that changes it.
 */

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logPage } from "@/lib/trust/cases";
import { actionLabel } from "@/lib/trust/policy";
import { isTargetKind, TARGET_LABELS } from "@/lib/trust/reasons";
import { AdminNav, when } from "../_ui";

export const dynamic = "force-dynamic";
const SIZE = 50;

function targetLink(kind: string, id: string) {
  if (kind === "author") return <Link className="word" href={`/admin/authors/${id}`}>Page</Link>;
  if (isTargetKind(kind)) return <Link className="word" href={`/admin/reports/${kind}/${id}`}>{TARGET_LABELS[kind]}</Link>;
  if (kind === "reference") return <span>Reference name: {id}</span>;
  return <span>{kind === "user" ? "Account" : kind}: {id}</span>;
}

export default async function LogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(sp.page ?? "1", 10) || 1));
  const { rows, total } = await logPage(page, SIZE);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  return (
    <main className="wrap admin">
      <div className="page-head"><h1>The log</h1><p>Every moderation step: who, what, about what, and why. {total} {total === 1 ? "entry" : "entries"}.</p></div>
      <AdminNav at="/admin/log" />
      {rows.length === 0 ? <p className="admin-empty">Nothing has been logged{page > 1 ? " on this page" : ""}.</p> : (
        <div className="admin-scroll"><table className="table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>About</th><th>Note</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className="admin-nowrap">{when(r.createdAt)}</td><td>{r.actorName}</td><td>{actionLabel(r.action)}</td><td>{targetLink(r.targetKind, r.targetId)}</td><td>{r.note}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <nav className="admin-pager" aria-label="Pages of the log">
        {page > 1 ? <Link className="word" href={page === 2 ? "/admin/log" : `/admin/log?page=${page - 1}`}>Newer</Link> : <span />}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Link className="word" href={`/admin/log?page=${page + 1}`}>Older</Link> : <span />}
      </nav>
    </main>
  );
}
