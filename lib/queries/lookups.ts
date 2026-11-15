/**
 * lib/queries/lookups.ts
 *
 * The three small lookup tables (genres, reference authors, platforms), held
 * for a minute. Rows carry slugs; these turn a slug into the name people read.
 */

import { db } from "../db";
import { genres, platforms, referenceAuthors } from "../db/schema";

type Lookups = { genres: Map<string, string>; references: Map<string, string>; platforms: Map<string, string>; hiddenPlatforms: Set<string> };
let held: { at: number; value: Lookups } | null = null;

export async function lookups(): Promise<Lookups> {
  if (held && Date.now() - held.at < 60_000) return held.value;
  const [g, r, p] = await Promise.all([db.select().from(genres), db.select().from(referenceAuthors), db.select().from(platforms)]);
  const value: Lookups = {
    genres: new Map(g.map((x) => [x.slug, x.name])),
    references: new Map(r.map((x) => [x.slug, x.name])),
    platforms: new Map(p.map((x) => [x.slug, x.name])),
    hiddenPlatforms: new Set(p.filter((x) => x.hidden).map((x) => x.slug)),
  };
  held = { at: Date.now(), value };
  return value;
}

export function forgetLookups() { held = null; }

export type Named = { slug: string; name: string };
export function named(slugs: string[], map: Map<string, string>): Named[] {
  return slugs.map((slug) => ({ slug, name: map.get(slug) ?? slug }));
}
