/**
 * POST /api/stripe/checkout  { interval: "month" | "year" }
 *
 * Starts a membership: a Stripe Checkout Session in subscription mode, and
 * the browser is sent to its URL. Stripe chooses which ways to pay to show
 * (set in the Dashboard); none are named here.
 *
 * A membership adds tools and never position (AGENTS.md rule 3), so nothing
 * here touches a launch, a score or a page's visibility. The membership only
 * exists for the app once the webhook has written the subscriptions row.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { getViewerAuthor } from "@/lib/auth";
import { customerFor, NOT_CONFIGURED, priceFor, stripe, STRIPE_APP } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";

const Body = z.object({ interval: z.enum(["month", "year"]) });
const RUNNING = ["active", "trialing", "past_due"];

export async function POST(req: Request) {
  const api = stripe();
  if (!api) return fail(503, NOT_CONFIGURED);
  const auth = await signedIn(req, { name: "stripe-checkout", max: 10, windowSec: 600 });
  if ("response" in auth) return auth.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const price = priceFor(body.data.interval);
  if (!price) return fail(503, NOT_CONFIGURED);

  const author = await getViewerAuthor();
  if (!author) return fail(400, "Make your page first. A membership belongs to a page.");
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1);
  if (sub && RUNNING.includes(sub.status)) return fail(409, "This page already has a membership. Manage it from the pricing page.");

  try {
    const customer = await customerFor(api, author, auth.viewer.email);
    const metadata = { app: STRIPE_APP, authorId: author.id, userId: auth.viewer.id };
    const session = await api.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: author.id,
      line_items: [{ price, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${appUrl}/studio?membership=started`,
      cancel_url: `${appUrl}/pricing`,
    });
    if (!session.url) return fail(502, "Stripe didn't return a checkout page. Nothing has been charged.");
    return json({ url: session.url });
  } catch (err) {
    console.error("[stripe] checkout failed", err instanceof Error ? err.message : err);
    return fail(502, "Checkout couldn't be started. Nothing has been charged. Try again in a minute.");
  }
}
