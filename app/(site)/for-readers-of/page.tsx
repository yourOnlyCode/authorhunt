/**
 * app/(site)/for-readers-of/page.tsx
 *
 * Every well-known writer an author here has named as a signpost, with how
 * many say "if you like them, try me". Only names with at least one author
 * are listed: a name with nobody behind it leads nowhere.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { facets } from "@/lib/queries/directory";
import { ListJsonLd } from "@/components/discover/json-ld";

export const dynamic = "force-dynamic";

const TITLE = "For readers of";
const DESCRIPTION = "Start from a writer you already love. Each name leads to the authors here who say: if you like them, try me.";

export async function generateMetadata(): Promise<Metadata> {
  return { title: TITLE, description: DESCRIPTION, alternates: { canonical: "/for-readers-of" }, openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-readers-of" } };
}

export default async function ForReadersOfIndex() {
  const facet = await facets();
  const all = [...facet.readersOf].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="wrap index-page">
      <ListJsonLd name={TITLE} description={DESCRIPTION} path="/for-readers-of" items={all.map((r) => ({ name: `For readers of ${r.name}`, path: `/for-readers-of/${r.slug}` }))} />
      <header className="page-head"><h1>For readers of</h1><p>{DESCRIPTION}</p></header>
      {all.length === 0
        ? <p className="empty">No one has named a writer yet. <Link className="word" href="/authors">See all authors</Link>.</p>
        : (
          <ul className="leaders">
            {all.map((r) => (
              <li key={r.slug}><Link href={`/for-readers-of/${r.slug}`}><span>{r.name}</span><i aria-hidden="true" /><b>{r.count} {r.count === 1 ? "author" : "authors"}</b></Link></li>
            ))}
          </ul>
        )}
      <p className="after"><Link className="word" href="/authors">All authors</Link></p>
    </div>
  );
}
