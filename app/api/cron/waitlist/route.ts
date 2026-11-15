/**
 * GET /api/cron/waitlist
 *
 * Daily. One reminder to waitlist addresses unconfirmed for over a day, never a second.
 * The work is in lib/cron/waitlist.ts; this only checks the caller is the scheduler.
 */

import { runCron } from "@/lib/cron/guard";
import { remindWaitlist } from "@/lib/cron/waitlist";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request) {
  return runCron(req, "waitlist", (now) => remindWaitlist(now));
}
