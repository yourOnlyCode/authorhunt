/**
 * lib/cron/waitlist.ts
 *
 * One reminder to a waitlist address that hasn't confirmed after a day, and
 * never a second (docs/launch.md). The row is marked before the email is
 * sent: if a send fails the person gets no reminder, which is better than two.
 */

import { and, inArray, isNull, lt } from "drizzle-orm";
import { db } from "../db";
import { waitlist } from "../db/schema";
import { sendWaitlistConfirm } from "../emails/waitlist";
import { launchAt } from "../env";

const BATCH = 200;

export async function remindWaitlist(now: Date): Promise<{ reminded: number; skipped?: string }> {
  // Once the site is open the list has done its work; a reminder to confirm would promise an email that already went.
  const opens = launchAt();
  if (opens && now >= opens) return { reminded: 0, skipped: "The site is open." };

  const cutoff = new Date(now.getTime() - 86_400_000);
  const due = await db.select({ id: waitlist.id }).from(waitlist)
    .where(and(isNull(waitlist.confirmedAt), isNull(waitlist.remindedAt), lt(waitlist.createdAt, cutoff))).orderBy(waitlist.createdAt).limit(BATCH);
  if (!due.length) return { reminded: 0 };
  // Claim with the same conditions, so two runs at once can't both send.
  const claimed = await db.update(waitlist).set({ remindedAt: now })
    .where(and(inArray(waitlist.id, due.map((r) => r.id)), isNull(waitlist.remindedAt), isNull(waitlist.confirmedAt)))
    .returning({ email: waitlist.email, token: waitlist.token });
  for (const row of claimed) await sendWaitlistConfirm({ email: row.email, token: row.token, reminder: true });
  return { reminded: claimed.length };
}
