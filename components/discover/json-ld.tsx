/**
 * components/discover/json-ld.tsx
 *
 * A listing page described for search engines: a CollectionPage whose main
 * entity is the ItemList of what the page shows, in the order it shows it.
 */

import { appUrl } from "@/lib/env";

type Item = { name: string; path: string };

export function ListJsonLd({ name, description, path, items }: { name: string; description: string; path: string; items: Item[] }) {
  const data = {
    "@context": "https://schema.org", "@type": "CollectionPage", name, description, url: `${appUrl}${path}`,
    isPartOf: { "@type": "WebSite", name: "Author Hunt", url: appUrl },
    mainEntity: {
      "@type": "ItemList", numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: `${appUrl}${item.path}` })),
    },
  };
  // "<" is escaped so a name can never close the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
