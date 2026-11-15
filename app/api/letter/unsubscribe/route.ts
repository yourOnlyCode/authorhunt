/**
 * POST /api/letter/unsubscribe  { token }
 *
 * Takes an address off the Sunday letter. A POST from the unsubscribe page,
 * never the email link's GET: mail scanners follow links, and one of them
 * must not unsubscribe a reader. The row is kept, marked, so the address
 * stays off even if the list is rebuilt.
 */

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { byIp, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { letterSubscribers } from "@/lib/db/schema";

const Body = z.object({ token: z.string().min(10).max(100) });

export async function POST(req: Request) {
  const limited = await byIp(req, { name: "letter-unsubscribe", max: 20, windowSec: 600 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  await db.update(letterSubscribers).set({ unsubscribedAt: new Date() }).where(and(eq(letterSubscribers.token, body.data.token), isNull(letterSubscribers.unsubscribedAt)));
  const [row] = await db.select({ email: letterSubscribers.email }).from(letterSubscribers).where(eq(letterSubscribers.token, body.data.token)).limit(1);
  return json({ ok: Boolean(row) });
}
