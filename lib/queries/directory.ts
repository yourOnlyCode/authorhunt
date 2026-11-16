/**
 * lib/queries/directory.ts
 *
 * The directory: every public page (published, in good standing), ordered by
 * Momentum, narrowed by the filters a reader can set (docs/development.md,
 * section 5). One query serves /authors and every landing page, so a filter
 * means the same thing wherever it's used.
 *
 * A work counts as public here once it has a launch that hasn't been pulled:
 * a work with no launch is still the author's draft.
 *
 * The facet counts (authors per genre, city, reference and platform) are
 * grouped at read time, because no column holds them, and held for a minute
 * like the lookups.
 */

import { and, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { authors, follows, launches, referenceAuthors, works, type AiUse, type Author, type PageKind, type WorkKind } from "../db/schema";
import { launchDay } from "../ranking/day";
import { rowsOf } from "../sql";
import { colorFor } from "./board";
import { lookups, type Named } from "./lookups";

export type AuthorCard = {
  id: string;
  userId: string;
  kind: PageKind;
  handle: string;
  name: string;
  portraitUrl: string | null;
  color: string;
  tagline: string;
  genre: Named | null;
  city: string | null;
  citySlug: string | null;
  reference: (Named & { kind: "readers_of" | "inspired_by" }) | null;
  mature: boolean;
  momentum: number;
  followerCount: number;
  following: boolean;
};

export type WorkCard = {
  id: string;
  slug: string;
  kind: WorkKind;
  form: string;
  title: string;
  tagline: string;
  coverUrl: string | null;
  color: string;
  mature: boolean;
  genre: Named | null;
  authorName: string;
  authorHandle: string;
  launchDay: string | null;
  launchStatus: string | null;
  cheerCount: number;
};

export type DirectoryFilters = {
  genre?: string;
  city?: string;
  readersOf?: string;
  inspiredBy?: string;
  platform?: string;
  kind?: PageKind;
  ai?: AiUse;
  q?: string;
  /** Pages with a launch (their own or a work's) on the board this calendar month. */
  launchedThisMonth?: boolean;
  /** Any of these genres, or any of these reference authors: what a new reader picks on For you. */
  anyGenres?: string[];
  anyReferences?: string[];
};

/** "generated" is named only so an old record can be labelled; Author Hunt does not accept AI-written work and the filter never offers it. */
export const AI_LABELS: Record<AiUse, string> = { none: "Without AI", assisted: "By the author, with AI as a tool", generated: "By AI (not accepted)" };
export const PAGE_SIZE = 24;

/** The two conditions every public listing of pages starts from. */
export const publicAuthor = () => and(isNotNull(authors.publishedAt), eq(authors.standing, "good")) as SQL;

const list = (slugs: string[]) => sql`ARRAY[${sql.join(slugs.map((s) => sql`${s}`), sql`, `)}]::text[]`;
/** A reader's words as an ILIKE pattern, with the wildcard characters taken literally. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function conditions(f: DirectoryFilters, now: Date): SQL[] {
  const conds: SQL[] = [publicAuthor()];
  if (f.genre) conds.push(sql`${authors.genres} @> ARRAY[${f.genre}]::text[]`);
  if (f.city) conds.push(eq(authors.citySlug, f.city));
  if (f.readersOf) conds.push(sql`${authors.readersOf} @> ARRAY[${f.readersOf}]::text[]`);
  if (f.inspiredBy) conds.push(sql`${authors.inspiredBy} @> ARRAY[${f.inspiredBy}]::text[]`);
  if (f.kind) conds.push(eq(authors.kind, f.kind));
  if (f.ai) conds.push(eq(authors.aiUse, f.ai));
  if (f.q) {
    const pattern = likePattern(f.q);
    conds.push(sql`(${authors.name} ilike ${pattern} or ${authors.tagline} ilike ${pattern})`);
  }
  if (f.platform) {
    conds.push(sql`exists (select 1 from works w join launches l on l.work_id = w.id where w.author_id = ${authors.id} and l.status <> 'pulled' and w.platforms @> ARRAY[${f.platform}]::text[])`);
  }
  if (f.launchedThisMonth) {
    const today = launchDay(now);
    conds.push(sql`exists (select 1 from launches l where l.author_id = ${authors.id} and l.status in ('live', 'closed') and l.launch_day >= ${`${today.slice(0, 7)}-01`} and l.launch_day <= ${today})`);
  }
  const any: SQL[] = [];
  if (f.anyGenres?.length) any.push(sql`${authors.genres} && ${list(f.anyGenres)}`);
  if (f.anyReferences?.length) any.push(sql`(${authors.readersOf} || ${authors.inspiredBy}) && ${list(f.anyReferences)}`);
  if (any.length) conds.push(sql`(${sql.join(any, sql` or `)})`);
  return conds;
}

/** Author rows as the cards a directory row draws, with whether the viewer follows each. */
export async function authorCards(rows: Author[], viewerId: string | null): Promise<AuthorCard[]> {
  if (!rows.length) return [];
  const look = await lookups();
  const mine = viewerId
    ? new Set((await db.select({ id: follows.authorId }).from(follows).where(and(eq(follows.userId, viewerId), inArray(follows.authorId, rows.map((r) => r.id))))).map((f) => f.id))
    : new Set<string>();
  return rows.map((a) => {
    const genreSlug = a.genres[0];
    const readers = a.readersOf[0];
    const inspired = a.inspiredBy[0];
    return {
      id: a.id, userId: a.userId, kind: a.kind, handle: a.handle, name: a.name, portraitUrl: a.portraitUrl, color: colorFor(a.handle), tagline: a.tagline,
      genre: genreSlug ? { slug: genreSlug, name: look.genres.get(genreSlug) ?? genreSlug } : null,
      city: a.city, citySlug: a.citySlug,
      reference: readers
        ? { kind: "readers_of" as const, slug: readers, name: look.references.get(readers) ?? readers }
        : inspired ? { kind: "inspired_by" as const, slug: inspired, name: look.references.get(inspired) ?? inspired } : null,
      mature: a.mature, momentum: Math.round(a.momentum), followerCount: a.followerCount, following: mine.has(a.id),
    };
  });
}

export type DirectoryPage = { cards: AuthorCard[]; total: number; page: number; pages: number };

export async function directory(filters: DirectoryFilters, opts: { viewerId: string | null; page?: number; limit?: number; now: Date }): Promise<DirectoryPage> {
  const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 100);
  const where = and(...conditions(filters, opts.now));
  const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(authors).where(where);
  const total = Number(count?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(Math.trunc(opts.page ?? 1) || 1, 1), pages);
  const rows = await db.select().from(authors).where(where).orderBy(desc(authors.momentum), authors.name).limit(limit).offset((page - 1) * limit);
  return { cards: await authorCards(rows, opts.viewerId), total, page, pages };
}

