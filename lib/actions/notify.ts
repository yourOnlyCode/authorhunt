/**
 * lib/actions/notify.ts
 *
 * Writing a notification (docs/product-structure.md, section 4). A person's
 * preference for the kind is checked here, so callers just say what happened.
 * Rows that share a group key on the same day are one line in the bell and one
 * line in the evening email: a launch day must not send a hundred messages.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { notificationPrefs, notifications } from "../db/schema";

export const NOTIFICATION_KINDS = {
  comment: { label: "Someone comments on your launch", emailNow: true },
  reply: { label: "Someone replies to you or mentions you", emailNow: true },
  launch: { label: "Your launch goes live, or finishes", emailNow: true },
  cheer: { label: "Cheers on your launch", emailNow: false },
  follower: { label: "New followers", emailNow: false },
  followed_launch: { label: "An author you follow launches", emailNow: true },
  followed_update: { label: "An author you follow posts an update", emailNow: false },
  notify_live: { label: "A launch you asked about goes live", emailNow: true },
  decision: { label: "Decisions on reports", emailNow: true },
} as const;
export type NotificationKind = keyof typeof NOTIFICATION_KINDS;

export async function notify(input: { userId: string; kind: NotificationKind; title: string; body?: string; href: string; groupKey?: string; fromUserId?: string }): Promise<void> {
  if (input.fromUserId && input.fromUserId === input.userId) return;
  const [pref] = await db.select().from(notificationPrefs).where(and(eq(notificationPrefs.userId, input.userId), eq(notificationPrefs.kind, input.kind))).limit(1);
  if (pref && !pref.bell && !pref.email) return;
  await db.insert(notifications).values({
    userId: input.userId, kind: input.kind, title: input.title, body: input.body ?? "", href: input.href, groupKey: input.groupKey ?? null,
    // A person who turned the bell off still gets the email; mark it read so the bell stays quiet.
    readAt: pref && !pref.bell ? new Date() : null,
    // A person who turned email off is marked as already mailed, so the mailer skips it.
    emailedAt: pref && !pref.email ? new Date() : null,
  });
}
