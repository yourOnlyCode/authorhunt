/**
 * components/discover/filters.tsx
 *
 * The directory's filter bar. It is a plain GET form, so it works with no
 * script and every set of filters is a link someone can share. Each select
 * lists only values that have authors, with how many.
 *
 * The filters in force are shown beneath as removable tokens. DESIGN.md
 * refuses chips everywhere else; this is the one allowed exception, because a
 * reader needs to see what is narrowing the list and take one thing away.
 */

import Link from "next/link";
import { directoryHref } from "@/lib/discover/params";
import { AI_LABELS, type Counted, type DirectoryFilters, type Facets } from "@/lib/queries/directory";

type Props = { filters: DirectoryFilters; facets: Facets };

function Pick({ id, name, label, any, options, value }: { id: string; name: string; label: string; any: string; options: Counted[]; value: string | undefined }) {
  // A value set from a link may have no authors yet; keep it selectable so the form doesn't drop it.
  const known = !value || options.some((o) => o.slug === value);
  return (
    <div className="field-row">
      <label htmlFor={id}>{label}</label>
      <select className="select" id={id} name={name} defaultValue={value ?? ""}>
        <option value="">{any}</option>
        {!known && value && <option value={value}>{value}</option>}
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name} ({o.count})</option>)}
      </select>
    </div>
  );
}

export function Filters({ filters, facets }: Props) {
  const nameIn = (list: Counted[], slug: string) => list.find((x) => x.slug === slug)?.name ?? slug;
  const applied: { key: string; label: string; href: string }[] = [];
  const add = (key: keyof DirectoryFilters, label: string) => applied.push({ key, label, href: directoryHref({ ...filters, [key]: undefined }) });
  if (filters.kind) add("kind", filters.kind === "publication" ? "Publications" : "Authors");
  if (filters.genre) add("genre", nameIn(facets.genres, filters.genre));
  if (filters.city) add("city", nameIn(facets.cities, filters.city));
  if (filters.readersOf) add("readersOf", `For readers of ${nameIn(facets.readersOf, filters.readersOf)}`);
  if (filters.inspiredBy) add("inspiredBy", `Inspired by ${nameIn(facets.inspiredBy, filters.inspiredBy)}`);
  if (filters.platform) add("platform", `Published through ${nameIn(facets.platforms, filters.platform)}`);
  if (filters.ai) add("ai", `Written ${AI_LABELS[filters.ai].charAt(0).toLowerCase()}${AI_LABELS[filters.ai].slice(1)}`);
  if (filters.launchedThisMonth) add("launchedThisMonth", "Launched this month");
  if (filters.q) add("q", `“${filters.q}”`);

  return (
    <div className="filters">
      <form action="/authors" method="get" aria-label="Filter authors">
        {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        <div className="filter-grid">
          <Pick id="f-genre" name="genre" label="Genre" any="Any genre" options={facets.genres} value={filters.genre} />
          <Pick id="f-city" name="city" label="City" any="Anywhere" options={facets.cities} value={filters.city} />
          <Pick id="f-readers" name="readers" label="For readers of" any="Anyone" options={facets.readersOf} value={filters.readersOf} />
          <Pick id="f-inspired" name="inspired" label="Inspired by" any="Anyone" options={facets.inspiredBy} value={filters.inspiredBy} />
          <Pick id="f-platform" name="platform" label="Published through" any="Anywhere" options={facets.platforms} value={filters.platform} />
          <Pick id="f-written" name="written" label="How it's written" any="Any way" options={facets.ai} value={filters.ai} />
        </div>
        <div className="filter-foot">
          <label className="check"><input type="checkbox" name="month" value="1" defaultChecked={Boolean(filters.launchedThisMonth)} /> Launched this month</label>
          <button className="btn" type="submit">Show authors</button>
        </div>
      </form>
      {applied.length > 0 && (
        <ul className="applied" aria-label="Filters in use">
          {applied.map((a) => (
            <li key={a.key}><Link href={a.href} aria-label={`Remove filter: ${a.label}`}>{a.label}<span aria-hidden="true">×</span></Link></li>
          ))}
          {applied.length > 1 && <li className="clear"><Link className="word" href="/authors">Clear all</Link></li>}
        </ul>
      )}
    </div>
  );
}
