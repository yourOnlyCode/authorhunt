/**
 * app/sitemap.ts
 *
 * Every public page worth a crawler's visit: the board, each published page
 * in good standing, each work, each day that had launches, and the filter
 * pages that have enough authors on them to be a page rather than a stub
 * (five). A hidden platform (Lorec's, until its publishing is ready) and a
 * reference author no admin has approved have no public page, so neither is
 * listed.
 */

import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { launchDay } from "@/lib/ranking/day";
import { rowsOf } from "@/lib/sql";

export const dynamic = "force-dynamic";

const MIN_AUTHORS = 5;
const PUBLIC_AUTHOR = sql`a.standing = 'good' and a.published_at is not null`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = launchDay(new Date());
  const [people, pieces, days, genreRows, cityRows, readerRows, inspiredRows, platformRows] = await Promise.all([
    db.execute(sql`select a.handle, a.created_at from authors a where ${PUBLIC_AUTHOR} order by a.momentum desc limit 20000`),
    db.execute(sql`select w.slug, w.created_at from works w join authors a on a.id = w.author_id left join launches l on l.work_id = w.id where ${PUBLIC_AUTHOR} and (l.id is null or l.status <> 'pulled') order by w.created_at desc limit 20000`),
    db.execute(sql`select distinct l.launch_day::text as day from launches l join authors a on a.id = l.author_id where ${PUBLIC_AUTHOR} and l.status in ('live', 'closed') and l.launch_day <= ${today} order by day desc limit 2000`),
    db.execute(sql`select g as slug from authors a, unnest(a.genres) g where ${PUBLIC_AUTHOR} group by g having count(*) >= ${MIN_AUTHORS}`),
    db.execute(sql`select a.city_slug as slug from authors a where ${PUBLIC_AUTHOR} and a.city_slug is not null and a.city_slug <> '' group by a.city_slug having count(*) >= ${MIN_AUTHORS}`),
    db.execute(sql`select r as slug from authors a, unnest(a.readers_of) r join reference_authors ra on ra.slug = r and ra.approved where ${PUBLIC_AUTHOR} group by r having count(*) >= ${MIN_AUTHORS}`),
    db.execute(sql`select r as slug from authors a, unnest(a.inspired_by) r join reference_authors ra on ra.slug = r and ra.approved where ${PUBLIC_AUTHOR} group by r having count(*) >= ${MIN_AUTHORS}`),
    db.execute(sql`select p as slug from works w join authors a on a.id = w.author_id, unnest(w.platforms) p join platforms pl on pl.slug = p and not pl.hidden where ${PUBLIC_AUTHOR} group by p having count(distinct w.author_id) >= ${MIN_AUTHORS}`),
  ]);

  const at = (path: string) => `${appUrl}${path}`;
  const filter = (rows: unknown, base: string): MetadataRoute.Sitemap => rowsOf<{ slug: string }>(rows).map((r) => ({ url: at(`/${base}/${r.slug}`), changeFrequency: "daily", priority: 0.5 }));

  return [
    { url: at("/"), changeFrequency: "hourly", priority: 1 },
    { url: at("/authors"), changeFrequency: "daily", priority: 0.8 },
    { url: at("/launches"), changeFrequency: "daily", priority: 0.6 },
    ...rowsOf<{ handle: string; created_at: string | Date }>(people).map((a) => ({ url: at(`/author/${a.handle}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...rowsOf<{ slug: string; created_at: string | Date }>(pieces).map((w) => ({ url: at(`/work/${w.slug}`), lastModified: new Date(w.created_at), changeFrequency: "daily" as const, priority: 0.7 })),
    ...rowsOf<{ day: string }>(days).map((d) => ({ url: at(`/launches/${d.day}`), lastModified: new Date(`${d.day}T23:59:59Z`), changeFrequency: (d.day === today ? "hourly" : "yearly") as "hourly" | "yearly", priority: 0.4 })),
    ...filter(genreRows, "genre"), ...filter(cityRows, "city"), ...filter(readerRows, "for-readers-of"), ...filter(inspiredRows, "inspired-by"), ...filter(platformRows, "platform"),
  ];
}
