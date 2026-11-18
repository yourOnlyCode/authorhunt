/**
 * lib/early.ts
 *
 * Before the site opens, with early access on, an author can set up their
 * page and first launch (/start). Their launch page and author page are at
 * their real addresses so they can see them as they will look, but until
 * opening those pages are for their own author only, and for the owner
 * looking through the preview link. Everyone else gets "not found", the same
 * as for a page that doesn't exist.
 */

import { cookies } from "next/headers";
import { beforeLaunch } from "./env";

/** True for the site's owner, who has opened the preview link (proxy.ts sets the cookie). */
async function hasPreview(): Promise<boolean> {
  const secret = process.env.PREVIEW_SECRET;
  return Boolean(secret) && (await cookies()).get("ah_preview")?.value === secret;
}

/** Whether a public page must stay hidden from this visitor because the site hasn't opened. */
export async function hiddenBeforeOpening(isOwner: boolean, now: Date = new Date()): Promise<boolean> {
  if (!beforeLaunch(now) || isOwner) return false;
  return !(await hasPreview());
}

/** Whether to show the slim header an early author gets: the site's places aren't open to them yet. */
export async function earlyChrome(now: Date = new Date()): Promise<boolean> {
  return beforeLaunch(now) && !(await hasPreview());
}
