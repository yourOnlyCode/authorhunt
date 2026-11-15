/**
 * app/api/notifications/read/route.ts
 *
 * Mark every notification read, for a bell that clears without opening the
 * page. The page itself does the same when it's opened.
 */

import { and, eq, isNull } from "drizzle-orm";
import { json, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export async function POST(req: Request) {
  const who = await signedIn(req, { name: "notifications-read", max: 30, windowSec: 60 });
  if ("response" in who) return who.response;
  const marked = await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.userId, who.viewer.id), isNull(notifications.readAt))).returning({ id: notifications.id });
  return json({ ok: true, marked: marked.length });
}
