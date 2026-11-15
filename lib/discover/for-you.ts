/**
 * lib/discover/for-you.ts
 *
 * A signed-in reader's feed, from three plain SQL sources and no model
 * (docs/development.md, section 5):
 *
 *   1. recent and coming launches, and updates, from authors they follow;
 *   2. authors who share genres or reference authors with the ones they
 *      follow, have cheered or have saved, weighted by how much is shared
 *      and by Momentum;
 *   3. authors cheered by readers who cheered what they cheered.
 *
 * Sources 2 and 3 are merged into one list of authors to try, never including
 * anyone already followed or the reader's own page. Each suggestion carries
 * the reason in words, so the reader can see why it's there. Nothing here
 * reads billing: a membership can't buy a place in anyone's feed.
 */

import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { authors, follows, launches, updates, works } from "../db/schema";
import { toCards, type LaunchCard } from "../queries/board";
import { authorCardsByIds, type AuthorCard } from "../queries/directory";
import { lookups } from "../queries/lookups";
import { addDays, launchDay } from "../ranking/day";
import { rowsOf } from "../sql";

export type FeedUpdate = { id: string; body: string; kind: string; createdAt: Date; authorName: string; authorHandle: string; workTitle: string | null; workSlug: string | null };
export type Suggestion = AuthorCard & { why: string };
export type ForYou = { hasHistory: boolean; follows: number; coming: LaunchCard[]; recent: LaunchCard[]; updates: FeedUpdate[]; suggestions: Suggestion[] };

const WINDOW_DAYS = 30;

/** The authors a reader has shown interest in: followed, cheered, or saved (the page or one of its works). */
const seedSql = (viewerId: string) => sql`
  select author_id from follows where user_id = ${viewerId}
  union select l.author_id from cheers c join launches l on l.id = c.launch_id where c.user_id = ${viewerId}
  union select ci.author_id from collection_items ci join collections co on co.id = ci.collection_id where co.user_id = ${viewerId} and ci.author_id is not null
  union select w.author_id from collection_items ci join collections co on co.id = ci.collection_id join works w on w.id = ci.work_id where co.user_id = ${viewerId}`;

type Shared = { id: string; g: number; r: number; top_genre: string | null; top_ref: string | null; score: number };

/** Source 2: overlap in genres and reference authors with the seed, times a gentle Momentum weight. */
async function bySharedTaste(viewerId: string, limit: number): Promise<Shared[]> {
  const result = await db.execute(sql`
    with seed as (${seedSql(viewerId)}),
    seed_genres as (
      select v as slug, count(*)::int as n from authors a join seed s on s.author_id = a.id cross join lateral unnest(a.genres) as v group by v),
    seed_refs as (
      select v as slug, count(*)::int as n from authors a join seed s on s.author_id = a.id cross join lateral unnest(a.readers_of || a.inspired_by) as v group by v),
    cand as (
      select a.id, a.momentum,
        coalesce((select sum(sg.n) from seed_genres sg where sg.slug = any(a.genres)), 0)::int as g,
        coalesce((select sum(sr.n) from seed_refs sr where sr.slug = any(a.readers_of || a.inspired_by)), 0)::int as r,
        (select sg.slug from seed_genres sg where sg.slug = any(a.genres) order by sg.n desc, sg.slug limit 1) as top_genre,
        (select sr.slug from seed_refs sr where sr.slug = any(a.readers_of || a.inspired_by) order by sr.n desc, sr.slug limit 1) as top_ref
      from authors a
      where a.published_at is not null and a.standing = 'good' and a.user_id <> ${viewerId}
        and a.id not in (select author_id from follows where user_id = ${viewerId}))
    select id, g, r, top_genre, top_ref, ((g + 2 * r) * ln(2 + greatest(momentum, 0)))::float8 as score
    from cand where g + r > 0 order by score desc limit ${limit}`);
  return rowsOf<Shared>(result).map((x) => ({ ...x, g: Number(x.g), r: Number(x.r), score: Number(x.score) }));
}

