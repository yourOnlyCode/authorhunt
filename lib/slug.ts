/** Lowercase letters, digits and hyphens: "Raleigh, N.C." becomes "raleigh-n-c". */
export function slugify(input: string): string {
  return input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Names a handle may not take, because they are routes. */
export const RESERVED_HANDLES = new Set(["api", "author", "work", "authors", "works", "launches", "genre", "city", "for-readers-of", "inspired-by", "platform", "for-you", "collections", "collection", "studio", "pricing", "sign-in", "sign-up", "admin", "notifications", "settings", "splash", "confirm", "terms", "privacy", "about", "search", "threads", "letter", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico", "icon.svg", "ornament", "uploads", "_next"]);

export function validHandle(handle: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(handle) && !RESERVED_HANDLES.has(handle);
}
