/**
 * GET /api/cron/letter
 *
 * Hourly on Sundays. The job itself checks that it is Sunday in New York and that the letter hasn't gone.
 * The work is in lib/cron/letter.ts; this only checks the caller is the scheduler.
 */

import { runCron } from "@/lib/cron/guard";
import { sendSundayLetter } from "@/lib/cron/letter";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request) {
  return runCron(req, "letter", (now) => sendSundayLetter(now));
}
