/**
 * app/(site)/author/[handle]/page.tsx
 *
 * An author's (or a publication's) page: the lasting thing, with their works
 * and launches under it, as a product's page is on Product Hunt. It is also
 * the page the short link opens from a video or a profile, so the top of it
 * holds what a reader came for: who this is, Follow, Support, and the works
 * with their buy links (docs/development.md, Sharing a page on video).
 *
 * Public and server-rendered (AGENTS.md rule 1). A page that hasn't been made
 * public is seen only by its owner; one not in good standing is not found. A
 * membership changes one thing here, the Support button, and nothing about
 * what is shown or how the links are followed (rules 3 and 4).
 */

import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hiddenBeforeOpening } from "@/lib/early";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors, cheers, launches, updates, works, type Launch } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { colorFor } from "@/lib/queries/board";
import { lookups, named } from "@/lib/queries/lookups";
import { hostOf, relFor, safeUrl } from "@/lib/seo/links";
import { OutLink } from "@/components/analytics/out-link";
import { Track } from "@/components/analytics/track";
import { AdultGate } from "@/components/author/adult-gate";
import { JsonLd } from "@/components/author/json-ld";
import { aiDeclaration, cleanLinks, launchLine, placeOf, supportLinkFor, viewerState, type LaunchLine } from "@/components/author/page-facts";
import { ShareButton } from "@/components/author/share-button";
import { CheerButton } from "@/components/board/cheer-button";
import { ago } from "@/components/comments/data";
import { CommentText } from "@/components/comments/text";
import { FollowButton } from "@/components/social/follow-button";
import { SaveButton } from "@/components/social/save-button";
import { ReportLink } from "@/components/trust/report-link";
import { FoundingMark, SayIcon } from "@/components/ui/icons";
import { Cover, Portrait } from "@/components/ui/picture";

type Props = { params: Promise<{ handle: string }> };

const load = cache(async (handle: string) => {
  const [author] = await db.select().from(authors).where(eq(authors.handle, handle.toLowerCase())).limit(1);
  return author ?? null;
});

const UPDATE_KINDS: Record<string, string> = { progress: "Progress", cover: "A cover", event: "An event", excerpt: "An excerpt", news: "News" };

