/**
 * POST /api/clerk/webhook
 *
 * Author Hunt's own endpoint on Lorec's Clerk instance, with its own signing
 * secret (docs/product-structure.md §8). The instance is shared, so this
 * hears about every user, most of whom are Lorec's and never come here:
 *
 * - user.created makes no row. A users row is made on a person's first
 *   signed-in request (lib/auth), so Lorec-only users never get one.
 * - user.updated changes the email, name and picture of a row that already
 *   exists, and does nothing otherwise.
 * - user.deleted removes the row, and everything of theirs goes with it.
 *
 * It writes only to Author Hunt's database and never to Clerk: no metadata
 * that Lorec reads is touched from here.
 */

import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { fail, json } from "@/lib/api";
import { stripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { authors, subscriptions, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Deleting the users row deletes the page and its subscriptions row with it,
 * and after that nothing here knows the Stripe subscription exists. So it is
 * cancelled first: nobody should keep paying for a page that is gone.
 */
async function endMembership(userId: string): Promise<void> {
  const [row] = await db.select({ sub: subscriptions.stripeSubscriptionId, status: subscriptions.status }).from(subscriptions)
    .innerJoin(authors, eq(authors.id, subscriptions.authorId)).where(eq(authors.userId, userId)).limit(1);
  const api = stripe();
  if (!row?.sub || !api || row.status === "canceled" || row.status === "incomplete_expired") return;
  try { await api.subscriptions.cancel(row.sub); } catch (err) {
    console.error("[clerk] couldn't cancel the membership of a deleted account. Cancel it in Stripe by hand:", row.sub, err instanceof Error ? err.message : err);
  }
}

export async function POST(req: NextRequest) {
  const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) return fail(503, "Clerk's webhook isn't configured here.");

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req, { signingSecret });
  } catch {
    return fail(400, "The signature didn't verify.");
  }

  if (event.type === "user.updated") {
    const u = event.data;
    const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0];
    const email = primary?.email_address ?? "";
    const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || email.split("@")[0] || "";
    // Only what Clerk sent a value for; an update never blanks a name or an address.
    const set = { ...(email ? { email } : {}), ...(displayName ? { displayName } : {}), imageUrl: u.image_url || null };
    const changed = await db.update(users).set(set).where(eq(users.id, u.id)).returning({ id: users.id });
    return json({ received: true, result: changed.length ? "updated" : "ignored: no account here" });
  }

  if (event.type === "user.deleted") {
    const id = event.data.id;
    if (!id) return json({ received: true, result: "ignored: no id" });
    await endMembership(id);
    const gone = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return json({ received: true, result: gone.length ? "deleted" : "ignored: no account here" });
  }

  // user.created included: no row is made until the person first signs in here.
  return json({ received: true, result: "ignored" });
}
