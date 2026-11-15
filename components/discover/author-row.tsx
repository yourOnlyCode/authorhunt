/**
 * components/discover/author-row.tsx
 *
 * One page in the directory, drawn like a launch on the board so the two read
 * as one site: portrait, name in the display face, tagline, and the same two
 * lines of tags in the same places (DESIGN.md). Where a launch has its cheer,
 * an author has their Momentum and Follow. A page can't be cheered, only a
 * launch can, so there is no cheer here.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import type { AuthorCard } from "@/lib/queries/directory";
import { FollowButton } from "../social/follow-button";
import { Portrait } from "../ui/picture";

type Props = { card: AuthorCard; signedIn: boolean; viewerId?: string | null; hideMature: boolean; note?: string; extra?: ReactNode };

export function AuthorRow({ card, signedIn, viewerId, hideMature, note, extra }: Props) {
  return (
    <li className="row author">
      <Portrait className="pic" url={card.portraitUrl} color={card.color} label={card.name} blurred={card.mature && hideMature} />
      <div>
        <h3><Link href={`/author/${card.handle}`}>{card.name}</Link>{card.mature && <span className="flag">Mature</span>}</h3>
        <p className="tag">{card.tagline}{card.kind === "publication" && <> <span className="it">A publication</span></>}</p>
        <div className="tags">
          {card.genre && <Link className="g" href={`/genre/${card.genre.slug}`}>{card.genre.name}</Link>}
          {card.city && card.citySlug && <Link className="p" href={`/city/${card.citySlug}`}>{card.city}</Link>}
          {card.reference && <Link className="r" href={`/${card.reference.kind === "readers_of" ? "for-readers-of" : "inspired-by"}/${card.reference.slug}`}>{card.reference.kind === "readers_of" ? "For readers of" : "Inspired by"} {card.reference.name}</Link>}
          {note && <span className="r">{note}</span>}
        </div>
      </div>
      <div className="acts">
        <span className="up" title="Momentum" aria-label={`Momentum ${card.momentum}`}>↑ {card.momentum}</span>
        <FollowButton authorId={card.id} following={card.following} signedIn={signedIn} variant="word" isSelf={Boolean(viewerId) && viewerId === card.userId} />
        {extra}
      </div>
    </li>
  );
}
