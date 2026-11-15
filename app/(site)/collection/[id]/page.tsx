/**
 * app/(site)/collection/[id]/page.tsx
 *
 * One collection. Its owner always sees it and gets the controls; anyone else
 * sees it only once it's shared, and a private one answers exactly like one
 * that doesn't exist. A private collection is never offered to search engines.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { collectionView, SAVED_SLUG } from "@/lib/discover/collections";
import { AuthorRow } from "@/components/discover/author-row";
import { CollectionOwnerControls, RemoveItemButton } from "@/components/discover/collection-controls";
import { ListJsonLd } from "@/components/discover/json-ld";
import { WorkRow } from "@/components/discover/work-row";
import { ReportLink } from "@/components/trust/report-link";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const viewer = await getViewer();
  const view = await collectionView(id, viewer?.id ?? null);
  if (!view) notFound();
  const isOwner = viewer?.id === view.collection.userId;
  // A shared collection goes with its owner's standing: a suspended or banned account's lists aren't shown.
  if (!isOwner && (!view.collection.isPublic || view.ownerStanding !== "good")) notFound();
  return { viewer, view, isOwner };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { view } = await load(id);
  const { collection, ownerName } = view;
  const count = view.authors.length + view.works.length;
  const description = `${collection.name}: a collection of ${count} ${count === 1 ? "author or book" : "authors and books"} kept by ${ownerName} on Author Hunt.`;
  return {
    title: `${collection.name}, a collection by ${ownerName}`, description,
    alternates: { canonical: `/collection/${collection.id}` },
    openGraph: { title: collection.name, description, url: `/collection/${collection.id}` },
    robots: collection.isPublic && count > 0 ? undefined : { index: false, follow: false },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const { viewer, view, isOwner } = await load(id);
  const { collection, ownerName } = view;
  const signedIn = Boolean(viewer);
  const hideMature = !viewer?.adultConfirmedAt;
  const empty = view.authors.length === 0 && view.works.length === 0;

  return (
    <div className="wrap index-page">
      {collection.isPublic && (
        <ListJsonLd name={collection.name} description={`A collection kept by ${ownerName}.`} path={`/collection/${collection.id}`}
          items={[...view.authors.map((a) => ({ name: a.name, path: `/author/${a.handle}` })), ...view.works.map((w) => ({ name: w.title, path: `/work/${w.slug}` }))]} />
      )}
      <header className="page-head">
        <span className="sc">Collection</span>
        <h1>{collection.name}</h1>
        <p>{isOwner ? "Yours." : <>Kept by {ownerName}.</>} {collection.isPublic ? "Shared with anyone who has the link." : "Private."}</p>
      </header>

      {isOwner && <CollectionOwnerControls id={collection.id} name={collection.name} isPublic={collection.isPublic} fixed={collection.slug === SAVED_SLUG} />}

      {empty && (
        <p className="empty">
          {isOwner ? <>Nothing here yet. Press Save on an author&apos;s page or a book. <Link className="word" href="/authors">Find an author</Link>.</> : "Nothing in this collection yet."}
        </p>
      )}
      {view.authors.length > 0 && (
        <section className="sec">
          <header><h2>Authors</h2><span>{view.authors.length}</span></header>
          <ol>{view.authors.map((card) => (
            <AuthorRow key={card.itemId} card={card} signedIn={signedIn} viewerId={viewer?.id} hideMature={hideMature}
              extra={isOwner ? <RemoveItemButton collectionId={collection.id} itemId={card.itemId} label={card.name} /> : undefined} />
          ))}</ol>
        </section>
      )}
      {view.works.length > 0 && (
        <section className="sec">
          <header><h2>Books and other work</h2><span>{view.works.length}</span></header>
          <ol>{view.works.map((card) => (
            <WorkRow key={card.itemId} card={card} hideMature={hideMature}
              extra={isOwner ? <RemoveItemButton collectionId={collection.id} itemId={card.itemId} label={card.title} /> : undefined} />
          ))}</ol>
        </section>
      )}

      <p className="after">
        <Link className="word" href="/collections">{isOwner ? "All your collections" : "More collections"}</Link>
        {!isOwner && <ReportLink targetKind="collection" targetId={collection.id} signedIn={signedIn} />}
      </p>
    </div>
  );
}
