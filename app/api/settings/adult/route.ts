/**
 * app/api/settings/adult/route.ts
 *
 * "I'm 18 or over: show Mature work." An empty body records the moment the
 * person said so; {confirm: false} takes it back. It is their own statement,
 * kept on their account, and it is all that unblurs a Mature cover
 * (docs/product-structure.md, section 5). Signed out, the answer is 401 and
 * the page asks for an account.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const Body = z.object({ confirm: z.boolean().optional() });

export async function POST(req: Request) {
  const who = await signedIn(req, { name: "adult", max: 10, windowSec: 60 });
  if ("response" in who) return who.response;
  // The body is optional: a bare POST means yes.
  const text = await req.text();
  let raw: unknown = {};
  if (text.trim()) {
    try { raw = JSON.parse(text); } catch { return fail(400, "That request couldn't be read."); }
  }
  const parsed = Body.safeParse(raw ?? {});
  if (!parsed.success) return fail(400, "Something in that request isn't right.");
  const confirmed = parsed.data.confirm !== false;
  await db.update(users).set({ adultConfirmedAt: confirmed ? new Date() : null }).where(eq(users.id, who.viewer.id));
  return json({ ok: true });
}
