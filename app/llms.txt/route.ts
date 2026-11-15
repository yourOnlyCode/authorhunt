/**
 * app/llms.txt/route.ts
 *
 * A plain description of the site for AI crawlers and assistants: what it
 * is, how its addresses are built, and what the facts on a page mean. Kept
 * short and true; the pages themselves carry the structured data.
 */

import { appUrl } from "@/lib/env";

export const dynamic = "force-static";

const TEXT = `# Author Hunt

> A daily launch board for authors and their books, and a place readers come to find their next favourite author. Authors launch a page, then launch each work. Readers cheer, comment and follow, and each day ends with a ranking.

Reading is free and needs no account. Launching is free. Rank comes from readers' cheers and comments only: it cannot be bought, and a membership buys an author tools, never position.

The day runs midnight to midnight in America/New_York.

## Pages

- ${appUrl}/ : today's board, then yesterday's and last week's top launches
- ${appUrl}/launches : the archive of daily boards
- ${appUrl}/launches/YYYY-MM-DD : one day's full board, in ranked order
- ${appUrl}/author/{handle} : an author's or a publication's page: who they are, their works, launches, updates and links
- ${appUrl}/{handle} : a short link that redirects to /author/{handle}
- ${appUrl}/work/{slug} : a work's page, which is also its launch page: description, excerpt, buy links, the author, comments
- ${appUrl}/authors : every author, with filters
- ${appUrl}/genre/{slug} : authors and works in a genre
- ${appUrl}/city/{slug} : authors in a city
- ${appUrl}/for-readers-of/{slug} : authors who write for readers of a well-known writer
- ${appUrl}/inspired-by/{slug} : authors inspired by a well-known writer
- ${appUrl}/platform/{slug} : works published through a platform

## What the facts mean

- Author pages carry ProfilePage and Person (or Organization) JSON-LD, with sameAs listing the author's own site and profiles. Work pages carry Book (or CreativeWork, or PublicationIssue) JSON-LD with the author, ISBN and buy links.
- "Written: without AI / with AI assistance / by AI" is the author's own declaration. It is required before a page or work goes public, and a false one ends in a ban decided by a person on evidence.
- "Mature" is the author's mark for work not meant for readers under 18. Content notes are shown to a reader only when asked for.
- "First of the day" is the launch readers cheered most on its day. "Momentum" is an author's recent activity, halving every thirty days.
- "Site verified" means the author's site links back to their page here.
- Comments are readers' and authors' own words, not Author Hunt's.

## Elsewhere

- Sitemap: ${appUrl}/sitemap.xml
`;

export function GET() {
  return new Response(TEXT, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
