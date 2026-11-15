/**
 * lib/trust/cases.ts
 *
 * Reading and closing reports. A "case" has no table of its own
 * (docs/ontology.md): it is the open reports on one target plus the
 * moderation_log rows about it, so the queue groups reports by target and a
 * person's history is every log row about them or anything of theirs.
 */

import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { authors, moderationLog, reports, users, type ReportTarget } from "../db/schema";
import { adminEmails } from "../env";
import { rowsOf } from "../sql";
import { notify } from "../actions/notify";
import { NON_DECISIONS, orderQueue, reporterWeight, visibility } from "./policy";
import { resolveTarget, type ResolvedTarget } from "./targets";

export type ReportRow = { id: string; reporterId: string; reporterName: string; reason: string; note: string; status: "open" | "decided"; decision: string | null; decidedAt: Date | null; createdAt: Date; weight: number };
export type LogRow = { id: string; actorId: string; actorName: string; action: string; targetKind: string; targetId: string; note: string; createdAt: Date };

/** How each reporter's earlier reports ended, as the weight policy.ts gives them. */
async function weightsFor(reporterIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (reporterIds.length === 0) return out;
  const rows = await db.select({
    id: reports.reporterId,
    decided: sql<number>`count(*)::int`,
    dismissed: sql<number>`count(*) filter (where ${reports.decision} in ('dismissed', 'not_confirmed'))::int`,
  }).from(reports).where(and(eq(reports.status, "decided"), inArray(reports.reporterId, reporterIds))).groupBy(reports.reporterId);
  for (const r of rows) out.set(r.id, reporterWeight(r));
  return out;
}

export async function reportsOn(kind: ReportTarget, id: string): Promise<ReportRow[]> {
  const rows = await db.select({ r: reports, name: users.displayName }).from(reports).innerJoin(users, eq(reports.reporterId, users.id))
    .where(and(eq(reports.targetKind, kind), eq(reports.targetId, id))).orderBy(desc(reports.createdAt));
  const weights = await weightsFor([...new Set(rows.map((x) => x.r.reporterId))]);
  return rows.map(({ r, name }) => ({ id: r.id, reporterId: r.reporterId, reporterName: name, reason: r.reason, note: r.note, status: r.status, decision: r.decision, decidedAt: r.decidedAt, createdAt: r.createdAt, weight: weights.get(r.reporterId) ?? 1 }));
}

export type QueueGroup = {
  kind: ReportTarget; id: string; target: ResolvedTarget | null; reports: ReportRow[];
  reporters: number; weight: number; visibility: number; oldest: Date; reasons: string[]; priorDecisions: number;
};

/** The queue: reports grouped by what they are about, most reported and most visible first. */
export async function queue(filter: { status: "open" | "decided"; reason?: string }, now: Date, limit = 60): Promise<QueueGroup[]> {
  const conds = [eq(reports.status, filter.status)];
  if (filter.reason) conds.push(eq(reports.reason, filter.reason));
  const rows = await db.select({ r: reports, name: users.displayName }).from(reports).innerJoin(users, eq(reports.reporterId, users.id))
    .where(and(...conds)).orderBy(desc(reports.createdAt)).limit(600);
  const weights = await weightsFor([...new Set(rows.map((x) => x.r.reporterId))]);

  const groups = new Map<string, QueueGroup>();
  for (const { r, name } of rows) {
    const key = `${r.targetKind}:${r.targetId}`;
    const g = groups.get(key) ?? { kind: r.targetKind, id: r.targetId, target: null, reports: [], reporters: 0, weight: 0, visibility: 0, oldest: r.createdAt, reasons: [], priorDecisions: 0 };
    g.reports.push({ id: r.id, reporterId: r.reporterId, reporterName: name, reason: r.reason, note: r.note, status: r.status, decision: r.decision, decidedAt: r.decidedAt, createdAt: r.createdAt, weight: weights.get(r.reporterId) ?? 1 });
    if (r.createdAt < g.oldest) g.oldest = r.createdAt;
    if (!g.reasons.includes(r.reason)) g.reasons.push(r.reason);
    groups.set(key, g);
  }
  const list = [...groups.values()];
  const counted = new Map<string, number>();
  for (const g of list) {
    const seen = new Map<string, number>();
    for (const r of g.reports) seen.set(r.reporterId, r.weight);
    g.reporters = seen.size;
    g.weight = [...seen.values()].reduce((a, b) => a + b, 0);
    g.target = await resolveTarget(g.kind, g.id, now);
    g.visibility = g.target ? visibility(g.target) : 0;
    if (g.target) {
      const who = g.target.ownerUserId;
      if (!counted.has(who)) counted.set(who, await priorDecisions({ userId: who, authorId: g.target.author?.id ?? null }));
      g.priorDecisions = counted.get(who) ?? 0;
    }
  }
  // Decided reports read as a record, newest first; open ones in the order they should be looked at.
  return (filter.status === "open" ? orderQueue(list) : list).slice(0, limit);
}

