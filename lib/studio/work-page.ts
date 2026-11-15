/**
 * lib/studio/work-page.ts
 *
 * What the two work pages (new, and edit) both load: the genres and the
 * places a work can be published through, leaving out hidden ones.
 */

import { db } from "../db";
import { genres, platforms, type Work } from "../db/schema";
import type { WorkFormValues } from "@/components/studio/work-form";

export async function workChoices() {
  const [genreRows, platformRows] = await Promise.all([db.select().from(genres).orderBy(genres.name), db.select().from(platforms).orderBy(platforms.name)]);
  return {
    genres: genreRows.map((g) => ({ slug: g.slug, name: g.name })),
    platforms: platformRows.filter((p) => !p.hidden).map((p) => ({ slug: p.slug, name: p.name })),
  };
}

export const EMPTY_WORK: WorkFormValues = {
  kind: "book", form: "", title: "", tagline: "", description: "", excerpt: "", coverUrl: null, coverColor: "#1F3A5C", gallery: [],
  pubDate: "", pages: "", isbn: "", buyLinks: [], genres: [], platforms: [], aiUse: null, mature: false, contentNotes: [], contentNoteText: "",
};

export function workFormValues(w: Work, shownPlatforms: Set<string>): WorkFormValues {
  return {
    kind: w.kind, form: w.form, title: w.title, tagline: w.tagline, description: w.description, excerpt: w.excerpt, coverUrl: w.coverUrl,
    coverColor: w.coverColor, gallery: w.gallery, pubDate: w.pubDate ?? "", pages: w.pages ? String(w.pages) : "", isbn: w.isbn ?? "",
    buyLinks: w.buyLinks, genres: w.genres, platforms: w.platforms.filter((p) => shownPlatforms.has(p)), aiUse: w.aiUse, mature: w.mature,
    contentNotes: w.contentNotes, contentNoteText: w.contentNoteText,
  };
}
