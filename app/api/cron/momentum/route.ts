/**
 * GET /api/cron/momentum
 *
 * Hourly, at twenty past. Recomputes Momentum for every author whose points are still decaying.
 * The work is in lib/cron/momentum.ts; this only checks the caller is the scheduler.
 */

import { runCron } from "@/lib/cron/guard";
import { recomputeMomentum } from "@/lib/cron/momentum";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function GET(req: Request) {
  return runCron(req, "momentum", (now) => recomputeMomentum(now));
}
