/**
 * lib/studio/trust-meter.ts
 *
 * "Trust with readers": a meter an author sees while setting up, that rises
 * as their page and first launch are filled in. Nothing here is required
 * (a page can go public without a portrait), so the meter is how the setup
 * says what is worth adding and how much each thing matters to a reader
 * deciding whether to trust a page: a face most of all.
 *
 * It is the author's own and nobody else sees it. It is never part of a
 * score: rank comes from lib/ranking/ only (AGENTS.md rule 2), and nothing
 * there reads this. Pure, and tested: the points add up to exactly 100.
 */

export type TrustFacts = {
  portraitUrl: string | null; bio: string; tagline: string; genres: string[]; city: string; aiUse: string | null;
  website: string; links: { url: string }[]; readersOf: string[];
  work: { hasCover: boolean; description: string; excerpt: string; buyLinks: { url: string }[]; note: string } | null;
};

/** Where in the setup a thing is added: the step, and which of its two screens. */
export type TrustItem = { key: string; label: string; points: number; done: boolean; step: 0 | 1 | 2; part: 0 | 1 };

export function trustMeter(f: TrustFacts): { score: number; items: TrustItem[]; next: TrustItem | null } {
  const has = (s: string) => s.trim().length > 0;
  const w = f.work;
  const items: TrustItem[] = [
    // A face is worth more than anything else on the page.
    { key: "portrait", label: "A portrait", points: 25, done: Boolean(f.portraitUrl), step: 0, part: 0 },
    { key: "bio", label: "A few lines about you", points: 10, done: has(f.bio), step: 0, part: 0 },
    { key: "cover", label: "A cover for your launch", points: 10, done: Boolean(w?.hasCover), step: 1, part: 0 },
    // A sample lets a reader judge the writing before they follow a link anywhere.
    { key: "sample", label: "A sample of the work", points: 10, done: Boolean(w && has(w.excerpt)), step: 1, part: 1 },
    { key: "declaration", label: "How your work is written", points: 5, done: Boolean(f.aiUse), step: 0, part: 1 },
    { key: "tagline", label: "What you write, in a line", points: 5, done: has(f.tagline), step: 0, part: 0 },
    { key: "genres", label: "Your genres", points: 5, done: f.genres.length > 0, step: 0, part: 1 },
    { key: "city", label: "Your city", points: 5, done: has(f.city), step: 0, part: 1 },
    { key: "description", label: "What your launch is about", points: 5, done: Boolean(w && has(w.description)), step: 1, part: 0 },
    { key: "get", label: "Where to read or get it", points: 5, done: Boolean(w?.buyLinks.some((l) => has(l.url))), step: 1, part: 1 },
    { key: "note", label: "Your note to readers", points: 5, done: Boolean(w && has(w.note)), step: 1, part: 1 },
    { key: "online", label: "Your website, or somewhere else to find you", points: 5, done: has(f.website) || f.links.some((l) => has(l.url)), step: 2, part: 0 },
    { key: "readersOf", label: "Whose readers might like you", points: 5, done: f.readersOf.length > 0, step: 2, part: 0 },
  ];
  const score = items.filter((i) => i.done).reduce((sum, i) => sum + i.points, 0);
  // What to add next: the thing not yet there that counts for most (the list is in that order).
  const next = [...items].filter((i) => !i.done).sort((a, b) => b.points - a.points)[0] ?? null;
  return { score, items, next };
}
