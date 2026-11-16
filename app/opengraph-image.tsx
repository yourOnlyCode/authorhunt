/**
 * app/opengraph-image.tsx
 *
 * The card a link to authorhunt.com shows in a post or a message. Before the
 * site opens it carries the opening date; after, what the site is.
 */

import { ogCard, OG_SIZE } from "@/components/author/og-card";
import { beforeLaunch, launchAt } from "@/lib/env";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Author Hunt: find your next favourite author";

export default async function Image() {
  const opens = launchAt();
  const waiting = opens !== null && beforeLaunch(new Date());
  const date = opens ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(opens) : "";
  return ogCard({
    kicker: waiting ? `Opening ${date}` : "New authors and books, launched daily",
    title: "Find your next favourite author",
    line: waiting ? "Join the list and be part of the first launch." : "A daily launch board for authors and their books.",
    foot: "authorhunt.com",
  });
}
