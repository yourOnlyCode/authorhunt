/**
 * /studio/followers: who follows you, and the readers waiting on a launch.
 * Everyone sees the counts. Writing to followers and taking the coming-soon
 * list away as a file are member tools (docs/monetization.md): a free author
 * sees them described, never a locked page, and the routes check again.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { FollowerEmailForm } from "@/components/studio/actions";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { follows, launches, notificationPrefs, notifyRequests, users } from "@/lib/db/schema";
import { formatDay } from "@/lib/ranking/day";
import { requireAuthor } from "@/lib/studio/page";
import { notPublicReason, worksOf } from "@/lib/studio/server";

export const metadata: Metadata = { title: "Followers" };

export default async function FollowersPage() {
  const { author } = await requireAuthor("/studio/followers");
  const [member, works, scheduled, asked, takers] = await Promise.all([
    isMember(author),
    worksOf(author.id),
    db.select().from(launches).where(and(eq(launches.authorId, author.id), eq(launches.status, "scheduled"))).orderBy(asc(launches.launchDay)),
    db.select({ launchId: notifyRequests.launchId, n: sql<number>`count(*)::int` }).from(notifyRequests)
      .innerJoin(launches, eq(launches.id, notifyRequests.launchId)).where(eq(launches.authorId, author.id)).groupBy(notifyRequests.launchId),
    // How many followers take email for updates: the number the send would reach.
    db.select({ n: sql<number>`count(*)::int` }).from(follows)
      .innerJoin(users, eq(users.id, follows.userId))
      .leftJoin(notificationPrefs, and(eq(notificationPrefs.userId, follows.userId), eq(notificationPrefs.kind, "followed_update")))
      .where(and(eq(follows.authorId, author.id), ne(users.standing, "banned"), ne(users.id, author.userId), sql`coalesce(${notificationPrefs.email}, true)`)),
  ]);
  const askedFor = new Map(asked.map((a) => [a.launchId, a.n]));
  const totalAsked = asked.reduce((sum, a) => sum + a.n, 0);
  const blocked = notPublicReason(author);
  const reach = takers[0]?.n ?? 0;

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Followers</h1>
        <p><b className="studio-figure">{author.followerCount}</b> {author.followerCount === 1 ? "reader follows" : "readers follow"} you. They see your launches and updates in For you, in their notifications and in the Sunday letter.</p>
      </div>

      <section className="studio-part">
        <h2>Write to your followers</h2>
        {member ? (
          blocked ? <p className="notice">{blocked}</p> : (
            <>
              <p>An email from you to everyone who follows you and takes email, {reach} of {author.followerCount} now. One a day at most. Each ends with how to stop them.</p>
              <FollowerEmailForm takers={reach} />
            </>
          )
        ) : (
          <div className="studio-quiet">
            <p>Emailing the readers who follow you, on launch day and for news, is a member tool. Without it they still hear of your launches and updates in their notifications and the Sunday letter. <Link className="word" href="/pricing">See member tools</Link></p>
          </div>
        )}
      </section>

      <section className="studio-part">
        <h2>The coming-soon list</h2>
        <p>A launch set for a later day has a coming-soon page where a reader can ask to be told. Each of them gets one email on the morning, whether or not you&rsquo;re a member.</p>
        {scheduled.length === 0 ? <p className="studio-empty">No launch is set for a later day. <Link className="word" href="/studio/launch">Set one</Link></p> : (
          <table className="table studio-table">
            <thead><tr><th scope="col">Launch</th><th scope="col">Day</th><th scope="col" className="num">Asked to be told</th></tr></thead>
            <tbody>
              {scheduled.map((l) => (
                <tr key={l.id}>
                  <td><b>{l.workId ? works.find((w) => w.id === l.workId)?.title ?? "A work" : "Your page"}</b></td>
                  <td>{formatDay(l.launchDay)}</td>
                  <td className="num">{askedFor.get(l.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {member ? (
          <p className="studio-actions">
            <a className="btn" href="/api/studio/followers/export" download>Download the list (CSV)</a>
            <span className="hint">{totalAsked} {totalAsked === 1 ? "address" : "addresses"} across all your launches. These readers asked to hear about a launch; write to them about that and nothing else.</span>
          </p>
        ) : (
          <div className="studio-quiet">
            <p>Taking the list away as a file, so you can write to these readers yourself, is a member tool. <Link className="word" href="/pricing">See member tools</Link></p>
          </div>
        )}
      </section>
    </main>
  );
}
