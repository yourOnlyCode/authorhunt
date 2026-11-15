/**
 * POST /api/waitlist
 *
 * Joining the pre-launch list (docs/launch.md). The rules are the Writers
 * Pass wait list's, which solved the same problems: a honeypot, a per-address
 * limit, and the same answer whether or not the address is already on the
 * list, so the list can't be probed.
 */

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { byIp, json, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { sendWaitlistConfirm } from "@/lib/emails/waitlist";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address.").max(200),
  kind: z.enum(["author", "reader"]).default("reader"),
  src: z.string().max(80).optional(),
  // A field people never see. Anything typed into it came from a script.
  website: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const limited = await byIp(req, { name: "waitlist", max: 8, windowSec: 600 });
  if (limited) return limited;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { email, kind, src, website } = body.data;
  if (website) return json({ ok: true });

  const [existing] = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
  if (!existing) {
    const token = crypto.randomBytes(24).toString("base64url");
    await db.insert(waitlist).values({ email, kind, token, src: src ?? null }).onConflictDoNothing();
    await sendWaitlistConfirm({ email, token });
  }
  return json({ ok: true });
}
