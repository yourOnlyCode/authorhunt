/**
 * app/api/settings/route.ts
 *
 * A person's own settings: the name others see, whether content notes are
 * always shown, and for each kind of notification whether it reaches the
 * bell and the inbox. A preference row exists only once someone has changed
 * it; with no row, a kind is on for both (lib/actions/notify.ts).
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json, readBody, signedIn } from "@/lib/api";
import { db } from "@/lib/db";
import { notificationPrefs, users } from "@/lib/db/schema";
import { NOTIFICATION_KINDS, type NotificationKind } from "@/lib/actions/notify";

const isKind = (k: string): k is NotificationKind => Object.hasOwn(NOTIFICATION_KINDS, k);
const Body = z.object({
  displayName: z.string().trim().min(1, "Your name can't be empty.").max(60, "Keep your name under 60 characters.").optional(),
  alwaysShowNotes: z.boolean().optional(),
  prefs: z.array(z.object({ kind: z.string().refine(isKind, "That isn't a kind of notification."), bell: z.boolean(), email: z.boolean() })).max(40).optional(),
});

export async function PATCH(req: Request) {
  const who = await signedIn(req, { name: "settings", max: 20, windowSec: 60 });
  if ("response" in who) return who.response;
  const body = await readBody(req, Body);
  if ("response" in body) return body.response;
  const { displayName, alwaysShowNotes, prefs } = body.data;
  if (displayName === undefined && alwaysShowNotes === undefined && !prefs) return fail(400, "Nothing to change.");

  const set: { displayName?: string; alwaysShowNotes?: boolean } = {};
  if (displayName !== undefined) set.displayName = displayName;
  if (alwaysShowNotes !== undefined) set.alwaysShowNotes = alwaysShowNotes;
  if (Object.keys(set).length) await db.update(users).set(set).where(eq(users.id, who.viewer.id));

  // The last word on a kind wins if it was sent twice.
  const byKind = new Map((prefs ?? []).map((p) => [p.kind, p]));
  for (const p of byKind.values()) {
    await db.insert(notificationPrefs).values({ userId: who.viewer.id, kind: p.kind, bell: p.bell, email: p.email })
      .onConflictDoUpdate({ target: [notificationPrefs.userId, notificationPrefs.kind], set: { bell: p.bell, email: p.email } });
  }
  return json({ ok: true });
}
