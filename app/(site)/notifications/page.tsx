/**
 * app/(site)/notifications/page.tsx
 *
 * The bell's page: what happened that this person asked to hear about, newest
 * first. Rows that share a group key on one day are one line with a count
 * ("128 cheers today" is one line, not 128: docs/product-structure.md §4).
 *
 * Opening the page is reading it, so everything is marked read here. What was
 * unread on arrival is still marked "New" on this one view, so the reader can
 * see what changed since they last looked.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { addDays, formatDay, launchDay } from "@/lib/ranking/day";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Notifications", description: "What's happened since you last looked.", alternates: { canonical: "/notifications" }, robots: { index: false, follow: false } };
}

type Line = { id: string; title: string; body: string; href: string; day: string; at: Date; count: number; unread: boolean };

/** A link from a notification stays on this site, whatever was stored. */
const safeHref = (href: string) => (href.startsWith("/") && !href.startsWith("//") ? href : "/");

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const now = new Date();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, viewer.id)).orderBy(desc(notifications.createdAt)).limit(300);
  if (rows.some((r) => !r.readAt)) {
    await db.update(notifications).set({ readAt: now }).where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt)));
  }

  // Newest first, so the first row of a group is the one whose words are shown.
  const lines: Line[] = [];
  const groups = new Map<string, Line>();
  for (const r of rows) {
    const day = launchDay(r.createdAt);
    const key = r.groupKey ? `${day}|${r.groupKey}` : null;
    const had = key ? groups.get(key) : undefined;
    if (had) { had.count += 1; had.unread ||= !r.readAt; continue; }
    const line: Line = { id: r.id, title: r.title, body: r.body, href: safeHref(r.href), day, at: r.createdAt, count: 1, unread: !r.readAt };
    lines.push(line);
    if (key) groups.set(key, line);
  }
  const days = [...new Set(lines.map((l) => l.day))];
  const today = launchDay(now);
  const dayName = (day: string) => (day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : formatDay(day));
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" });

  return (
    <div className="wrap index-page">
      <header className="page-head">
        <h1>Notifications</h1>
        <p>What&apos;s happened since you last looked. Choose what you hear about in <Link className="word" href="/settings">settings</Link>.</p>
      </header>
      {lines.length === 0 && <p className="empty">Nothing yet. When an author you follow launches, or someone answers you, it shows up here.</p>}
      {days.map((day) => (
        <section className="sec" key={day}>
          <header><h2>{dayName(day)}</h2>{day === today || day === addDays(today, -1) ? <span>{formatDay(day)}</span> : null}</header>
          <ul className="notes-list">
            {lines.filter((l) => l.day === day).map((l) => (
              <li key={l.id} className={l.unread ? "unread" : undefined}>
                <div>
                  <p>
                    {l.unread && <><span className="sc"><span className="hl">New</span></span>{" "}</>}
                    <Link href={l.href}>{l.title}</Link>
                    {l.count > 1 && <span className="more-count"> and {l.count - 1} more like it</span>}
                  </p>
                  {l.body && <p className="body">{l.body}</p>}
                </div>
                <time dateTime={l.at.toISOString()}>{time.format(l.at)}</time>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
