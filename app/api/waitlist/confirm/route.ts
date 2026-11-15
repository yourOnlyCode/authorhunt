import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { byIp, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

const Body = z.object({ token: z.string().min(10).max(100) });

/** Confirms a waitlist address. A POST from the confirm page, never the email link's GET. */
export async function POST(req: Request) {
  const limited = await byIp(req, { name: "waitlist-confirm", max: 20, windowSec: 600 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  await db.update(waitlist).set({ confirmedAt: new Date() }).where(and(eq(waitlist.token, body.data.token), isNull(waitlist.confirmedAt)));
  const [row] = await db.select({ kind: waitlist.kind }).from(waitlist).where(eq(waitlist.token, body.data.token)).limit(1);
  return json({ ok: Boolean(row), kind: row?.kind ?? null });
}
