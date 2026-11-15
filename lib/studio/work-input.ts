/**
 * lib/studio/work-input.ts
 *
 * Reading and checking what the work form sends, for both the route that
 * makes a work and the one that changes it. Adding a work is free and never
 * asks about membership (AGENTS.md rule 3).
 */

import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { genres, platforms, works, type LinkItem, type Work } from "../db/schema";
import { safeUrl } from "../seo/links";
import { slugify } from "../slug";
import { AI_VALUES, CONTENT_NOTE_SLUGS, COVER_SWATCHES, LIMITS } from "./rules";
import { ownImages } from "./server";

const line = (max: number) => z.string().trim().max(max, `Keep that under ${max} characters.`);

export const WorkBody = z.object({
  kind: z.enum(["book", "short", "serial", "issue"]).default("book"),
  form: line(40).default(""),
  title: z.string().trim().min(1, "It needs a title.").max(160),
  tagline: line(160).default(""),
  description: line(6000).default(""),
  excerpt: line(8000).default(""),
  coverUrl: z.string().nullable().default(null),
  coverColor: z.string().default("#1F3A5C"),
  gallery: z.array(z.object({ url: z.string(), caption: line(140).default("") })).max(LIMITS.gallery, `Up to ${LIMITS.gallery} pictures.`).default([]),
  pubDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "The publication date isn't a date.").nullable().default(null),
  pages: z.number().int().min(1).max(20000).nullable().default(null),
  isbn: line(20).default(""),
  buyLinks: z.array(z.object({ label: line(40), url: line(300) })).max(LIMITS.buyLinks).default([]),
  genres: z.array(z.string()).max(LIMITS.genres, `Choose up to ${LIMITS.genres} genres.`).default([]),
  platforms: z.array(z.string()).max(12).default([]),
  aiUse: z.enum(AI_VALUES).nullable().default(null),
  mature: z.boolean().default(false),
  contentNotes: z.array(z.string()).max(20).default([]),
  contentNoteText: line(200).default(""),
});
export type WorkInput = z.infer<typeof WorkBody>;

type Values = Omit<typeof works.$inferInsert, "authorId" | "slug">;

/** The columns to write, or the sentence saying what's wrong. */
export async function workValues(d: WorkInput, userId: string, existing: Work | null): Promise<{ values: Values } | { error: string }> {
  const buyLinks: LinkItem[] = [];
  for (const l of d.buyLinks) {
    if (!l.label && !l.url) continue;
    const url = safeUrl(l.url);
    if (!url) return { error: `The link "${l.label || l.url}" needs a full web address.` };
    buyLinks.push({ label: l.label || new URL(url).hostname.replace(/^www\./, ""), url });
  }

  const isbn = d.isbn.replace(/[\s-]/g, "").toUpperCase();
  if (isbn && !/^(\d{9}[\dX]|\d{13})$/.test(isbn)) return { error: "An ISBN is 10 or 13 digits." };

  if (!COVER_SWATCHES.some((s) => s.value === d.coverColor)) return { error: "Choose one of the cover colours." };

  const knownGenres = d.genres.length ? await db.select({ slug: genres.slug }).from(genres).where(inArray(genres.slug, d.genres)) : [];
  const genreSlugs = [...new Set(d.genres)].filter((g) => knownGenres.some((k) => k.slug === g));
  if (genreSlugs.length !== d.genres.length) return { error: "One of those genres isn't on the list." };

  // A hidden platform (Lorec, until its publishing is ready) can't be chosen.
  const knownPlatforms = d.platforms.length ? await db.select().from(platforms).where(inArray(platforms.slug, d.platforms)) : [];
  const platformSlugs = [...new Set(d.platforms)].filter((p) => knownPlatforms.some((k) => k.slug === p && !k.hidden));
  if (platformSlugs.length !== d.platforms.length) return { error: "One of those places isn't on the list." };

  const contentNotes = [...new Set(d.contentNotes)];
  if (contentNotes.some((n) => !CONTENT_NOTE_SLUGS.has(n))) return { error: "One of those content notes isn't on the list." };

  // A picture has to be one this person uploaded, or one the work already had.
  const kept = new Set([existing?.coverUrl, ...(existing?.gallery ?? []).map((g) => g.url)].filter(Boolean) as string[]);
  const fresh = [d.coverUrl, ...d.gallery.map((g) => g.url)].filter((u): u is string => Boolean(u) && !kept.has(u as string));
  const mine = await ownImages(userId, fresh);
  if (fresh.some((u) => !mine.has(u))) return { error: "One of those pictures isn't one you uploaded." };

  // A work that has a declaration keeps one: it can be changed, not taken back.
  const aiUse = d.aiUse ?? existing?.aiUse ?? null;

  return { values: {
    kind: d.kind, form: d.form || "A book", title: d.title, tagline: d.tagline, description: d.description, excerpt: d.excerpt,
    coverUrl: d.coverUrl, coverColor: d.coverColor, gallery: d.gallery, pubDate: d.pubDate, pages: d.pages, isbn: isbn || null,
    buyLinks, genres: genreSlugs, platforms: platformSlugs, aiUse, mature: d.mature, contentNotes, contentNoteText: d.contentNoteText,
  } };
}

/** slugify(title), with a number added until no other work has it. */
export async function uniqueWorkSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title) || "untitled";
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? base : `${base.slice(0, 74)}-${n}`;
    const [taken] = await db.select({ id: works.id }).from(works).where(exceptId ? and(eq(works.slug, slug), ne(works.id, exceptId)) : eq(works.slug, slug)).limit(1);
    if (!taken) return slug;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

/** The pictures a save dropped, to be removed from storage. */
export function droppedImages(before: Work, after: Pick<Work, "coverUrl" | "gallery">): string[] {
  const now = new Set([after.coverUrl, ...after.gallery.map((g) => g.url)]);
  return [before.coverUrl, ...before.gallery.map((g) => g.url)].filter((u): u is string => Boolean(u) && !now.has(u));
}
