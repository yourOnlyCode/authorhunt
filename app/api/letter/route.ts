/**
 * POST /api/letter  { email }
 *
 * Subscribing an address to the Sunday letter, from the strip on the home
 * page. The answer is the same whether or not the address was already here,
 * so the list can't be probed. An address that had unsubscribed and is
 * entered again is subscribed again, with the token it already had.
 */

import crypto from "node:crypto";
import { z } from "zod";
import { byIp, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { letterSubscribers } from "@/lib/db/schema";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address.").max(200),
  // A field people never see. Anything typed into it came from a script.
  website: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const limited = await byIp(req, { name: "letter", max: 8, windowSec: 600 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  if (body.data.website) return json({ ok: true });
  const token = crypto.randomBytes(24).toString("base64url");
  await db.insert(letterSubscribers).values({ email: body.data.email, token })
    .onConflictDoUpdate({ target: letterSubscribers.email, set: { unsubscribedAt: null } });
  return json({ ok: true });
}
