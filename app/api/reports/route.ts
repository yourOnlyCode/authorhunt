/**
 * app/api/reports/route.ts
 *
 * A reader's report, from the Report word on a launch, page, work, comment,
 * collection or picture (docs/product-structure.md, section 6). It only files
 * the report: nothing is hidden, removed or weighed here, and no one is told
 * until a person has looked at it.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { reasonAllowed, TARGET_KINDS } from "@/lib/trust/reasons";
import { resolveTarget } from "@/lib/trust/targets";

const Body = z.object({
  targetKind: z.enum(TARGET_KINDS as [string, ...string[]], { message: "That can't be reported from here." }),
  targetId: z.string().uuid({ message: "That can't be reported from here." }),
  reason: z.string({ message: "Choose what's wrong." }).min(1, "Choose what's wrong."),
  note: z.string({ message: "Say what you're going on." }).trim().min(10, "Say what you're going on, in a sentence or two.").max(2000, "Keep the note under 2,000 characters."),
});

export async function POST(req: Request) {
  // Ten a day: enough for a reader who found a run of spam, too few to bury a rival's launch day.
  const who = await signedIn(req, { name: "report", max: 10, windowSec: 86_400 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { targetId, reason, note } = body.data;
  const targetKind = body.data.targetKind as (typeof TARGET_KINDS)[number];

  if (!reasonAllowed(targetKind, reason)) return fail(400, "That reason doesn't apply here. Choose another.");
  const target = await resolveTarget(targetKind, targetId, new Date());
  if (!target) return fail(404, "That isn't here any more.");
  if (target.ownerUserId === who.viewer.id) return fail(400, "This is yours. You can change or remove it yourself.");

  // One open report per person per thing. A second press gets the same answer, so the form never says who else reported.
  const [open] = await db.select({ id: reports.id }).from(reports)
    .where(and(eq(reports.reporterId, who.viewer.id), eq(reports.targetKind, targetKind), eq(reports.targetId, targetId), eq(reports.status, "open"))).limit(1);
  if (!open) await db.insert(reports).values({ reporterId: who.viewer.id, targetKind, targetId, reason, note });
  return json({ ok: true });
}
