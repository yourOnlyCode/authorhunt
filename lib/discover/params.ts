/**
 * lib/discover/params.ts
 *
 * The directory's filters as query parameters, read and written in one place
 * so a link, the filter form and the canonical URL always agree. Parameters
 * are written in a fixed order and empty ones are left out, so one set of
 * filters has exactly one address.
 */

import type { AiUse, PageKind } from "../db/schema";
import type { DirectoryFilters } from "../queries/directory";

export type RawParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const slug = (v: string | string[] | undefined) => { const s = first(v); return SLUG.test(s) ? s : undefined; };

/** Several slugs from a repeated parameter, a comma-separated one, or both. */
export function slugList(v: string | string[] | undefined, max: number): string[] {
  const all = (Array.isArray(v) ? v : [v ?? ""]).flatMap((s) => s.split(",")).map((s) => s.trim()).filter((s) => SLUG.test(s));
  return [...new Set(all)].slice(0, max);
}

export function parseFilters(raw: RawParams): DirectoryFilters {
  const kind = first(raw.kind);
  const ai = first(raw.written);
  const q = first(raw.q).slice(0, 80);
  return {
    kind: kind === "author" || kind === "publication" ? (kind as PageKind) : undefined,
    genre: slug(raw.genre), city: slug(raw.city), readersOf: slug(raw.readers), inspiredBy: slug(raw.inspired), platform: slug(raw.platform),
    ai: ai === "none" || ai === "assisted" ? (ai as AiUse) : undefined,
    launchedThisMonth: first(raw.month) === "1" || undefined,
    q: q || undefined,
  };
}

export function parsePage(raw: RawParams): number {
  const n = Number.parseInt(first(raw.page), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

/** The address of the directory with these filters, on this page. */
export function directoryHref(f: DirectoryFilters, page = 1): string {
  const p = new URLSearchParams();
  if (f.kind) p.set("kind", f.kind);
  if (f.genre) p.set("genre", f.genre);
  if (f.city) p.set("city", f.city);
  if (f.readersOf) p.set("readers", f.readersOf);
  if (f.inspiredBy) p.set("inspired", f.inspiredBy);
  if (f.platform) p.set("platform", f.platform);
  if (f.ai) p.set("written", f.ai);
  if (f.launchedThisMonth) p.set("month", "1");
  if (f.q) p.set("q", f.q);
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/authors?${qs}` : "/authors";
}
