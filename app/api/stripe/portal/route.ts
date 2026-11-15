/**
 * POST /api/stripe/portal
 *
 * Opens Stripe's customer portal for the author's own Author Hunt customer:
 * change the card, switch between monthly and yearly, cancel. The customer id
 * comes from the author's subscriptions row and nowhere else.
 */

import { eq } from "drizzle-orm";
import { fail, json, signedIn } from "@/lib/api";
import { getViewerAuthor } from "@/lib/auth";
import { NOT_CONFIGURED, stripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";

export async function POST(req: Request) {
  const api = stripe();
  if (!api) return fail(503, NOT_CONFIGURED);
  const auth = await signedIn(req, { name: "stripe-portal", max: 10, windowSec: 600 });
  if ("response" in auth) return auth.response;
  const author = await getViewerAuthor();
  if (!author) return fail(400, "There's no page on this account, so no membership to manage.");
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1);
  if (!sub) return fail(400, "This page has no membership to manage.");
  try {
    const session = await api.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${appUrl}/pricing` });
    return json({ url: session.url });
  } catch (err) {
    console.error("[stripe] portal failed", err instanceof Error ? err.message : err);
    return fail(502, "The membership page couldn't be opened. Try again in a minute.");
  }
}