function paragraphs(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const author = await load(handle);
  if (!author || author.standing !== "good" || !author.publishedAt) return { title: "Not found", robots: { index: false } };
  const look = await lookups();
  const genre = author.genres[0] ? look.genres.get(author.genres[0]) : null;
  const title = author.kind === "publication" ? author.name : `${author.name}, ${genre ? `${genre.toLowerCase()} author` : "author"}`;
  // A page marked Mature is left out of link preview cards, so its card says only that it is here.
  const description = author.mature
    ? `${author.name} on Author Hunt. The author has marked this page Mature.`
    : (author.tagline || paragraphs(author.bio)[0] || `${author.name} on Author Hunt: their works, launches and updates.`).slice(0, 200);
  const canonical = `/author/${author.handle}`;
  return {
    title, description,
    alternates: { canonical },
    openGraph: { title: author.name, description, url: canonical, type: "profile", siteName: "Author Hunt", username: author.handle },
    twitter: { card: "summary_large_image", title: author.name, description },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { handle } = await params;
  const [author, viewer] = await Promise.all([load(handle), getViewer()]);
  if (!author) notFound();
  const isOwner = viewer?.id === author.userId;
  if (author.standing !== "good") {
    if (!isOwner) notFound();
    return (
      <div className="wrap"><div className="page-head">
        <h1>{author.name}</h1>
        <p className="notice warn owner-note">Your page {author.standing === "suspended" ? "is suspended while a report is looked at" : "has been taken down"}, so nobody else can see it. You&apos;ll have been told why, and how to answer, in your notifications.</p>
      </div></div>
    );
  }
  if (!author.publishedAt && !isOwner) notFound();
  if (await hiddenBeforeOpening(isOwner)) notFound();

  const now = new Date();
  const signedIn = Boolean(viewer);
  const color = colorFor(author.handle);
  const isPublication = author.kind === "publication";
  const hideMature = !viewer?.adultConfirmedAt && !isOwner;
  const look = await lookups();
  const genres = named(author.genres, look.genres);
  const place = placeOf(author);
  const kicker = [genres[0]?.name, place].filter(Boolean).join(" · ");

  if (author.mature && hideMature) {
    return (
      <div className="wrap gated">
        <div className="lhead ahead">
          <Portrait className="tall" url={author.portraitUrl} color={color} label={author.portraitUrl ? author.name : ""} blurred />
          <div>
            {kicker && <span className="sc">{kicker}</span>}
            <h1>{author.name}<span className="flag">Mature</span></h1>
            <AdultGate signedIn={signedIn} what="this page" />
          </div>
        </div>
      </div>
    );
  }

  const [rows, posts, state, support] = await Promise.all([
    db.select({ work: works, launch: launches }).from(works).leftJoin(launches, eq(launches.workId, works.id)).where(eq(works.authorId, author.id)).orderBy(desc(launches.launchDay), desc(works.createdAt)),
    db.select().from(updates).where(eq(updates.authorId, author.id)).orderBy(desc(updates.createdAt)).limit(10),
    viewerState(viewer?.id ?? null, { authorId: author.id }),
    supportLinkFor(author, now),
  ]);
  const [pageLaunch] = await db.select().from(launches).where(and(eq(launches.authorId, author.id), eq(launches.kind, "author"))).orderBy(desc(launches.launchDay)).limit(1);
  const shownPageLaunch = pageLaunch && pageLaunch.status !== "pulled" ? pageLaunch : null;

  // A pulled launch takes its work off the public page; the owner still sees it, marked.
  const list = rows.filter((r) => r.launch?.status !== "pulled" || isOwner);
  const shownLaunches: Launch[] = [...list.flatMap((r) => (r.launch && r.launch.status !== "pulled" ? [r.launch] : [])), ...(shownPageLaunch ? [shownPageLaunch] : [])];
  const [lines, mine] = await Promise.all([
    Promise.all(shownLaunches.map(async (l) => [l.id, await launchLine(l, now)] as const)),
    viewer && shownLaunches.length
      ? db.select({ id: cheers.launchId }).from(cheers).where(and(eq(cheers.userId, viewer.id), inArray(cheers.launchId, shownLaunches.map((l) => l.id))))
      : [],
  ]);
  const lineOf = new Map<string, LaunchLine>(lines);
  const cheered = new Set(mine.map((c) => c.id));
  const said = (l: LaunchLine) => [l.rank, l.when].filter(Boolean).join(" · ");

  const facts = { siteVerified: Boolean(author.siteVerifiedAt) };
  const website = safeUrl(author.website);
  const links = cleanLinks(author.links);
  const readersOf = named(author.readersOf, look.references);
  const inspiredBy = named(author.inspiredBy, look.references);
  const written = aiDeclaration(author.aiUse);
  const bio = paragraphs(author.bio);
  const followers = `${author.followerCount.toLocaleString("en-US")} ${author.followerCount === 1 ? "follower" : "followers"}`;
  const pageLine = shownPageLaunch ? lineOf.get(shownPageLaunch.id) : undefined;
  const joined = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "America/New_York" }).format(author.publishedAt ?? author.createdAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${appUrl}/author/${author.handle}`,
    dateCreated: (author.publishedAt ?? author.createdAt).toISOString(),
    mainEntity: {
      "@type": isPublication ? "Organization" : "Person",
      name: author.name,
      alternateName: author.handle,
      url: `${appUrl}/author/${author.handle}`,
      ...(author.tagline ? { description: author.tagline } : {}),
      ...(author.portraitUrl ? { image: author.portraitUrl } : {}),
      ...(place && !isPublication ? { homeLocation: { "@type": "Place", name: place } } : {}),
      ...(genres.length ? { knowsAbout: genres.map((g) => g.name) } : {}),
      sameAs: [website, ...links.map((l) => l.url)].filter(Boolean),
      interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/FollowAction", userInteractionCount: author.followerCount },
    },
  };

  const listOf = (items: { slug: string; name: string }[], base: string) => items.map((x, i) => <span key={x.slug}>{i > 0 && ", "}<Link className="word" href={`/${base}/${x.slug}`}>{x.name}</Link></span>);

  return (
    <div className="wrap">
      <Track authorId={author.id} />
      <JsonLd data={jsonLd} />

      {isOwner && !author.publishedAt && <p className="notice owner-note">Your page isn&apos;t public yet, so only you can see it. <Link className="word" href="/studio">Finish it in the Studio</Link> and make it public when it&apos;s ready.</p>}

      <div className="lhead ahead">
        <Portrait className="tall" url={author.portraitUrl} color={color} label={author.name} />
        <div>
          {kicker && <span className="sc">{kicker}</span>}
          <h1>{author.name}{author.founding && <FoundingMark />}{author.mature && <span className="flag">Mature</span>}</h1>
          {author.tagline && <p className="tag">{author.tagline}</p>}
          <div className="go">
            <FollowButton authorId={author.id} following={state.following} signedIn={signedIn} isSelf={isOwner} />
            <span className="followers">{followers}</span>
            {support && (
              <OutLink className="btn" href={support} rel={relFor("support", facts)} authorId={author.id}>
                <span title={`Opens ${hostOf(support)}, which is the author's own. Author Hunt takes nothing.`}>Support</span>
              </OutLink>
            )}
            <SaveButton authorId={author.id} saved={state.saved} signedIn={signedIn} />
            <ShareButton title={`${author.name} on Author Hunt`} text={author.tagline || undefined} path={`/${author.handle}`} />
          </div>
          {pageLine && <p className="launched"><span className="sc">{pageLine.rank && <><span className="hl">{pageLine.rank}</span> &ensp;</>}{pageLine.when.replace(/^Launch(ed|ing) /, (m) => `Page ${m.toLowerCase()}`)}</span></p>}
          {isOwner && <p className="launched"><Link className="word" href="/studio">Edit your page in the Studio</Link></p>}
        </div>
        {shownPageLaunch && (
          <CheerButton variant="big" launchId={shownPageLaunch.id} title={author.name} count={shownPageLaunch.cheerCount} cheered={cheered.has(shownPageLaunch.id)} signedIn={signedIn} quiet={pageLine?.quiet} disabled={shownPageLaunch.status === "scheduled" || isOwner} />
        )}
      </div>

      <div className="split author-split">
        <main>
          {bio.length > 0 && <section className="lbody" id="about">{bio.map((p, i) => <p className="lead" key={i}>{p}</p>)}</section>}

          <section className="sec" id="works">
            <header><h2>{isPublication ? "Issues and works" : "Works"}</h2><span>{list.length === 1 ? "1 work" : `${list.length} works`}</span></header>
            {list.length === 0 ? <p className="thread-empty">Nothing here yet.</p> : (
              <ol>
                {list.map(({ work, launch }) => {
                  const pulled = launch?.status === "pulled";
                  const line = launch && !pulled ? lineOf.get(launch.id) : undefined;
                  const buy = cleanLinks(work.buyLinks);
                  return (
                    <li className="row work-row" key={work.id}>
                      <div className="rank">{launch?.status === "closed" && launch.rankDay ? launch.rankDay : ""}</div>
                      <Cover className="pic" url={work.coverUrl} color={work.coverColor} label={work.title} blurred={work.mature && hideMature} />
                      <div>
                        <span className="sc">{pulled ? "Pulled from the board" : line ? (line.live ? <span className="hl">{said(line)}</span> : said(line)) : work.form}</span>
                        <h3><Link href={`/work/${work.slug}`}>{work.title}</Link>{work.mature && <span className="flag">Mature</span>}</h3>
                        <p className="tag">{work.tagline} {line && <span className="it">{work.form}</span>}</p>
                        {buy.length > 0 && !(work.mature && hideMature) && (
                          <div className="meta">{buy.map((b) => <OutLink key={b.url} href={b.url} rel={relFor("buy", facts)} authorId={author.id}>{b.label}</OutLink>)}</div>
                        )}
                      </div>
                      <div className="acts">
                        {launch && !pulled && (
                          <>
                            <Link className="count" href={`/work/${work.slug}#comments`} aria-label={`${launch.commentCount} comments`}><SayIcon />{launch.commentCount}</Link>
                            <CheerButton launchId={launch.id} title={work.title} count={launch.cheerCount} cheered={cheered.has(launch.id)} signedIn={signedIn} quiet={line?.quiet} disabled={launch.status === "scheduled" || isOwner} />
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {posts.length > 0 && (
            <section className="sec" id="updates">
              <header><h2>Updates</h2></header>
              <ul className="updates">
                {posts.map((u) => (
                  <li key={u.id}>
                    <div className="when"><span className="sc">{UPDATE_KINDS[u.kind] ?? "News"}</span><time dateTime={u.createdAt.toISOString()}>{ago(u.createdAt, now)}</time></div>
                    <div className="body"><CommentText body={u.body} mentions={[]} /></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="rail">
          <section>
            <h2>Particulars</h2>
            <dl className="facts">
              {genres.length > 0 && <div><dt className="sc">Genre</dt><dd>{listOf(genres, "genre")}</dd></div>}
              {place && <div><dt className="sc">City</dt><dd>{author.citySlug ? <Link className="word" href={`/city/${author.citySlug}`}>{place}</Link> : place}</dd></div>}
              {readersOf.length > 0 && <div><dt className="sc">For readers of</dt><dd>{listOf(readersOf, "for-readers-of")}</dd></div>}
              {inspiredBy.length > 0 && <div><dt className="sc">Inspired by</dt><dd>{listOf(inspiredBy, "inspired-by")}</dd></div>}
              {written && <div><dt className="sc">Written</dt><dd>{written}</dd></div>}
              {(website || links.length > 0) && (
                <div><dt className="sc">Elsewhere</dt><dd className="elsewhere">
                  {website && <span><OutLink className="word" href={website} rel={relFor("website", facts)} authorId={author.id}>{hostOf(website)}</OutLink>{author.siteVerifiedAt && <small>Site verified</small>}</span>}
                  {links.map((l) => <span key={l.url}><OutLink className="word" href={l.url} rel={relFor("profile", facts)} authorId={author.id}>{l.label}</OutLink></span>)}
                </dd></div>
              )}
              <div><dt className="sc">Here since</dt><dd>{joined}{author.founding && <small>Founding author</small>}</dd></div>
            </dl>
          </section>

          <section>
            <h2>Momentum</h2>
            <p className="momentum"><b>{Math.round(author.momentum).toLocaleString("en-US")}</b></p>
            <small>Earned by launching, posting updates and being read. It halves every thirty days, so it shows who is active now.</small>
          </section>

          <section>
            <h2>Something wrong?</h2>
            <ul>
              <li>
                <ReportLink targetKind="author" targetId={author.id} signedIn={signedIn} label="Report this page" />
                <small>Not the real author, a missing Mature mark, or AI use that wasn&apos;t declared.</small>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
