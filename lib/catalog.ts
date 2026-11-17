/**
 * lib/catalog.ts
 *
 * The genres and platforms an author picks from. They are lookup tables
 * (docs/ontology.md), and these lists are what production starts with:
 * supabase/migrations/20261117120000_genres_and_platforms.sql inserts the
 * same rows, and tests/catalog.test.ts fails if the two drift apart. The
 * seed uses these lists too, so development shows what production will.
 * Admins can add to the tables later; a new value goes here and in a new
 * migration.
 */

import { slugify } from "./slug";

export const GENRES = [
  "Fantasy", "Science fiction", "Horror", "Mystery", "Cozy mystery", "Thriller", "Romance", "Historical fiction",
  "Literary", "Poetry", "Memoir", "Essays", "Young adult", "Children's", "Nonfiction", "Short stories",
  // Fan fiction (the owner's call, November 17, 2026). It's writing like any other here, and the same
  // rules hold: the author wrote every word, and a Mature mark where it applies.
  "Fan fiction",
] as const;

export const genreRows = () => GENRES.map((name) => ({ slug: slugify(name), name }));

/** [slug, name, hidden]. Lorec is hidden until it publishes books. */
export const PLATFORMS: readonly [string, string, boolean][] = [
  ["amazon-kdp", "Amazon KDP", false], ["ingramspark", "IngramSpark", false], ["lulu", "Lulu", false],
  ["draft2digital", "Draft2Digital", false], ["kobo-writing-life", "Kobo Writing Life", false],
  ["wattpad", "Wattpad", false], ["royal-road", "Royal Road", false], ["substack", "Substack", false],
  ["archive-of-our-own", "Archive of Our Own", false], ["fanfiction-net", "FanFiction.Net", false],
  ["own-site", "The author's own site", false], ["traditional", "A publisher", false], ["lorec", "Lorec", true],
];

export const platformRows = () => PLATFORMS.map(([slug, name, hidden]) => ({ slug, name, hidden }));
