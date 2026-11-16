/**
 * lib/cron/guard.ts
 *
 * The one check every scheduled route makes before it does anything, and the
 * wrapper that turns a job's summary (or its failure) into JSON.
 */

import { NextResponse } from "next/server";
import { beforeLaunch } from "../env";
import { cronAllowed } from "./pure";

/**
 * Before the site opens only the waitlist's job has work to do. Every other job waits, so no
 * launch goes live and no letter is sent while visitors can only see the splash page.
 */
export async function runCron(req: Request, name: string, job: (now: Date) => Promise<Record<string, unknown>>, opts: { beforeOpening?: boolean } = {}): Promise<NextResponse> {
  const allowed = cronAllowed({ authorization: req.headers.get("authorization"), secret: process.env.CRON_SECRET, nodeEnv: process.env.NODE_ENV });
  if (!allowed) return NextResponse.json({ error: "This route is for the scheduler." }, { status: 401 });
  const now = new Date();
  if (beforeLaunch(now) && !opts.beforeOpening) return NextResponse.json({ ok: true, job: name, at: now.toISOString(), skipped: "Author Hunt isn't open yet." });
  try {
    const summary = await job(now);
    return NextResponse.json({ ok: true, job: name, at: now.toISOString(), ...summary });
  } catch (err) {
    // The scheduler shows a failed run only if the status says so.
    console.error(`[cron] ${name} failed`, err);
    return NextResponse.json({ ok: false, job: name, error: "The job failed. The server log has the reason." }, { status: 500 });
  }
}
