/**
 * lib/auth/index.ts
 *
 * Who is looking at the page. In production that is Clerk, in Author Hunt's
 * own Clerk application (not shared with Lorec: the owner's call, November
 * 2026). In development with no Clerk keys it is a cookie naming one of the
 * seeded sample accounts, set from /sign-in, so every signed-in feature can
 * be tried with nothing set up.
 *
 * A users row is made on a person's first signed-in request here, and the
 * Clerk webhook only updates or removes it, so there is one place that makes
 * one (docs/product-structure.md, section 8).
 */

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authors, users, type Author, type User } from "../db/schema";
import { adminEmails, clerkEnabled, devAuthEnabled } from "../env";

export const DEV_COOKIE = "ah_dev_user";
export type Viewer = User & { isAdmin: boolean };

async function clerkUser(): Promise<User | null> {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return null;
  const [found] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (found) return found;
  const cu = await currentUser();
  if (!cu) return null;
  const email = cu.primaryEmailAddress?.emailAddress ?? cu.emailAddresses[0]?.emailAddress ?? "";
  const displayName = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || email.split("@")[0] || "Reader";
  const [made] = await db.insert(users).values({ id: userId, email, displayName, imageUrl: cu.imageUrl }).onConflictDoNothing().returning();
  if (made) return made;
  const [again] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return again ?? null;
}

async function devUser(): Promise<User | null> {
  const id = (await cookies()).get(DEV_COOKIE)?.value;
  if (!id) return null;
  const [found] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return found ?? null;
}

/** The signed-in person, or null. Read once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = clerkEnabled ? await clerkUser() : devAuthEnabled ? await devUser() : null;
  if (!user || user.standing === "banned") return null;
  const isAdmin = adminEmails.includes(user.email.toLowerCase()) || (devAuthEnabled && user.id === "dev_admin");
  return { ...user, isAdmin };
});

/** The viewer's own page, if they have made one. */
export const getViewerAuthor = cache(async (): Promise<Author | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [page] = await db.select().from(authors).where(eq(authors.userId, viewer.id)).limit(1);
  return page ?? null;
});

export function signInHref(next: string): string {
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

/** For pages only a signed-in person can see: sends everyone else to sign in and back. */
export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(signInHref(next));
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return viewer as Viewer;
}
