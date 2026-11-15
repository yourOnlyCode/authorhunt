/**
 * app/(site)/authors/page.tsx
 *
 * The directory: every public page, by Momentum. Filters are query parameters
 * on this one server-rendered page (docs/development.md, section 5), so any
 * view of it can be linked to. The canonical address leaves out empty
 * parameters; a search by words is kept out of search engines.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { directoryHref, parseFilters, parsePage, type RawParams } from "@/lib/discover/params";
import { directory, facets, type DirectoryFilters } from "@/lib/queries/directory";
import { AuthorRow } from "@/components/discover/author-row";
import { Filters } from "@/components/discover/filters";
import { ListJsonLd } from "@/components/discover/json-ld";
import { Pager } from "@/components/discover/pager";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Every author on Author Hunt, ordered by Momentum. Narrow by genre, city, who they write for and who shaped them.";
const KINDS: { key: DirectoryFilters["kind"]; label: string }[] = [{ key: undefined, label: "Everyone" }, { key: "author", label: "Authors" }, { key: "publication", label: "Publications" }];

type Props = { searchParams: Promise<RawParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  // The page that will really be shown: a number past the end falls back to the last page, and so must its canonical.
  const { page } = await directory(filters, { viewerId: null, page: parsePage(raw), now: new Date() });
  const canonical = directoryHref(filters, page);
  const title = page > 1 ? `Authors, page ${page}` : "Authors";
  return {
    title, description: DESCRIPTION, alternates: { canonical },
    openGraph: { title, description: DESCRIPTION, url: canonical },
    robots: filters.q ? { index: false, follow: true } : undefined,
  };
}

export default async function AuthorsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const viewer = await getViewer();
  const [list, facet] = await Promise.all([
    directory(filters, { viewerId: viewer?.id ?? null, page: parsePage(raw), now: new Date() }),
    facets(),
  ]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="wrap">
      <ListJsonLd name="Authors on Author Hunt" description={DESCRIPTION} path={directoryHref(filters, list.page)} items={list.cards.map((c) => ({ name: c.name, path: `/author/${c.handle}` }))} />
      <header className="page-head">
        <h1>Authors</h1>
        <p>Everyone with a page here, ordered by Momentum: what they&apos;ve made lately and how readers have answered.</p>
      </header>
      <nav className="kinds" aria-label="Kind of page">
        {KINDS.map((k) => <Link key={k.label} href={directoryHref({ ...filters, kind: k.key })} aria-current={filters.kind === k.key ? "page" : undefined}>{k.label}</Link>)}
      </nav>
      <Filters filters={filters} facets={facet} />
      <section className="sec directory">
        <header><h2>{filtered ? "Matching authors" : "All authors"}</h2><span>{list.total} {list.total === 1 ? "author" : "authors"}</span></header>
        {list.cards.length === 0
          ? <p className="empty">No one matches all of that yet. Take a filter away, or <Link className="word" href="/authors">see all authors</Link>.</p>
          : <ol>{list.cards.map((card) => <AuthorRow key={card.id} card={card} signedIn={Boolean(viewer)} viewerId={viewer?.id} hideMature={!viewer?.adultConfirmedAt} />)}</ol>}
        <Pager page={list.page} pages={list.pages} href={(p) => directoryHref(filters, p)} />
      </section>
    </div>
  );
}
