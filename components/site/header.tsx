/**
 * components/site/header.tsx
 *
 * The header carries a mark, a search line, three places and two actions, and
 * nothing else (DESIGN.md: the owner found a fuller header crowded). The rest
 * of a signed-in person's places are on /you.
 */

import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getViewer } from "@/lib/auth";
import { CatMark, SearchIcon } from "../ui/icons";

export async function SiteHeader() {
  const viewer = await getViewer();
  const unread = viewer
    ? (await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, viewer.id), isNull(notifications.readAt))))[0]?.n ?? 0
    : 0;
  return (
    <header className="bar">
      <div className="wrap">
        <Link className="logo" href="/"><CatMark />Author Hunt</Link>
        <form className="search" action="/search" role="search">
          <SearchIcon />
          <input name="q" type="search" placeholder="Authors, books, cities" aria-label="Search" />
        </form>
        <nav aria-label="Site">
          <Link href="/">Launches</Link>
          <Link href="/authors">Authors</Link>
          <Link href={viewer ? "/for-you" : "/collections"}>{viewer ? "For you" : "Collections"}</Link>
        </nav>
        <div className="end">
          {viewer
            ? <Link className="signin word" href="/you">{unread > 0 ? `You (${unread})` : "You"}</Link>
            : <Link className="signin word" href="/sign-in">Sign in</Link>}
          <Link className="btn solid" href="/studio">Launch</Link>
        </div>
      </div>
    </header>
  );
}
