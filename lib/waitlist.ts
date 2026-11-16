/**
 * lib/waitlist.ts
 *
 * What to do when an address that is already on the waiting list is entered
 * again. The page gives everyone the same answer, so the list can't be
 * probed by typing in someone else's address; the person who owns the
 * address is told by email instead. Pure, and tested.
 *
 * `remindedAt` doubles as "when we last wrote to this address about the
 * list", so the limits hold without a column of their own and on every
 * server at once. The daily reminder job only writes to addresses it has
 * never reminded, so a resend here also stands in for that reminder.
 */

export type WaitlistRow = { createdAt: Date; confirmedAt: Date | null; remindedAt: Date | null };
export type Resend = "confirm" | "already" | "none";

const MINUTE = 60_000;
/** A second press right after the first is a double-click, not a request for another email. */
export const RESEND_NOT_BEFORE = 2 * MINUTE;
/** An unconfirmed address can have its link again at most once an hour. */
export const CONFIRM_AGAIN_EVERY = 60 * MINUTE;
/** A confirmed address is told it's already on the list at most once a day. */
export const ALREADY_EVERY = 24 * 60 * MINUTE;

export function resendFor(row: WaitlistRow, now: Date): Resend {
  const t = now.getTime();
  if (t - row.createdAt.getTime() < RESEND_NOT_BEFORE) return "none";
  const since = row.remindedAt ? t - row.remindedAt.getTime() : Infinity;
  if (row.confirmedAt) return since >= ALREADY_EVERY ? "already" : "none";
  return since >= CONFIRM_AGAIN_EVERY ? "confirm" : "none";
}
