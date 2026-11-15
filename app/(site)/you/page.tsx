/**
 * app/(site)/you/page.tsx
 *
 * A signed-in person's places. The header carries only a mark, search, three
 * places and two actions (DESIGN.md), so everything else that is theirs is
 * listed here: For you, collections, notifications, settings, the Studio and
 * the way out.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getViewerAuthor, requireViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { collections, follows, notifications } from "@/lib/db/schema";
import { clerkEnabled, devAuthEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "You", description: "Your places on Author Hunt.", alternates: { canonical: "/you" }, robots: { index: false, follow: false } };
}

async function SignOut() {
  if (clerkEnabled) {
    const { SignOutButton } = await import("@clerk/nextjs");
    return <SignOutButton redirectUrl="/"><button className="word" type="button">Sign out</button></SignOutButton>;
  }
  if (!devAuthEnabled) return null;
  // Development's sample accounts: an empty user clears the cookie.
  return (
    <form action="/api/dev-auth" method="post">
      <input type="hidden" name="user" value="" />
      <input type="hidden" name="next" value="/" />
      <button className="word" type="submit">Sign out</button>
    </form>
  );
}

export default async function YouPage() {
  const viewer = await requireViewer("/you");
  const n = sql<number>`count(*)::int`;
  const [page, unreadRow, collectionRow, followRow] = await Promise.all([
    getViewerAuthor(),
    db.select({ n }).from(notifications).where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt))),
    db.select({ n }).from(collections).where(eq(collections.userId, viewer.id)),
    db.select({ n }).from(follows).where(eq(follows.userId, viewer.id)),
  ]);
  const unread = Number(unreadRow[0]?.n ?? 0);
  const kept = Number(collectionRow[0]?.n ?? 0);
  const following = Number(followRow[0]?.n ?? 0);

  const places: { href: string; label: string; note: string }[] = [
    { href: "/for-you", label: "For you", note: following > 0 ? `Following ${following} ${following === 1 ? "author" : "authors"}` : "Launches and updates from authors you follow" },
    { href: "/collections", label: "Collections", note: kept > 0 ? `${kept} ${kept === 1 ? "collection" : "collections"}` : "Authors and books you save" },
    { href: "/notifications", label: "Notifications", note: unread > 0 ? `${unread} unread` : "Nothing new" },
    { href: "/settings", label: "Settings", note: "Your name, what you hear about, Mature work" },
    page
      ? { href: `/author/${page.handle}`, label: "Your page", note: page.publishedAt ? page.name : `${page.name}, not public yet` }
      : { href: "/studio", label: "Make an author page", note: "Free, and so is launching" },
    ...(page ? [{ href: "/studio", label: "Studio", note: "Edit your page, launch, post an update" }] : []),
    ...(viewer.isAdmin ? [{ href: "/admin", label: "Admin", note: "Reports and standing" }] : []),
  ];

  return (
    <div className="wrap index-page">
      <header className="page-head">
        <span className="sc">Signed in</span>
        <h1>{viewer.displayName}</h1>
        <p>{viewer.email}</p>
      </header>
      <ul className="leaders places">
        {places.map((p) => (
          <li key={p.label}><Link href={p.href}><span>{p.label}{p.label === "Notifications" && unread > 0 && <> <em className="hl">{unread} new</em></>}</span><i aria-hidden="true" /><b>{p.note}</b></Link></li>
        ))}
      </ul>
      <div className="after"><SignOut /></div>
    </div>
  );
}
