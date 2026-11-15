/**
 * GET /api/cron/notifications
 *
 * Hourly. Mails unsent notifications: prompt ones together, the rest as one evening summary.
 * The work is in lib/cron/notifications.ts; this only checks the caller is the scheduler.
 */

import { runCron } from "@/lib/cron/guard";
import { mailNotifications } from "@/lib/cron/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request) {
  return runCron(req, "notifications", (now) => mailNotifications(now));
}
