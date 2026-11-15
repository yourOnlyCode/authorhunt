/**
 * GET /api/cron/day
 *
 * Hourly. Takes due launches live, tells the readers who asked, and closes days that are over.
 * The work is in lib/cron/day.ts; this only checks the caller is the scheduler.
 */

import { runCron } from "@/lib/cron/guard";
import { runDay } from "@/lib/cron/day";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request) {
  return runCron(req, "day", (now) => runDay(now));
}