/** Source 3: authors whose launches were cheered by readers who cheered a launch this reader cheered. */
async function byFellowReaders(viewerId: string, limit: number): Promise<{ id: string; readers: number }[]> {
  const result = await db.execute(sql`
    with mine as (select launch_id from cheers where user_id = ${viewerId}),
    fellows as (select distinct c.user_id from cheers c join mine m on m.launch_id = c.launch_id where c.user_id <> ${viewerId})
    select l.author_id as id, count(distinct c.user_id)::int as readers
    from cheers c join fellows f on f.user_id = c.user_id
      join launches l on l.id = c.launch_id and l.status <> 'pulled'
      join authors a on a.id = l.author_id
    where c.launch_id not in (select launch_id from mine)
      and a.published_at is not null and a.standing = 'good' and a.user_id <> ${viewerId}
      and a.id not in (select author_id from follows where user_id = ${viewerId})
    group by l.author_id order by readers desc limit ${limit}`);
  return rowsOf<{ id: string; readers: number }>(result).map((x) => ({ id: x.id, readers: Number(x.readers) }));
}

export async function forYou(viewerId: string, now: Date): Promise<ForYou> {
  const today = launchDay(now);
  const followed = (await db.select({ id: follows.authorId }).from(follows).where(eq(follows.userId, viewerId))).map((f) => f.id);
  const [seed] = rowsOf<{ n: number }>(await db.execute(sql`select count(*)::int as n from (${seedSql(viewerId)}) s`));
  const hasHistory = Number(seed?.n ?? 0) > 0;
  if (!hasHistory) return { hasHistory, follows: 0, coming: [], recent: [], updates: [], suggestions: [] };

  const launchRows = followed.length
    ? await db.select({ launch: launches, author: authors, work: works }).from(launches)
      .innerJoin(authors, eq(launches.authorId, authors.id)).leftJoin(works, eq(launches.workId, works.id))
      .where(and(inArray(launches.authorId, followed), ne(launches.status, "pulled"), eq(authors.standing, "good"),
        gte(launches.launchDay, addDays(today, -WINDOW_DAYS)), lte(launches.launchDay, addDays(today, WINDOW_DAYS))))
      .orderBy(desc(launches.launchDay), desc(launches.score)).limit(30)
    : [];
  const updateRows = followed.length
    ? await db.select({ update: updates, author: authors, work: works }).from(updates)
      .innerJoin(authors, eq(updates.authorId, authors.id)).leftJoin(works, eq(updates.workId, works.id))
      .where(and(inArray(updates.authorId, followed), eq(authors.standing, "good"), gte(updates.createdAt, new Date(now.getTime() - WINDOW_DAYS * 86_400_000))))
      .orderBy(desc(updates.createdAt)).limit(10)
    : [];

  const [cards, shared, fellow, look] = await Promise.all([toCards(launchRows, viewerId, now), bySharedTaste(viewerId, 24), byFellowReaders(viewerId, 24), lookups()]);

  // Merge the two sources: a fellow reader's cheer counts about as much as a shared reference author.
  const merged = new Map<string, { score: number; why: string }>();
  for (const s of shared) {
    const why = s.top_ref
      ? `Shares ${look.references.get(s.top_ref) ?? s.top_ref} with authors you follow or have cheered`
      : `Writes ${look.genres.get(s.top_genre ?? "") ?? s.top_genre ?? "in a genre"}, like authors you follow or have cheered`;
    merged.set(s.id, { score: s.score, why });
  }
  for (const f of fellow) {
    const had = merged.get(f.id);
    const why = f.readers === 1 ? "Cheered by a reader who cheered what you cheered" : `Cheered by ${f.readers} readers who cheered what you cheered`;
    merged.set(f.id, { score: (had?.score ?? 0) + 2 * f.readers, why: had ? had.why : why });
  }
  const order = [...merged].sort((a, b) => b[1].score - a[1].score).slice(0, 12).map(([id]) => id);
  const suggestions = (await authorCardsByIds(order, viewerId)).map((c) => ({ ...c, why: merged.get(c.id)?.why ?? "" }));

  return {
    hasHistory, follows: followed.length,
    coming: cards.filter((c) => c.day > today).reverse(),
    recent: cards.filter((c) => c.day <= today),
    updates: updateRows.map(({ update, author, work }) => ({ id: update.id, body: update.body, kind: update.kind, createdAt: update.createdAt, authorName: author.name, authorHandle: author.handle, workTitle: work?.title ?? null, workSlug: work?.slug ?? null })),
    suggestions,
  };
}
