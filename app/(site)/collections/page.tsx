/**
 * app/(site)/collections/page.tsx
 *
 * Signed in, a reader's own collections and a way to make another. Signed
 * out, what a collection is and the ones readers have chosen to share: the
 * page is public, and an account is asked for only when someone goes to save
 * (AGENTS.md rule 1).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, signInHref } from "@/lib/auth";
import { collectionsOf, sharedCollections, type CollectionSummary } from "@/lib/discover/collections";
import { NewCollectionForm } from "@/components/discover/collection-controls";
import { ListJsonLd } from "@/components/discover/json-ld";

export const dynamic = "force-dynamic";

const TITLE = "Collections";
const DESCRIPTION = "A collection is a list a reader keeps, of authors and books. Save what you want to come back to, and share a list when it's worth passing on.";

export async function generateMetadata(): Promise<Metadata> {
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/collections" }, openGraph: { title: TITLE, description: DESCRIPTION, url: "/collections" } };
}

const size = (n: number) => `${n} ${n === 1 ? "thing" : "things"} saved`;

function Shared({ list }: { list: CollectionSummary[] }) {
  return (
    <ul className="leaders">
      {list.map((c) => (
        <li key={c.id}><Link href={`/collection/${c.id}`}><span>{c.name} <em className="by">kept by {c.ownerName}</em></span><i aria-hidden="true" /><b>{size(c.itemCount)}</b></Link></li>
      ))}
    </ul>
  );
}

export default async function CollectionsPage() {
  const viewer = await getViewer();
  const [mine, shared] = await Promise.all([viewer ? collectionsOf(viewer.id) : Promise.resolve([]), sharedCollections(12)]);
  const others = viewer ? shared.filter((c) => !mine.some((m) => m.id === c.id)) : shared;

  return (
    <div className="wrap index-page">
      <ListJsonLd name="Shared collections" description={DESCRIPTION} path="/collections" items={shared.map((c) => ({ name: c.name, path: `/collection/${c.id}` }))} />
      <header className="page-head">
        <h1>{viewer ? "Your collections" : "Collections"}</h1>
        <p>{DESCRIPTION}</p>
      </header>

      {viewer ? (
        <section className="sec">
          <header><h2>Yours</h2><span>{mine.length} {mine.length === 1 ? "collection" : "collections"}</span></header>
          {mine.length === 0
            ? <p className="empty">Nothing saved yet. Press Save on an author&apos;s page or a book and it lands in a collection called Saved.</p>
            : (
              <ul className="leaders">
                {mine.map((c) => (
                  <li key={c.id}><Link href={`/collection/${c.id}`}><span>{c.name} <em className="by">{c.isPublic ? "shared" : "private"}</em></span><i aria-hidden="true" /><b>{size(c.itemCount)}</b></Link></li>
                ))}
              </ul>
            )}
          <NewCollectionForm />
        </section>
      ) : (
        <section className="sec prose">
          <p>Press Save on any author&apos;s page or book and it goes into a collection called Saved. Make more with names of your own, such as &ldquo;Fantasy to read&rdquo; or &ldquo;Local authors&rdquo;.</p>
          <p>A collection is private until you share it. Saving isn&apos;t a cheer: it&apos;s your own list, and it changes no one&apos;s rank.</p>
          <p><Link className="btn solid" href={signInHref("/collections")}>Sign in to start one</Link></p>
        </section>
      )}

      {others.length > 0 && (
        <section className="sec">
          <header><h2>Recently shared</h2><span>by readers</span></header>
          <Shared list={others} />
        </section>
      )}
    </div>
  );
}
