/**
 * lib/cron/notifications.ts
 *
 * The email side of notifications (docs/product-structure.md §4). Routes
 * write rows with notify(); this job is the one queue they are mailed from,
 * so batching and quiet hours live in one place.
 *
 * - Kinds marked emailNow are mailed on the next run, all of a person's in
 *   one email. A launch day must not send a hundred messages.
 * - The rest (cheers, followers, updates from followed authors) wait for one
 *   summary in the evening, at most once a day.
 * - Between 9pm and 8am New York time only decisions are sent. We don't store
 *   a person's time zone, so this is loose on purpose.
 *
 * A person's choice per kind is applied when the row is written: notify()
 * marks a row as already mailed if they turned that email off. So this job
 * only ever looks for emailedAt null.
 *
 * Rows are marked before the email leaves, and only the rows that this run
 * marked are mailed. Two runs at once can't both send, and a failed send is
 * a missed email rather than a repeated one.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { notifications, users } from "../db/schema";
import { NOTIFICATION_KINDS } from "../actions/notify";
import { sendEmail } from "../emails/send";
import { eveningSummary, launchClosed, launchLive, notificationDigest, notifyRequestLive, type Mail } from "../emails/templates";
import { dayStart, launchDay } from "../ranking/day";
import { rowsOf } from "../sql";
import { batchByUser, collapse, EVENING_FROM, inEmailQuietHours, inEveningWindow, mailPlan, type PendingNotification } from "./pure";
import { launchForMail } from "./day";

const MAX_ROWS = 5000;
/** Rows older than this are let go unsent: news from last week is not news. */
const STALE_DAYS = 3;

const emailNow = (kind: string) => (NOTIFICATION_KINDS as Record<string, { emailNow: boolean }>)[kind]?.emailNow ?? false;

/**
 * Whether tonight's summary already went to these people. There is no
 * "summary sent" column, so it is read from the rows themselves: a summary
 * kind mailed since this evening's window opened. notify() also fills
 * emailedAt, at the moment the row is made, for someone who turned the email
 * off; those are told apart by having been "mailed" the instant they were
 * created.
 */
async function summarySentTonight(userIds: string[], now: Date): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const windowStart = new Date(dayStart(launchDay(now)).getTime() + EVENING_FROM * 3_600_000);
  const summaryKinds = Object.entries(NOTIFICATION_KINDS).filter(([, v]) => !v.emailNow).map(([k]) => k);
  const rows = rowsOf<{ user_id: string }>(await db.execute(sql`
    select distinct user_id from notifications
    where user_id in (${sql.join(userIds.map((u) => sql`${u}`), sql`, `)})
      and kind in (${sql.join(summaryKinds.map((k) => sql`${k}`), sql`, `)})
      and emailed_at >= ${windowStart.toISOString()}
      and emailed_at - created_at > interval '5 seconds'`));
  return new Set(rows.map((r) => r.user_id));
}

/** Mark rows as mailed and return the ones this run won. */
async function claim(rows: PendingNotification[], now: Date): Promise<PendingNotification[]> {
  if (!rows.length) return [];
  const won = await db.update(notifications).set({ emailedAt: now })
    .where(and(inArray(notifications.id, rows.map((r) => r.id)), isNull(notifications.emailedAt))).returning({ id: notifications.id });
  const ids = new Set(won.map((w) => w.id));
  return rows.filter((r) => ids.has(r.id));
}

/**
 * A single notification about a launch gets the fuller email written for it.
 * The row's group key names the launch (lib/cron/day.ts writes them).
 */
async function single(row: PendingNotification): Promise<Mail | null> {
  const [what, launchId] = (row.groupKey ?? "").split(":");
  if (!launchId || !["launch-live", "launch-closed", "notify-live"].includes(what ?? "")) return null;
  const launch = await launchForMail(launchId);
  if (!launch) return null;
  if (what === "launch-live") return launchLive({ ...launch, title: launch.ownTitle });
  if (what === "launch-closed") return launchClosed({ ...launch, title: launch.ownTitle });
  return notifyRequestLive({ ...launch, account: true });
}

export async function mailNotifications(now: Date) {
  const stale = new Date(now.getTime() - STALE_DAYS * 86_400_000);
  const expired = await db.update(notifications).set({ emailedAt: sql`${notifications.createdAt}` })
    .where(and(isNull(notifications.emailedAt), sql`${notifications.createdAt} < ${stale.toISOString()}`)).returning({ id: notifications.id });

  const pending = await db.select({
    id: notifications.id, userId: notifications.userId, kind: notifications.kind, title: notifications.title, body: notifications.body,
    href: notifications.href, groupKey: notifications.groupKey, createdAt: notifications.createdAt,
    email: users.email, name: users.displayName, standing: users.standing,
  }).from(notifications).innerJoin(users, eq(notifications.userId, users.id))
    .where(isNull(notifications.emailedAt)).orderBy(notifications.createdAt).limit(MAX_ROWS);

  const people = new Map(pending.map((p) => [p.userId, { email: p.email, name: p.name, standing: p.standing }]));
  const batches = batchByUser(pending, emailNow);
  const quiet = inEmailQuietHours(now);
  const evening = inEveningWindow(now);
  const sent = evening ? await summarySentTonight(batches.filter((b) => b.evening.length).map((b) => b.userId), now) : new Set<string>();

  let prompt = 0;
  let summaries = 0;
  let held = 0;
  for (const batch of batches) {
    const person = people.get(batch.userId);
    // A banned account can't sign in to read what the email points to. Suspended people still hear decisions.
    if (!person || !person.email || person.standing === "banned") { await claim([...batch.now, ...batch.evening], now); continue; }
    const plan = mailPlan(batch, { quiet, evening, summarySentToday: sent.has(batch.userId) });
    held += batch.now.length + batch.evening.length - plan.now.length - plan.evening.length;

    const mine = await claim(plan.now, now);
    if (mine.length) {
      const [only] = mine;
      const mail = (mine.length === 1 && only ? await single(only) : null) ?? notificationDigest({ name: person.name, lines: collapse(mine) });
      await sendEmail({ to: person.email, ...mail });
      prompt += 1;
    }
    const tonight = await claim(plan.evening, now);
    if (tonight.length) {
      await sendEmail({ to: person.email, ...eveningSummary({ name: person.name, day: launchDay(now), lines: collapse(tonight) }) });
      summaries += 1;
    }
  }
  return { pending: pending.length, promptEmails: prompt, eveningSummaries: summaries, heldForLater: held, expired: expired.length, quietHours: quiet, eveningWindow: evening };
}
