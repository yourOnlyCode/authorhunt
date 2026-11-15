/**
 * app/api/notify-requests/route.ts
 *
 * "Tell me when it launches." A signed-in reader asks with one press; a
 * signed-out one leaves an address. Either way it is one row per person per
 * launch, and one email on the morning (docs/development.md, section 4).
 * Signed-out readers use this, so the limit is per address.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { byIp, fail, json, readBody } from "@/lib/api";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors, launches, notifyRequests } from "@/lib/db/schema";

const Body = z.object({ launchId: z.string().uuid(), email: z.string().trim().toLowerCase().email("That doesn't look like an email address.").max(200).optional() });

export async function POST(req: Request) {
  const limited = await byIp(req, { name: "notify-request", max: 10, windowSec: 60 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { launchId, email } = body.data;

  const [row] = await db.select({ status: launches.status, standing: authors.standing }).from(launches)
    .innerJoin(authors, eq(launches.authorId, authors.id)).where(eq(launches.id, launchId)).limit(1);
  if (!row || row.standing !== "good" || row.status === "pulled") return fail(404, "That launch isn't here any more.");
  if (row.status !== "scheduled") return fail(400, "This has already launched.");

  const viewer = await getViewer();
  if (!viewer && !email) return fail(400, "Leave an email address and we'll write once, on the morning.");
  const mine = viewer ? eq(notifyRequests.userId, viewer.id) : eq(notifyRequests.email, email as string);
  const [existing] = await db.select({ id: notifyRequests.id }).from(notifyRequests).where(and(eq(notifyRequests.launchId, launchId), mine)).limit(1);
  if (!existing) await db.insert(notifyRequests).values({ launchId, userId: viewer?.id ?? null, email: viewer ? null : email as string });
  return json({ ok: true });
}