/** Every log row about a person: their account, their page, and anything of theirs. */
function concerning(owner: { userId: string; authorId: string | null }): SQL {
  const parts: SQL[] = [
    sql`(m.target_kind = 'user' and m.target_id = ${owner.userId})`,
    sql`(m.target_kind = 'comment' and m.target_id in (select id::text from comments where user_id = ${owner.userId}))`,
    sql`(m.target_kind = 'image' and m.target_id in (select id::text from images where owner_user_id = ${owner.userId}))`,
    sql`(m.target_kind = 'collection' and m.target_id in (select id::text from collections where user_id = ${owner.userId}))`,
  ];
  if (owner.authorId) {
    parts.push(
      sql`(m.target_kind = 'author' and m.target_id = ${owner.authorId})`,
      sql`(m.target_kind = 'work' and m.target_id in (select id::text from works where author_id = ${owner.authorId}::uuid))`,
      sql`(m.target_kind = 'launch' and m.target_id in (select id::text from launches where author_id = ${owner.authorId}::uuid))`,
    );
  }
  return sql.join(parts, sql` or `);
}

type RawLog = { id: string; actor_id: string; actor_name: string | null; action: string; target_kind: string; target_id: string; note: string; created_at: string | Date };
const toLog = (r: RawLog): LogRow => ({ id: r.id, actorId: r.actor_id, actorName: r.actor_name ?? r.actor_id, action: r.action, targetKind: r.target_kind, targetId: r.target_id, note: r.note, createdAt: new Date(r.created_at) });

export async function historyFor(owner: { userId: string; authorId: string | null }, limit = 200): Promise<LogRow[]> {
  const res = await db.execute(sql`select m.id, m.actor_id, u.display_name as actor_name, m.action, m.target_kind, m.target_id, m.note, m.created_at
    from moderation_log m left join users u on u.id = m.actor_id where ${concerning(owner)} order by m.created_at desc limit ${limit}`);
  return rowsOf<RawLog>(res).map(toLog);
}

export async function priorDecisions(owner: { userId: string; authorId: string | null }): Promise<number> {
  const skip = sql.join(NON_DECISIONS.map((a) => sql`${a}`), sql`, `);
  const res = await db.execute(sql`select count(*)::int as n from moderation_log m where m.action not in (${skip}) and (${concerning(owner)})`);
  return rowsOf<{ n: number }>(res)[0]?.n ?? 0;
}

export async function logPage(page: number, size = 50): Promise<{ rows: LogRow[]; total: number }> {
  const rows = await db.select({ m: moderationLog, name: users.displayName }).from(moderationLog).leftJoin(users, eq(moderationLog.actorId, users.id))
    .orderBy(desc(moderationLog.createdAt)).limit(size).offset((page - 1) * size);
  const [n] = await db.select({ n: sql<number>`count(*)::int` }).from(moderationLog);
  return { rows: rows.map(({ m, name }) => ({ ...m, actorName: name ?? m.actorId })), total: n?.n ?? 0 };
}

/**
 * Closes every open report on a target with one decision and tells each
 * reporter once. The message names the thing and the outcome, never the
 * owner's answer or the admin's note.
 */
export async function decideReports(admin: { id: string }, kind: ReportTarget, id: string, decision: string, message: { title: string; body: string }): Promise<number> {
  const closed = await db.update(reports).set({ status: "decided", decision, decidedBy: admin.id, decidedAt: new Date() })
    .where(and(eq(reports.targetKind, kind), eq(reports.targetId, id), eq(reports.status, "open"))).returning({ reporterId: reports.reporterId });
  for (const reporterId of new Set(closed.map((c) => c.reporterId))) {
    await notify({ userId: reporterId, kind: "decision", title: message.title, body: message.body, href: "/notifications" });
  }
  return closed.length;
}

