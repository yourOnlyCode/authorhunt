/**
 * lib/studio/page.ts
 *
 * What every studio page starts with: the signed-in person (anyone else is
 * sent to sign in and back), and, for the pages that need it, their own page.
 * Someone with no page yet is sent to the desk, which offers to make one.
 */

import { redirect } from "next/navigation";
import { getViewerAuthor, requireViewer, type Viewer } from "../auth";
import type { Author } from "../db/schema";
import { DAY_ZONE } from "../ranking/day";

export async function requireAuthor(path: string): Promise<{ viewer: Viewer; author: Author }> {
  const viewer = await requireViewer(path);
  const author = await getViewerAuthor();
  if (!author) redirect("/studio");
  return { viewer, author };
}

/** "December 15, 2026", read in the zone the site keeps its days in. */
export function dateWords(at: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: DAY_ZONE, month: "long", day: "numeric", year: "numeric" }).format(at);
}

const ACCESS_WORDS = { member: "on, as a member", comp: "included", free: "off" } as const;
export function accessWords(access: "trial" | "member" | "comp" | "free", trialEndsAt: Date | null): string {
  if (access === "trial") return trialEndsAt ? `on trial until ${dateWords(trialEndsAt)}` : "on trial";
  return ACCESS_WORDS[access];
}
