/**
 * app/(site)/work/[slug]/page.tsx
 *
 * A work's page, which is also its launch page (docs/product-structure.md:
 * Product Hunt's launch page, with "Visit" become "Get the book"). Public and
 * server-rendered, so a reader never meets a wall here (AGENTS.md rule 1): an
 * account is asked for at the cheer, the follow, the save and the comment.
 *
 * Three things can stand in front of the page. A page that isn't in good
 * standing, or a pulled launch, is not found. Work marked Mature shows its
 * title and a gate until the reader says they are an adult. A scheduled
 * launch shows what is coming and takes no cheers or comments yet.
 */

import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hiddenBeforeOpening } from "@/lib/early";
import { FoundingMark } from "@/components/ui/icons";
import { and, eq } from "drizzle-orm";
import { getViewer } from "@/lib/auth";
import { db } from "@/lib/db";
import { authors, cheers, launches, notifyRequests, works, type WorkKind } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { colorFor } from "@/lib/queries/board";
import { lookups, named } from "@/lib/queries/lookups";
import { formatDay } from "@/lib/ranking/day";
import { hostOf, relFor } from "@/lib/seo/links";
import { OutLink } from "@/components/analytics/out-link";
import { Track } from "@/components/analytics/track";
import { AdultGate } from "@/components/author/adult-gate";
import { JsonLd } from "@/components/author/json-ld";
import { aiDeclaration, cleanLinks, launchLine, LONG_DAY, placeOf, supportLinkFor, viewerState } from "@/components/author/page-facts";
import { ShareButton } from "@/components/author/share-button";
import { CheerButton } from "@/components/board/cheer-button";
import { ContentNotes } from "@/components/book/content-notes";
import { NotifyForm } from "@/components/book/notify-form";
import { CommentThread } from "@/components/comments/thread";
import { FollowButton } from "@/components/social/follow-button";
import { SaveButton } from "@/components/social/save-button";
import { ReportLink } from "@/components/trust/report-link";
import { Cover, Portrait } from "@/components/ui/picture";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> };

const load = cache(async (slug: string) => {
  const [row] = await db.select({ work: works, author: authors, launch: launches }).from(works)
    .innerJoin(authors, eq(works.authorId, authors.id)).leftJoin(launches, eq(launches.workId, works.id))
    .where(eq(works.slug, slug)).limit(1);
  return row ?? null;
});

/** Whether anyone at all may read the page: the facts a signed-out visitor is judged by. */
function isPublic(row: NonNullable<Awaited<ReturnType<typeof load>>>): boolean {
  return row.author.standing === "good" && row.author.publishedAt !== null && row.launch?.status !== "pulled";
}

const NOUN: Record<WorkKind, string> = { book: "book", short: "work", serial: "serial", issue: "issue" };
const LD_TYPE: Record<WorkKind, string> = { book: "Book", short: "CreativeWork", serial: "CreativeWork", issue: "PublicationIssue" };

