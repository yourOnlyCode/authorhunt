/** /studio/works/[id]: change one of your own works. Someone else's, or one that doesn't exist, is a 404. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { WorkForm } from "@/components/studio/work-form";
import { db } from "@/lib/db";
import { launches, works } from "@/lib/db/schema";
import { formatDay } from "@/lib/ranking/day";
import { requireAuthor } from "@/lib/studio/page";
import { workChoices, workFormValues } from "@/lib/studio/work-page";

export const metadata: Metadata = { title: "Edit a work" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditWork({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ made?: string }> }) {
  const { id } = await params;
  const { made } = await searchParams;
  const { author } = await requireAuthor(`/studio/works/${id}`);
  if (!UUID.test(id)) notFound();
  const [work] = await db.select().from(works).where(and(eq(works.id, id), eq(works.authorId, author.id))).limit(1);
  if (!work) notFound();
  const [[launch], choices] = await Promise.all([db.select().from(launches).where(eq(launches.workId, work.id)).limit(1), workChoices()]);
  const launchState = !launch ? "none" : launch.status === "scheduled" ? "scheduled" : "launched";

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>{work.title}</h1>
        <p>
          {work.form}. {!launch ? "Not launched yet." : launch.status === "scheduled" ? `Launching ${formatDay(launch.launchDay)}.` : `Launched ${formatDay(launch.launchDay, { month: "long", day: "numeric", year: "numeric" })}.`}{" "}
          {!launch && <Link className="word" href={`/studio/launch?work=${work.id}`}>Choose its day</Link>}
        </p>
      </div>
      {made && <p className="notice studio-made">Added. It&rsquo;s on your page now. When you&rsquo;re ready, choose a day to launch it.</p>}
      <WorkForm id={work.id} slug={work.slug} launchState={launchState} initial={workFormValues(work, new Set(choices.platforms.map((p) => p.slug)))} genres={choices.genres} platforms={choices.platforms} />
    </main>
  );
}