/** The accounts that hear about an appeal: ADMIN_EMAILS, and the sample owner in development. */
export async function adminUserIds(): Promise<string[]> {
  const conds: SQL[] = [sql`${users.id} = 'dev_admin'`];
  if (adminEmails.length > 0) conds.push(inArray(sql`lower(${users.email})`, adminEmails));
  const rows = await db.select({ id: users.id }).from(users).where(sql.join(conds, sql` or `));
  return rows.map((r) => r.id);
}

/** The steps of the undeclared-AI process recorded on one target, oldest first, from the latest time a case was opened. */
export type AiCase = { opened: LogRow | null; answers: LogRow[]; decision: LogRow | null; earlierCases: number };
export async function aiCaseOn(kind: string, id: string): Promise<AiCase> {
  const rows = await db.select({ m: moderationLog, name: users.displayName }).from(moderationLog).leftJoin(users, eq(moderationLog.actorId, users.id))
    .where(and(eq(moderationLog.targetKind, kind), eq(moderationLog.targetId, id), sql`${moderationLog.action} like 'ai_case_%'`)).orderBy(moderationLog.createdAt);
  const all: LogRow[] = rows.map(({ m, name }) => ({ ...m, actorName: name ?? m.actorId }));
  const opens = all.filter((r) => r.action === "ai_case_opened");
  const opened = opens[opens.length - 1] ?? null;
  const since = opened ? all.filter((r) => r.createdAt >= opened.createdAt) : [];
  return {
    opened,
    answers: since.filter((r) => r.action === "ai_case_answer"),
    decision: since.find((r) => r.action === "ai_case_not_confirmed" || r.action === "ai_case_confirmed") ?? null,
    earlierCases: Math.max(0, opens.length - 1),
  };
}

/** A person's latest sanction and what they have written since: what /standing and the appeal step read. */
export async function sanctionOf(owner: { userId: string; authorId: string | null }): Promise<{ sanction: LogRow | null; appeals: LogRow[]; appealDecision: LogRow | null }> {
  const history = await historyFor(owner);
  const sanction = history.find((r) => ["author_suspended", "author_banned", "user_suspended", "user_banned"].includes(r.action)) ?? null;
  const since = sanction ? history.filter((r) => r.createdAt >= sanction.createdAt) : history;
  return {
    sanction,
    appeals: since.filter((r) => r.action === "appeal").reverse(),
    appealDecision: since.find((r) => r.action === "appeal_decided") ?? null,
  };
}

export async function deskCounts() {
  const [r] = rowsOf<{ open_reports: number; open_cases: number; ai_cases: number; suspended: number; banned: number; refs: number; wl_total: number; wl_confirmed: number; wl_authors: number; wl_readers: number }>(await db.execute(sql`select
    (select count(*) from reports where status = 'open')::int as open_reports,
    (select count(*) from (select distinct target_kind, target_id from reports where status = 'open') t)::int as open_cases,
    (select count(*) from (select distinct target_kind, target_id from reports where status = 'open' and reason = 'undeclared_ai') t)::int as ai_cases,
    (select count(*) from authors where standing = 'suspended')::int as suspended,
    (select count(*) from authors where standing = 'banned')::int as banned,
    (select count(*) from reference_authors where approved = false)::int as refs,
    (select count(*) from waitlist)::int as wl_total,
    (select count(*) from waitlist where confirmed_at is not null)::int as wl_confirmed,
    (select count(*) from waitlist where kind = 'author')::int as wl_authors,
    (select count(*) from waitlist where kind = 'reader')::int as wl_readers`));
  return r ?? { open_reports: 0, open_cases: 0, ai_cases: 0, suspended: 0, banned: 0, refs: 0, wl_total: 0, wl_confirmed: 0, wl_authors: 0, wl_readers: 0 };
}

export async function authorOfUser(userId: string) {
  const [a] = await db.select().from(authors).where(eq(authors.userId, userId)).limit(1);
  return a ?? null;
}

/** The undeclared-AI cases about a person that are waiting for their answer: told, and not yet decided. */
export async function openAiCasesFor(owner: { userId: string; authorId: string | null }): Promise<{ kind: string; id: string; opened: LogRow }[]> {
  const history = await historyFor(owner);
  const out: { kind: string; id: string; opened: LogRow }[] = [];
  const seen = new Set<string>();
  for (const row of history) {
    const key = `${row.targetKind}:${row.targetId}`;
    if (row.action !== "ai_case_opened" || seen.has(key)) continue;
    seen.add(key);
    const c = await aiCaseOn(row.targetKind, row.targetId);
    if (c.opened && !c.decision) out.push({ kind: row.targetKind, id: row.targetId, opened: c.opened });
  }
  return out;
}
