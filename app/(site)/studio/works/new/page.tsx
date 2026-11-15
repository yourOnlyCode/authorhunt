/** /studio/works/new: add a book, a short work, a serial or an issue. Free, and as many as you like. */

import type { Metadata } from "next";
import { WorkForm } from "@/components/studio/work-form";
import { requireAuthor } from "@/lib/studio/page";
import { EMPTY_WORK, workChoices } from "@/lib/studio/work-page";

export const metadata: Metadata = { title: "Add a work" };

export default async function NewWork() {
  const { author } = await requireAuthor("/studio/works/new");
  const choices = await workChoices();
  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Add a work</h1>
        <p>A book, a short work, a serial or an issue. Adding it puts it on your page; launching it on a day of its own comes after, and both are free.</p>
      </div>
      <WorkForm id={null} slug={null} launchState="none" initial={{ ...EMPTY_WORK, genres: author.genres.slice(0, 3), mature: author.mature }} genres={choices.genres} platforms={choices.platforms} />
    </main>
  );
}
