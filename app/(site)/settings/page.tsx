/**
 * app/(site)/settings/page.tsx
 *
 * A person's settings: their name, which notifications reach the bell and
 * the inbox (each kind separately, docs/product-structure.md §4), and the two
 * choices about Mature work and content notes (§5). A kind with no stored
 * preference is on for both.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPrefs } from "@/lib/db/schema";
import { NOTIFICATION_KINDS } from "@/lib/actions/notify";
import { SettingsForm, type PrefRow } from "@/components/you/settings-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Settings", description: "Your name, what you hear about, and Mature work.", alternates: { canonical: "/settings" }, robots: { index: false, follow: false } };
}

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const stored = new Map((await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, viewer.id))).map((p) => [p.kind, p]));
  const prefs: PrefRow[] = Object.entries(NOTIFICATION_KINDS).map(([kind, info]) => ({
    kind, label: info.label,
    bell: stored.get(kind)?.bell ?? true, email: stored.get(kind)?.email ?? true,
    emailNote: info.emailNow ? "" : "Email comes as a summary, not one at a time.",
  }));
  return (
    <div className="wrap index-page">
      <header className="page-head">
        <h1>Settings</h1>
        <p>Signed in as {viewer.email}. <Link className="word" href="/you">Back to your places</Link></p>
      </header>
      <SettingsForm displayName={viewer.displayName} alwaysShowNotes={viewer.alwaysShowNotes} adult={Boolean(viewer.adultConfirmedAt)} prefs={prefs} />
    </div>
  );
}
