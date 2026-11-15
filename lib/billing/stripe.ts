/**
 * lib/billing/stripe.ts
 *
 * Author Hunt's side of Stripe. The account is Lorec's, shared, so three
 * things hold everywhere in this file (AGENTS.md, Billing):
 *
 * - Everything made here carries metadata.app = "authorhunt", and the webhook
 *   drops anything that doesn't.
 * - A customer is never looked up or reused by email. Lorec's customers live
 *   in the same account, and finding one of them would tie an Author Hunt
 *   membership to a Lorec user. A customer is made for the author and its id
 *   kept on the author's subscriptions row.
 * - The key is a restricted one (docs/setup-checklist.md §4): Checkout
 *   Sessions, Customers, Subscriptions and the customer portal, nothing else.
 *
 * The client is made on first use, so the app builds and runs with no key.
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { subscriptions, type Author } from "../db/schema";

export const STRIPE_APP = "authorhunt";

export type Interval = "month" | "year";

/** What the routes say when Stripe isn't wired up yet. */
export const NOT_CONFIGURED = "Checkout isn't switched on yet. Nothing has been charged.";

let client: Stripe | null = null;

/** The Stripe client, or null when there's no key. Uses the SDK's own pinned API version. */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "Author Hunt" } });
  return client;
}

export function priceFor(interval: Interval): string | null {
  return (interval === "year" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY) || null;
}

/** Whether both prices and the key are present, so the pricing page can offer checkout. */
export function checkoutReady(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_YEARLY);
}

export function isOurs(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.app === STRIPE_APP;
}

/**
 * The author's Author Hunt customer, made the first time it's needed. The id
 * lives on the subscriptions row (status "incomplete" until a checkout
 * finishes, which authorAccess reads as no membership).
 */
export async function customerFor(api: Stripe, author: Pick<Author, "id" | "userId" | "name">, email: string): Promise<string> {
  const [held] = await db.select({ id: subscriptions.stripeCustomerId }).from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1);
  if (held) return held.id;
  const customer = await api.customers.create(
    { email: email || undefined, name: author.name, metadata: { app: STRIPE_APP, authorId: author.id, userId: author.userId } },
    // Two presses at once make one customer, not two.
    { idempotencyKey: `authorhunt-customer-${author.id}` },
  );
  await db.insert(subscriptions).values({ authorId: author.id, stripeCustomerId: customer.id, status: "incomplete" }).onConflictDoNothing();
  const [row] = await db.select({ id: subscriptions.stripeCustomerId }).from(subscriptions).where(eq(subscriptions.authorId, author.id)).limit(1);
  return row?.id ?? customer.id;
}
