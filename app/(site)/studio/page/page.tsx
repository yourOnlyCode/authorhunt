/**
 * /studio/page: make or change your own page. Free. The form is
 * components/studio/page-form.tsx; this loads what it chooses from.
 */

import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { PageForm, type PageFormValues } from "@/components/studio/page-form";
import { getViewerAuthor, requireViewer } from "@/lib/auth";
import { FREE_LINK_LIMIT } from "@/lib/billing/access";
import { isMember } from "@/lib/billing/server";
import { db } from "@/lib/db";
import { genres, referenceAuthors, works } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { LIMITS, pageChecklist } from "@/lib/studio/rules";

export const metadata: Metadata = { title: "Your page" };

export default async function StudioPage() {
  const viewer = await requireViewer("/studio/page");
  const author = await getViewerAuthor();
  const [genreRows, referenceRows, anyWork, member] = await Promise.all([
    db.select().from(genres).orderBy(genres.name),
    db.select().from(referenceAuthors).orderBy(referenceAuthors.name),
    author ? db.select({ id: works.id }).from(works).where(eq(works.authorId, author.id)).limit(1) : Promise.resolve([]),
    // A new page starts its thirty days of member tools when it's made.
    author ? isMember(author) : Promise.resolve(true),
  ]);
  const nameOf = new Map(referenceRows.map((r) => [r.slug, r.name]));
  const names = (slugs: string[]) => slugs.map((s) => nameOf.get(s) ?? s);

  const initial: PageFormValues = author ? {
    name: author.name, handle: author.handle, kind: author.kind, tagline: author.tagline, bio: author.bio, portraitUrl: author.portraitUrl,
    city: author.city ?? "", region: author.region ?? "", country: author.country ?? "", website: author.website ?? "",
    links: author.links, genres: author.genres, readersOf: names(author.readersOf), inspiredBy: names(author.inspiredBy),
    mature: author.mature, aiUse: author.aiUse, supportUrl: author.supportUrl ?? "",
  } : {
    name: viewer.displayName, handle: "", kind: "author", tagline: "", bio: "", portraitUrl: null, city: "", region: "", country: "", website: "",
    links: [], genres: [], readersOf: [], inspiredBy: [], mature: false, aiUse: null, supportUrl: "",
  };
  const checklist = pageChecklist(author ?? { portraitUrl: null, bio: "", genres: [], website: null, links: [], aiUse: null }, anyWork.length);

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>{author ? "Your page" : "Make your page"}</h1>
        <p>{author
          ? author.publishedAt ? "Changes show on your public page as soon as you save." : "A draft until you make it public. Only you can see it."
          : "Making a page is free, and so is launching it. Fill in what you can now; you can save a draft and come back."}</p>
      </div>
      <PageForm
        initial={initial}
        exists={Boolean(author)}
        published={Boolean(author?.publishedAt)}
        verified={Boolean(author?.siteVerifiedAt)}
        savedWebsite={author?.website ?? null}
        member={member}
        linkLimit={member ? LIMITS.memberLinks : Math.max(FREE_LINK_LIMIT, author?.links.length ?? 0)}
        appHost={new URL(appUrl).host}
        appUrl={appUrl}
        genres={genreRows.map((g) => ({ slug: g.slug, name: g.name }))}
        knownNames={referenceRows.filter((r) => r.approved).map((r) => r.name)}
        checklist={checklist}
      />
    </main>
  );
}