/** Public authors by id, in the order asked for: for collections and For you. */
export async function authorCardsByIds(ids: string[], viewerId: string | null): Promise<AuthorCard[]> {
  if (!ids.length) return [];
  const rows = await db.select().from(authors).where(and(publicAuthor(), inArray(authors.id, ids)));
  const cards = await authorCards(rows, viewerId);
  const by = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => by.get(id)).filter((c): c is AuthorCard => Boolean(c));
}

const workBase = () => db.select({ work: works, author: authors, launch: launches }).from(works)
  .innerJoin(authors, eq(works.authorId, authors.id))
  .innerJoin(launches, eq(launches.workId, works.id));
const publicWork = () => and(publicAuthor(), sql`${launches.status} <> 'pulled'`) as SQL;

async function toWorkCards(rows: Awaited<ReturnType<ReturnType<typeof workBase>["execute"]>>): Promise<WorkCard[]> {
  const look = await lookups();
  return rows.map(({ work, author, launch }) => {
    const genreSlug = work.genres[0] ?? author.genres[0];
    return {
      id: work.id, slug: work.slug, kind: work.kind, form: work.form, title: work.title, tagline: work.tagline, coverUrl: work.coverUrl, color: work.coverColor, mature: work.mature,
      genre: genreSlug ? { slug: genreSlug, name: look.genres.get(genreSlug) ?? genreSlug } : null,
      authorName: author.name, authorHandle: author.handle,
      launchDay: launch.launchDay, launchStatus: launch.status, cheerCount: launch.cheerCount,
    };
  });
}

