/** /studio/updates: short posts to the people who follow you. Free. */

import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { DeleteUpdate, UpdateForm } from "@/components/studio/actions";
import { db } from "@/lib/db";
import { updates } from "@/lib/db/schema";
import { requireAuthor, dateWords } from "@/lib/studio/page";
import { UPDATE_KINDS } from "@/lib/studio/rules";
import { notPublicReason, worksOf } from "@/lib/studio/server";

export const metadata: Metadata = { title: "Updates" };

export default async function UpdatesPage() {
  const { author } = await requireAuthor("/studio/updates");
  const [works, posted] = await Promise.all([worksOf(author.id), db.select().from(updates).where(eq(updates.authorId, author.id)).orderBy(desc(updates.createdAt)).limit(50)]);
  const blocked = notPublicReason(author);
  const kindWord = (k: string) => UPDATE_KINDS.find((u) => u.value === k)?.label ?? "News";

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Updates</h1>
        <p>A short post for the readers who follow you: how the writing is going, a cover, an event, an excerpt. It shows on your page and in their notifications. The first one each day adds to your Momentum.</p>
      </div>
      <section className="studio-part">
        <h2>Post an update</h2>
        {blocked ? <p className="notice">{blocked} <Link className="word" href="/studio/page">Go to your page</Link></p> : <UpdateForm works={works.map((w) => ({ value: w.id, label: w.title }))} />}
      </section>
      <section className="studio-part">
        <h2>Posted</h2>
        {posted.length === 0 ? <p className="studio-empty">Nothing posted yet.</p> : (
          <ul className="studio-updates">
            {posted.map((u) => (
              <li key={u.id}>
                <p className="sc">{kindWord(u.kind)} <span>{dateWords(u.createdAt)}</span>{u.workId && <span>{works.find((w) => w.id === u.workId)?.title}</span>}</p>
                <p className="studio-pre">{u.body}</p>
                <DeleteUpdate id={u.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