function paragraphs(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** "death-of-a-parent" and "drowning", then the author's own line, as one sentence a reader can take in. */
function contentNoteWords(slugs: string[], own: string): string {
  const words = slugs.map((s) => s.replace(/-/g, " ").trim()).filter(Boolean).join(", ");
  const list = words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}.` : "";
  return [list, own.trim()].filter(Boolean).join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await load(slug);
  if (!row || !isPublic(row)) return { title: "Not found", robots: { index: false } };
  const { work, author } = row;
  const title = `${work.title} by ${author.name}`;
  // Mature work is left out of link preview cards, so its card says only that it is here.
  const description = work.mature
    ? `${work.form} by ${author.name}, marked Mature by the author. On Author Hunt.`
    : (work.tagline || paragraphs(work.description)[0] || `${work.form} by ${author.name}, on Author Hunt.`).slice(0, 200);
  const canonical = `/work/${work.slug}`;
  return {
    title, description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "book", siteName: "Author Hunt", ...(work.isbn ? { isbn: work.isbn } : {}), authors: [`${appUrl}/author/${author.handle}`] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WorkPage({ params, searchParams }: Props) {
  const [{ slug }, { sort }] = await Promise.all([params, searchParams]);
  const [row, viewer] = await Promise.all([load(slug), getViewer()]);
  if (!row) notFound();
  const { work, author, launch } = row;
  const isOwner = viewer?.id === author.userId;
  if (author.standing !== "good") notFound();
  if (!isPublic(row) && !isOwner) notFound();
  if (await hiddenBeforeOpening(isOwner)) notFound();

  const now = new Date();
  const signedIn = Boolean(viewer);
  const path = `/work/${work.slug}`;
  const gated = work.mature && !viewer?.adultConfirmedAt && !isOwner;
  const scheduled = launch?.status === "scheduled";
  const line = launch ? await launchLine(launch, now) : null;

  const head = (rest: React.ReactNode, cheer: React.ReactNode) => (
    <div className="lhead">
      <Cover url={work.coverUrl} color={work.coverColor} label={work.title} blurred={gated} />
      <div>
        <span className="sc">
          {line?.rank && <><span className="hl">{line.rank}</span> &ensp;</>}
          {line ? line.when : work.form}
        </span>
        <h1>{work.title}{work.mature && <span className="flag">Mature</span>}</h1>
        {rest}
      </div>
      {cheer}
    </div>
  );

  if (gated) {
    return (
      <div className="wrap gated">
        {head(<><p className="tag it">by {author.name}</p><AdultGate signedIn={signedIn} what={`this ${NOUN[work.kind]}`} /></>, null)}
      </div>
    );
  }

  const [look, state, support, [cheered], [asked]] = await Promise.all([
    lookups(),
    viewerState(viewer?.id ?? null, { authorId: author.id, workId: work.id }),
    supportLinkFor(author, now),
    viewer && launch ? db.select({ id: cheers.launchId }).from(cheers).where(and(eq(cheers.userId, viewer.id), eq(cheers.launchId, launch.id))).limit(1) : [],
    viewer && launch && scheduled ? db.select({ id: notifyRequests.id }).from(notifyRequests).where(and(eq(notifyRequests.launchId, launch.id), eq(notifyRequests.userId, viewer.id))).limit(1) : [],
  ]);

  const facts = { siteVerified: Boolean(author.siteVerifiedAt) };
  const buy = cleanLinks(work.buyLinks);
  const description = paragraphs(work.description);
  const excerpt = paragraphs(work.excerpt);
  const notes = contentNoteWords(work.contentNotes, work.contentNoteText);
  const gallery = work.gallery.filter((g) => /^(https?:\/\/|\/)/.test(g.url));
  const genres = named(work.genres.length ? work.genres : author.genres, look.genres);
  const readersOf = named(author.readersOf, look.references);
  const platforms = named(work.platforms.filter((p) => !look.hiddenPlatforms.has(p)), look.platforms);
  const written = aiDeclaration(work.aiUse ?? author.aiUse);
  const place = placeOf(author);
  const color = colorFor(author.handle);
  const out = [work.pubDate ? formatDay(work.pubDate, LONG_DAY) : null, work.pages ? `${work.pages} pages` : null, work.words ? `${work.words.toLocaleString("en-US")} words` : null].filter(Boolean).join(" · ");
  const commentCount = launch?.commentCount ?? 0;
  const firstName = author.name.split(" ")[0] ?? author.name;
  // "A publisher" and "The author's own site" read as part of the sentence, not as names.
  const inSentence = (name: string) => (/^(A|An|The) /.test(name) ? `${name.charAt(0).toLowerCase()}${name.slice(1)}` : name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": LD_TYPE[work.kind],
    name: work.title,
    url: `${appUrl}${path}`,
    ...(work.tagline ? { headline: work.tagline } : {}),
    ...(description.length ? { description: description.join("\n\n").slice(0, 1000) } : {}),
    ...(work.coverUrl ? { image: work.coverUrl } : {}),
    ...(work.isbn ? { isbn: work.isbn } : {}),
    ...(work.pages ? { numberOfPages: work.pages } : {}),
    ...(work.pubDate ? { datePublished: work.pubDate } : {}),
    ...(genres.length ? { genre: genres.map((g) => g.name) } : {}),
    ...(work.mature ? { isFamilyFriendly: false } : {}),
    author: { "@type": author.kind === "publication" ? "Organization" : "Person", name: author.name, url: `${appUrl}/author/${author.handle}` },
    ...(buy.length ? { offers: buy.map((b) => ({ "@type": "Offer", url: b.url, seller: { "@type": "Organization", name: b.label } })) } : {}),
  };

  const supportButton = (label: string) => support && (
    <OutLink className="btn" href={support} rel={relFor("support", facts)} authorId={author.id}>
      <span title={`Opens ${hostOf(support)}, which is the author's own. Author Hunt takes nothing.`}>{label}</span>
    </OutLink>
  );

  return (
    <div className="wrap">
      <Track authorId={author.id} />
      <JsonLd data={jsonLd} />

      {isOwner && !author.publishedAt && <p className="notice owner-note">Your page isn&apos;t public yet, so only you can see this. <Link className="word" href="/studio">Finish it in the Studio</Link>.</p>}
      {isOwner && launch?.status === "pulled" && <p className="notice warn owner-note">This launch was pulled from the board, so only you can see this page.</p>}

      {head(
        <>
          {work.tagline && <p className="tag">{work.tagline}</p>}
          <div className="byline">
            <Portrait url={author.portraitUrl} color={color} label={author.name} />
            <span>by <Link className="word" href={`/author/${author.handle}`}>{author.name}</Link>{author.founding && <FoundingMark />} &ensp;<FollowButton authorId={author.id} following={state.following} signedIn={signedIn} variant="word" isSelf={isOwner} /></span>
          </div>
          <div className="go">
            {buy[0] && <OutLink className="btn solid" href={buy[0].url} rel={relFor("buy", facts)} authorId={author.id}>{`Get the ${NOUN[work.kind]}`}</OutLink>}
            {supportButton("Support the author")}
            <SaveButton workId={work.id} saved={state.saved} signedIn={signedIn} />
            <ShareButton title={`${work.title} by ${author.name}`} text={work.tagline || undefined} />
          </div>
          {scheduled && launch && (
            <div className="coming">
              <p>This launches on {formatDay(launch.launchDay, { weekday: "long", month: "long", day: "numeric" })}. Cheers and comments open that morning.</p>
              {!isOwner && <NotifyForm launchId={launch.id} signedIn={signedIn} asked={Boolean(asked)} />}
            </div>
          )}
        </>,
        launch && launch.status !== "pulled"
          ? <CheerButton variant="big" launchId={launch.id} title={work.title} count={launch.cheerCount} cheered={Boolean(cheered)} signedIn={signedIn} quiet={line?.quiet} disabled={scheduled || isOwner} />
          : null,
      )}

      <nav className="tabs" aria-label="Sections">
        <a href="#about" aria-current="true">About</a>
        {excerpt.length > 0 && <a href="#excerpt">Excerpt</a>}
        {launch && <a href="#comments">Comments {commentCount}</a>}
        <a href="#author">The author</a>
      </nav>

      <div className="split">
        <main className="lbody">
          {launch?.note && (
            // The author's note for this launch, shown first, in their name (docs/product-structure.md, section 2).
            <section className="author-note" aria-label={`A note from ${author.name}`}>
              <p className="sc">From the author</p>
              {paragraphs(launch.note).map((p, i) => <p key={i}>{p}</p>)}
              <p className="signed">{author.name}{author.founding && <FoundingMark />}</p>
            </section>
          )}
          <section id="about">
            {description.length > 0
              ? description.map((p, i) => <p className="lead" key={i}>{p}</p>)
              : <p className="lead">{work.tagline || `${work.form} by ${author.name}.`}</p>}
          </section>

          {notes && <ContentNotes text={notes} startOpen={Boolean(viewer?.alwaysShowNotes)} />}

          {gallery.length > 0 && (
            <div className="gallery" aria-label="Pictures">
              {gallery.map((g, i) => <div className="shot" key={i}><img src={g.url} alt={g.caption || `A picture from ${work.title}`} loading="lazy" /></div>)}
            </div>
          )}

          {excerpt.length > 0 && (
            <section id="excerpt" className="excerpt">
              <h2>An excerpt</h2>
              <div className="prose">{excerpt.map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>
          )}

          {launch && launch.status !== "pulled" && (
            <CommentThread launchId={launch.id} open={!scheduled} count={commentCount} launchAuthorUserId={author.userId} viewer={viewer} sort={sort === "new" ? "new" : "best"} path={path} now={now} />
          )}
        </main>

        <aside className="rail">
          <section className="card" id="author">
            <div className="person">
              <Portrait url={author.portraitUrl} color={color} label={author.name} />
              <div><Link href={`/author/${author.handle}`}><b>{author.name}</b></Link><small>{[named(author.genres.slice(0, 1), look.genres)[0]?.name, place].filter(Boolean).join(" · ")}</small></div>
            </div>
            <p>{[author.tagline, `${author.followerCount.toLocaleString("en-US")} ${author.followerCount === 1 ? "follower" : "followers"}.`].filter(Boolean).join(" ")}</p>
            <div className="go">
              <Link className="btn solid" href={`/author/${author.handle}`}>{author.kind === "publication" ? "Their page" : `${firstName}'s page`}</Link>
              {supportButton("Support")}
            </div>
          </section>

          <section>
            <h2>About this {NOUN[work.kind]}</h2>
            <dl className="facts">
              <div><dt className="sc">Kind</dt><dd>{work.form}</dd></div>
              {genres.length > 0 && <div><dt className="sc">Genre</dt><dd>{genres.map((g, i) => <span key={g.slug}>{i > 0 && ", "}<Link className="word" href={`/genre/${g.slug}`}>{g.name}</Link></span>)}</dd></div>}
              {readersOf.length > 0 && <div><dt className="sc">Readers of</dt><dd>{readersOf.map((r, i) => <span key={r.slug}>{i > 0 && ", "}<Link className="word" href={`/for-readers-of/${r.slug}`}>{r.name}</Link></span>)}</dd></div>}
              {out && <div><dt className="sc">Out</dt><dd>{out}</dd></div>}
              {platforms.length > 0 && <div><dt className="sc">Published</dt><dd>Through {platforms.map((p, i) => <span key={p.slug}>{i > 0 && ", "}<Link className="word" href={`/platform/${p.slug}`}>{inSentence(p.name)}</Link></span>)}</dd></div>}
              {written && <div><dt className="sc">Written</dt><dd>{written}</dd></div>}
              {buy.length > 0 && <div><dt className="sc">Buy</dt><dd>{buy.map((b, i) => <span key={b.url}>{i > 0 && ", "}<OutLink className="word" href={b.url} rel={relFor("buy", facts)} authorId={author.id}>{b.label}</OutLink></span>)}</dd></div>}
            </dl>
          </section>

          <section>
            <h2>Something wrong?</h2>
            <ul>
              <li>
                <ReportLink targetKind={launch ? "launch" : "work"} targetId={launch ? launch.id : work.id} signedIn={signedIn} label={launch ? "Report this launch" : `Report this ${NOUN[work.kind]}`} />
                <small>Spam, stolen work, a missing content note, or AI use that wasn&apos;t declared.</small>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
