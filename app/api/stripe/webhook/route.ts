/**
 * POST /api/stripe/webhook
 *
 * Author Hunt's own endpoint in Lorec's Stripe account, with its own signing
 * secret. The account is shared, so this endpoint hears Lorec's events too:
 *
 * - The signature is checked against the raw body before anything is read.
 * - An event whose object doesn't carry metadata.app = "authorhunt" is
 *   answered 200 and dropped. For subscription events that is the
 *   subscription's metadata; for checkout.session.completed, the session's.
 *
 * What it keeps is one subscriptions row per author: status, interval, the
 * end of the paid period, the subscription's id. authorAccess() reads that
 * row to decide the member tools and nothing else; no launch, score or page
 * is touched from here (AGENTS.md rules 2 and 3).
 *
 * Stripe may send an event twice, or out of order. Each event is therefore
 * only a prompt: the subscription is read again from Stripe and the row is
 * set to what it is now, so replays and late arrivals land on the same state.
 */

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { fail, json } from "@/lib/api";
import { isOurs, stripe, type Interval } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { authors, subscriptions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const ENDED = ["canceled", "incomplete_expired"];

function facts(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const recurring = item?.price.recurring?.interval;
  const interval: Interval | null = recurring === "year" ? "year" : recurring === "month" ? "month" : null;
  // The period sits on the item in current API versions, and on the subscription in older ones.
  const end = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  return {
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status as string,
    interval,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  };
}

async function save(sub: Stripe.Subscription): Promise<string> {
  if (!isOurs(sub.metadata)) return "ignored: not Author Hunt's";
  const authorId = sub.metadata.authorId;
  if (!authorId || !/^[0-9a-f-]{36}$/i.test(authorId)) return "ignored: no author on the subscription";
  const [author] = await db.select({ id: authors.id }).from(authors).where(eq(authors.id, authorId)).limit(1);
  if (!author) return "ignored: the page no longer exists";

  const next = facts(sub);
  const [held] = await db.select().from(subscriptions).where(eq(subscriptions.authorId, authorId)).limit(1);
  // An old subscription ending must not write over a newer one that is running.
  if (held?.stripeSubscriptionId && held.stripeSubscriptionId !== sub.id && ENDED.includes(next.status) && !ENDED.includes(held.status)) {
    return "ignored: an earlier subscription";
  }
  await db.insert(subscriptions).values({ authorId, ...next })
    .onConflictDoUpdate({ target: subscriptions.authorId, set: next });
  return `saved: ${next.status}`;
}

/** The subscription as it is now, falling back to the copy in the event if Stripe can't be asked. */
async function current(api: Stripe, id: string, fallback: Stripe.Subscription | null): Promise<Stripe.Subscription | null> {
  try { return await api.subscriptions.retrieve(id); } catch (err) {
    console.error("[stripe] couldn't re-read the subscription", err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function POST(req: Request) {
  const api = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!api || !secret) return fail(503, "Stripe's webhook isn't configured here.");

  const signature = req.headers.get("stripe-signature");
  if (!signature) return fail(400, "Missing signature.");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await api.webhooks.constructEventAsync(raw, signature, secret);
  } catch {
    return fail(400, "The signature didn't verify.");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (!isOurs(session.metadata)) return json({ received: true, result: "ignored: not Author Hunt's" });
        if (session.mode !== "subscription" || !session.subscription) return json({ received: true, result: "ignored: not a subscription" });
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await current(api, id, typeof session.subscription === "string" ? null : session.subscription);
        // If it can't be read now, 500 so Stripe sends the event again.
        if (!sub) return fail(500, "The subscription couldn't be read.");
        return json({ received: true, result: await save(sub) });
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const inEvent = event.data.object;
        // Checked on the event's own copy first, so Lorec's subscriptions cost no call to Stripe.
        if (!isOurs(inEvent.metadata)) return json({ received: true, result: "ignored: not Author Hunt's" });
        const sub = await current(api, inEvent.id, inEvent);
        return json({ received: true, result: sub ? await save(sub) : "ignored" });
      }
      default:
        return json({ received: true, result: "ignored: not an event this endpoint uses" });
    }
  } catch (err) {
    console.error("[stripe] webhook failed", event.type, err instanceof Error ? err.message : err);
    return fail(500, "The event couldn't be saved.");
  }
}
