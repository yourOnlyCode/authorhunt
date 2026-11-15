/**
 * lib/discover/landing.ts
 *
 * What every filter landing page (a genre, a city, a reference author, a
 * platform) shares: its metadata, and the rule that a page with fewer than
 * five authors is kept out of search engines until it fills
 * (docs/development.md, section 5). A thin page helps nobody find anything.
 */

import type { Metadata } from "next";
import { directory, type DirectoryFilters } from "../queries/directory";
import { getViewer } from "../auth";

export const INDEX_AT = 5;
export const LANDING_LIMIT = 48;

export function landingMeta(input: { title: string; description: string; path: string; total: number }): Metadata {
  return {
    title: input.title, description: input.description,
    alternates: { canonical: input.path },
    openGraph: { title: input.title, description: input.description, url: input.path },
    robots: input.total < INDEX_AT ? { index: false, follow: true } : undefined,
  };
}

/** How many public pages match, for metadata, without drawing them. */
export async function landingTotal(filters: DirectoryFilters): Promise<number> {
  return (await directory(filters, { viewerId: null, limit: 1, now: new Date() })).total;
}

export async function landingData(filters: DirectoryFilters) {
  const viewer = await getViewer();
  const list = await directory(filters, { viewerId: viewer?.id ?? null, limit: LANDING_LIMIT, now: new Date() });
  return { viewer, list };
}
