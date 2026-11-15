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
  // A mailbox's own "unsubscribe" button posts to the address in the List-Unsubscribe
  // header with the token in the query and a form body, not JSON. Still a POST, never a GET.
  const fromQuery = Body.safeParse({ token: new URL(req.url).searchParams.get("t") });
  let token: string;
  if (fromQuery.success) token = fromQuery.data.token;
  else {
    const body = await readBody(req, Body);
    if ("response" in body) return body.response;
    token = body.data.token;
  }
  await db.update(letterSubscribers).set({ unsubscribedAt: new Date() }).where(and(eq(letterSubscribers.token, token), isNull(letterSubscribers.unsubscribedAt)));
  const [row] = await db.select({ email: letterSubscribers.email }).from(letterSubscribers).where(eq(letterSubscribers.token, token)).limit(1);
  return json({ ok: Boolean(row) });
}