/** Public works, newest launch first, narrowed by a genre, a platform or a reader's words. */
export async function recentWorks(filter: { genre?: string; platform?: string; q?: string }, limit = 8): Promise<WorkCard[]> {
  const conds: SQL[] = [publicWork()];
  if (filter.genre) conds.push(sql`${works.genres} @> ARRAY[${filter.genre}]::text[]`);
  if (filter.platform) conds.push(sql`${works.platforms} @> ARRAY[${filter.platform}]::text[]`);
  if (filter.q) {
    const pattern = likePattern(filter.q);
    conds.push(sql`(${works.title} ilike ${pattern} or ${works.tagline} ilike ${pattern})`);
  }
  return toWorkCards(await workBase().where(and(...conds)).orderBy(desc(launches.launchDay), desc(launches.score)).limit(limit));
}

export async function workCardsByIds(ids: string[]): Promise<WorkCard[]> {
  if (!ids.length) return [];
  const cards = await toWorkCards(await workBase().where(and(publicWork(), inArray(works.id, ids))));
  const by = new Map(cards.map((c) => [c.id, c]));
  return ids.map((id) => by.get(id)).filter((c): c is WorkCard => Boolean(c));
}

export type Counted = Named & { count: number };
export type Facets = { genres: Counted[]; cities: Counted[]; readersOf: Counted[]; inspiredBy: Counted[]; platforms: Counted[]; ai: Counted[] };

let held: { at: number; value: Facets } | null = null;

/**
 * How many public pages carry each filter value, most first. A reference
 * author appears once an admin has approved the name; Lorec's hidden platform
 * never does.
 */
export async function facets(): Promise<Facets> {
  if (held && Date.now() - held.at < 60_000) return held.value;
  type Row = { slug: string; name?: string | null; n: number };
  const live = sql`a.published_at is not null and a.standing = 'good'`;
  const [look, approved, g, c, r, i, p, ai] = await Promise.all([
    lookups(),
    db.select({ slug: referenceAuthors.slug }).from(referenceAuthors).where(eq(referenceAuthors.approved, true)),
    db.execute(sql`select v as slug, count(*)::int as n from authors a cross join lateral unnest(a.genres) as v where ${live} group by v`),
    db.execute(sql`select a.city_slug as slug, min(case when a.region is null or a.region = '' then a.city else a.city || ', ' || a.region end) as name, count(*)::int as n from authors a where ${live} and a.city_slug is not null and a.city is not null group by a.city_slug`),
    db.execute(sql`select v as slug, count(*)::int as n from authors a cross join lateral unnest(a.readers_of) as v where ${live} group by v`),
    db.execute(sql`select v as slug, count(*)::int as n from authors a cross join lateral unnest(a.inspired_by) as v where ${live} group by v`),
    db.execute(sql`select v as slug, count(distinct a.id)::int as n from works w join authors a on a.id = w.author_id join launches l on l.work_id = w.id and l.status <> 'pulled' cross join lateral unnest(w.platforms) as v where ${live} group by v`),
    db.execute(sql`select a.ai_use as slug, count(*)::int as n from authors a where ${live} and a.ai_use is not null group by a.ai_use`),
  ]);
  const ok = new Set(approved.map((x) => x.slug));
  const shape = (result: unknown, names: Map<string, string> | null, keep: (slug: string) => boolean = () => true): Counted[] =>
    rowsOf<Row>(result).filter((x) => x.slug && keep(x.slug))
      .map((x) => ({ slug: x.slug, name: names ? names.get(x.slug) ?? x.slug : x.name ?? x.slug, count: Number(x.n) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const value: Facets = {
    genres: shape(g, look.genres, (s) => look.genres.has(s)),
    cities: shape(c, null),
    readersOf: shape(r, look.references, (s) => ok.has(s)),
    inspiredBy: shape(i, look.references, (s) => ok.has(s)),
    platforms: shape(p, look.platforms, (s) => look.platforms.has(s) && !look.hiddenPlatforms.has(s)),
    ai: shape(ai, new Map(Object.entries(AI_LABELS))),
  };
  held = { at: Date.now(), value };
  return value;
}

/** Whether a reference author has a public page of its own yet. */
export async function approvedReference(slug: string): Promise<Named | null> {
  const [row] = await db.select().from(referenceAuthors).where(and(eq(referenceAuthors.slug, slug), eq(referenceAuthors.approved, true))).limit(1);
  return row ? { slug: row.slug, name: row.name } : null;
}
