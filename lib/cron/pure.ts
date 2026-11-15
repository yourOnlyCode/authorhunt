/**
 * lib/cron/pure.ts
 *
 * The decisions the scheduled jobs make, with no database and no clock of
 * their own (pass `now` in), so they can be tested. The jobs in this folder
 * read rows, ask these functions what to do, and write.
 */

import { DAY_ZONE, hourOfDay } from "../ranking/day";

/**
 * Whether a call to a cron route may run. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`. Without a secret the routes run only
 * outside production, so they can be tried locally; in production a missing
 * secret refuses everyone rather than letting anyone in.
 */
export function cronAllowed(input: { authorization: string | null; secret: string | undefined; nodeEnv: string | undefined }): boolean {
  if (!input.secret) return input.nodeEnv !== "production";
  return input.authorization === `Bearer ${input.secret}`;
}

const weekday = new Intl.DateTimeFormat("en-US", { timeZone: DAY_ZONE, weekday: "long" });

/** Sunday by New York's calendar, which is the calendar the boards keep. */
export function isSundayInNewYork(now: Date): boolean {
  return weekday.format(now) === "Sunday";
}

/**
 * Nothing but a decision is mailed between 9pm and 8am. We don't store a
 * person's time zone, so the hours are New York's: loose, and right for most
 * of the people here at the start.
 */
export const EMAIL_QUIET_FROM = 21;
export const EMAIL_QUIET_UNTIL = 8;
export function inEmailQuietHours(now: Date): boolean {
  const h = hourOfDay(now);
  return h >= EMAIL_QUIET_FROM || h < EMAIL_QUIET_UNTIL;
}

/** The evening summary goes out from 6pm, before the quiet hours start. */
export const EVENING_FROM = 18;
export function inEveningWindow(now: Date): boolean {
  const h = hourOfDay(now);
  return h >= EVENING_FROM && h < EMAIL_QUIET_FROM;
}

/**
 * Final places for one closed day: best score first, and the earlier launch
 * first on a tie, which is the order the board showed all day. Nothing here
 * reads plan, trial or Support (AGENTS.md rule 2).
 */
export function rankClosedDay<T extends { id: string; score: number; createdAt: Date }>(rows: T[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  return new Map(sorted.map((r, i) => [r.id, i + 1]));
}

const ORDINALS = ["first", "second", "third"];
/** "first", "second", "third", then "14th". */
export function placeWord(rank: number): string {
  const word = ORDINALS[rank - 1];
  if (word) return word;
  const tens = rank % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][rank % 10] ?? "th");
  return `${rank}${suffix}`;
}

/** The extra line a top-three finish gets, or nothing. */
export function topThreeLine(rank: number): string {
  if (rank === 1) return "First of the day. It stays at the head of that day's board for good.";
  if (rank === 2 || rank === 3) return "One of the day's top three. It keeps that place on the day's board for good.";
  return "";
}

/** "3 launches", "1 launch". */
export function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export type PendingNotification = { id: string; userId: string; kind: string; title: string; body: string; href: string; groupKey: string | null; createdAt: Date };

/** One person's unsent notifications, split by when they are mailed. */
export type UserBatch = { userId: string; now: PendingNotification[]; evening: PendingNotification[] };

/**
 * Group unsent rows by person, and by whether the kind is mailed promptly or
 * kept for the evening summary. A kind the app doesn't know is kept for the
 * evening: the slower choice is the safe one.
 */
export function batchByUser(rows: PendingNotification[], emailNow: (kind: string) => boolean): UserBatch[] {
  const by = new Map<string, UserBatch>();
  for (const row of rows) {
    let batch = by.get(row.userId);
    if (!batch) { batch = { userId: row.userId, now: [], evening: [] }; by.set(row.userId, batch); }
    (emailNow(row.kind) ? batch.now : batch.evening).push(row);
  }
  return [...by.values()];
}

export type DigestLine = { title: string; body: string; href: string; times: number };

/**
 * Rows that share a group key are one line with a count, so a launch day's
 * hundred cheers read "and 99 more like it" (docs/product-structure.md §4).
 * The newest row speaks for its group.
 */
export function collapse(rows: PendingNotification[]): DigestLine[] {
  const lines = new Map<string, DigestLine & { at: number }>();
  for (const row of rows) {
    const key = row.groupKey ? `g:${row.groupKey}` : `i:${row.id}`;
    const at = row.createdAt.getTime();
    const held = lines.get(key);
    if (!held) lines.set(key, { title: row.title, body: row.body, href: row.href, times: 1, at });
    else {
      held.times += 1;
      if (at > held.at) { held.title = row.title; held.body = row.body; held.href = row.href; held.at = at; }
    }
  }
  return [...lines.values()].sort((a, b) => a.at - b.at).map(({ title, body, href, times }) => ({ title, body, href, times }));
}

/** What the mailer does with one person's batch on this run. */
export function mailPlan(batch: UserBatch, opts: { quiet: boolean; evening: boolean; summarySentToday: boolean }): { now: PendingNotification[]; evening: PendingNotification[] } {
  const now = opts.quiet ? batch.now.filter((n) => n.kind === "decision") : batch.now;
  const evening = !opts.quiet && opts.evening && !opts.summarySentToday ? batch.evening : [];
  return { now, evening };
}

/** Split a list into runs of at most `size`. */
export function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
