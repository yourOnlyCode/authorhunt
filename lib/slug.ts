/** Lowercase letters, digits and hyphens: "Raleigh, N.C." becomes "raleigh-n-c". */
const LETTERS: Record<string, string> = { "\u00f8": "o", "\u00e6": "ae", "\u0153": "oe", "\u00df": "ss", "\u0142": "l", "\u0111": "d", "\u00f0": "d", "\u00fe": "th" };

export function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/[\u00f8\u00e6\u0153\u00df\u0142\u0111\u00f0\u00fe]/g, (ch) => LETTERS[ch] ?? ch)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    // An apostrophe joins a word rather than splitting it: "Understudy's" is "understudys".
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Names a handle may not take, because they are routes. */
export const RESERVED_HANDLES = new Set(["api", "author", "work", "authors", "works", "launches", "genre", "city", "for-readers-of", "inspired-by", "platform", "for-you", "collections", "collection", "studio", "pricing", "sign-in", "sign-up", "admin", "you", "standing", "notifications", "settings", "splash", "confirm", "terms", "privacy", "about", "search", "threads", "letter", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico", "icon.svg", "ornament", "uploads", "_next"]);

export function validHandle(handle: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(handle) && !RESERVED_HANDLES.has(handle);
}
