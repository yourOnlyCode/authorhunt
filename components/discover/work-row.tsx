/**
 * components/discover/work-row.tsx
 *
 * A work where it is listed outside a board: a genre's or platform's recent
 * works, search results, a collection. The cover, the title, the tagline with
 * its byline, and the specific word for what it is ("A novel", "Issue 12"),
 * never "work" (docs/ontology.md).
 */

import type { ReactNode } from "react";
import Link from "next/link";
import type { WorkCard } from "@/lib/queries/directory";
import { formatDay } from "@/lib/ranking/day";
import { Cover } from "../ui/picture";

export function WorkRow({ card, hideMature, extra }: { card: WorkCard; hideMature: boolean; extra?: ReactNode }) {
  const when = card.launchStatus === "scheduled" && card.launchDay
    ? `Launching ${formatDay(card.launchDay, { month: "long", day: "numeric" })}`
    : `${card.cheerCount} ${card.cheerCount === 1 ? "cheer" : "cheers"}`;
  return (
    <li className="row author work">
      <Cover className="pic" url={card.coverUrl} color={card.color} label={card.title} blurred={card.mature && hideMature} />
      <div>
        <h3><Link href={`/work/${card.slug}`}>{card.title}</Link>{card.mature && <span className="flag">Mature</span>}</h3>
        <p className="tag">{card.tagline} <span className="it">by {card.authorName}</span></p>
        <div className="tags">
          {card.genre && <Link className="g" href={`/genre/${card.genre.slug}`}>{card.genre.name}</Link>}
          <span className="p">{card.form}</span>
        </div>
      </div>
      <div className="acts"><span className="when">{when}</span>{extra}</div>
    </li>
  );
}
