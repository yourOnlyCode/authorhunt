/**
 * app/(site)/for-you/page.tsx
 *
 * A signed-in reader's feed (lib/discover/for-you.ts): what the authors they
 * follow have launched and said, then authors to try, each with its reason.
 *
 * A reader with no follows, cheers or saves is asked for up to three genres
 * and one or two writers they love. Nothing is stored: the answer is carried
 * in the address (?genres=a,b&like=slug) and the page shows the directory
 * narrowed by it, so the feed has something in it from the first visit and
 * fills in properly as they follow and cheer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { forYou } from "@/lib/discover/for-you";
import { slugList, type RawParams } from "@/lib/discover/params";
import { directory, facets } from "@/lib/queries/directory";
import { lookups } from "@/lib/queries/lookups";
import { formatDay, launchDay } from "@/lib/ranking/day";
import { LaunchRow } from "@/components/board/launch-row";
import { AuthorRow } from "@/components/discover/author-row";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "For you", description: "New launches and updates from authors you follow, and authors to try next.", alternates: { canonical: "/for-you" }, robots: { index: false, follow: false } };
}

export default async function ForYouPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const viewer = await requireViewer("/for-you");
  const raw = await searchParams;
  const now = new Date();
  const [feed, look, facet] = await Promise.all([forYou(viewer.id, now), lookups(), facets()]);
  const hideMature = !viewer.adultConfirmedAt;

  const genres = slugList(raw.genres, 3).filter((s) => look.genres.has(s));
  const like = slugList(raw.like, 2).filter((s) => look.references.has(s));
  const chosen = genres.length > 0 || like.length > 0;

  const choosing = Boolean(raw.choose);

  if (!feed.hasHistory || chosen || choosing) {
    const picks = chosen ? await directory({ anyGenres: genres, anyReferences: like }, { viewerId: viewer.id, limit: 24, now }) : null;
    const references = [...facet.readersOf, ...facet.inspiredBy.filter((r) => !facet.readersOf.some((x) => x.slug === r.slug))].sort((a, b) => a.name.localeCompare(b.name));
    return (
      <div className="wrap index-page">
        <header className="page-head">
          <h1>For you</h1>
          <p>{feed.hasHistory ? "Authors chosen by genre and by the writers you named." : "Tell us a little of what you read, and this page starts filling. It gets better as you follow authors and cheer for launches."}</p>
        </header>
        <form className="notice stack taste" action="/for-you" method="get">
          <fieldset>
            <legend className="label">Pick up to three genres</legend>
            <div className="choices">
              {[...look.genres].map(([slug, name]) => (
                <label key={slug} className="check"><input type="checkbox" name="genres" value={slug} defaultChecked={genres.includes(slug)} /> {name}</label>
              ))}
            </div>
          </fieldset>
          <div className="filter-grid">
            {[0, 1].map((i) => (
              <div className="field-row" key={i}>
                <label htmlFor={`like-${i}`}>{i === 0 ? "A writer you love" : "And another, if you like"}</label>
                <select className="select" id={`like-${i}`} name="like" defaultValue={like[i] ?? ""}>
                  <option value="">No one in particular</option>
                  {references.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div><button className="btn solid" type="submit">Show me authors</button></div>
        </form>
        {picks && (
          <section className="sec">
            <header><h2>Authors to try</h2><span>{picks.total} {picks.total === 1 ? "author" : "authors"}, by Momentum</span></header>
            {picks.cards.length === 0
              ? <p className="empty">No one matches those yet. Try another genre, or <Link className="word" href="/authors">see all authors</Link>.</p>
              : <ol>{picks.cards.map((card) => <AuthorRow key={card.id} card={card} signedIn viewerId={viewer.id} hideMature={hideMature} />)}</ol>}
            <p className="after">Follow the ones you like and this page will keep up with them. {feed.hasHistory && <Link className="word" href="/for-you">Back to your feed</Link>}</p>
          </section>
        )}
      </div>
    );
  }

  const today = launchDay(now);
  const quiet = feed.coming.length === 0 && feed.recent.length === 0 && feed.updates.length === 0;
  return (
    <div className="wrap split">
      <main>
        <section className="sec">
          <header><h1>For <span className="it">you</span></h1><span>{formatDay(today)}</span></header>
          {quiet && (
            <p className="empty">
              {feed.follows === 0
                ? <>You don&apos;t follow anyone yet. Follow an author and their launches and updates show up here.</>
                : <>Nothing new in the last month from the {feed.follows === 1 ? "author" : `${feed.follows} authors`} you follow.</>}
              {" "}<Link className="word" href="/">See today&apos;s launches</Link>.
            </p>
          )}
          {feed.recent.length > 0 && <ol>{feed.recent.map((card) => <LaunchRow key={card.id} card={card} rank={null} variant="row" signedIn hideMature={hideMature} />)}</ol>}
        </section>

        {feed.coming.length > 0 && (
          <section className="sec">
            <header><h2>Launching soon</h2><span>from authors you follow</span></header>
            <ol>{feed.coming.map((card) => <LaunchRow key={card.id} card={card} rank={null} variant="row" signedIn hideMature={hideMature} />)}</ol>
          </section>
        )}

        {feed.updates.length > 0 && (
          <section className="sec">
            <header><h2>Updates</h2><span>from authors you follow</span></header>
            <ul className="feed-updates">
              {feed.updates.map((u) => (
                <li key={u.id}>
                  <p className="who"><Link className="word" href={`/author/${u.authorHandle}`}>{u.authorName}</Link>{u.workTitle && u.workSlug && <> on <Link className="it" href={`/work/${u.workSlug}`}>{u.workTitle}</Link></>} <time dateTime={u.createdAt.toISOString()}>{formatDay(launchDay(u.createdAt), { month: "long", day: "numeric" })}</time></p>
                  <p>{u.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {feed.suggestions.length > 0 && (
          <section className="sec">
            <header><h2>Authors to try</h2><span>from what you follow, cheer and save</span></header>
            <ol>{feed.suggestions.map((card) => <AuthorRow key={card.id} card={card} signedIn viewerId={viewer.id} hideMature={hideMature} note={card.why} />)}</ol>
          </section>
        )}
      </main>
      <aside className="rail">
        <section>
          <h2>Yours</h2>
          <ul>
            <li className="topic"><Link href="/collections">Collections</Link></li>
            <li className="topic"><Link href="/notifications">Notifications</Link></li>
            <li className="topic"><Link href="/for-you?choose=1">Choose by genre</Link><small>Pick genres and writers you love.</small></li>
          </ul>
        </section>
        <section>
          <h2>Browse</h2>
          <div className="genres">{facet.genres.slice(0, 10).map((g) => <Link key={g.slug} href={`/genre/${g.slug}`}>{g.name}</Link>)}</div>
          <Link className="more word" href="/authors">All authors</Link>
        </section>
      </aside>
    </div>
  );
}
