/**
 * components/board/launch-row.tsx
 *
 * One launch on a board: rank, picture, words, then the comment count and the
 * cheer at the right edge. Tags sit in fixed places (DESIGN.md): the genre in
 * small capitals and the place on one line, "For readers of" beneath it.
 */

import Link from "next/link";
import type { LaunchCard } from "@/lib/queries/board";
import { Cover, Portrait } from "../ui/picture";
import { SayIcon } from "../ui/icons";
import { CheerButton } from "./cheer-button";

type Props = { card: LaunchCard; rank: number | null; variant?: "first" | "row" | "small"; signedIn: boolean; hideMature: boolean };

export function LaunchRow({ card, rank, variant = "row", signedIn, hideMature }: Props) {
  const blurred = card.mature && hideMature;
  const picture = card.kind === "author"
    ? <Portrait className="pic" url={card.pictureUrl} color={card.color} label={card.authorName} blurred={blurred} />
    : <Cover className="pic" url={card.pictureUrl} color={card.color} label={card.title} blurred={blurred} />;
  const cheer = <CheerButton launchId={card.id} title={card.title} count={card.cheerCount} cheered={card.cheered} signedIn={signedIn} quiet={card.quiet} disabled={card.status === "scheduled"} />;

  if (variant === "small") {
    return (
      <li className="row small">
        <div className="rank">{rank ?? ""}</div>{picture}
        <div><h3><Link href={card.href}>{card.title}</Link></h3><p className="tag it">{[card.genre?.name, card.byline].filter(Boolean).join(", ")}</p></div>
        <div className="acts">{cheer}</div>
      </li>
    );
  }
  return (
    <li className={`row ${variant === "first" ? "first" : ""}`}>
      <div className="rank">{rank ?? ""}</div>{picture}
      <div>
        {variant === "first" && !card.quiet && <span className="sc"><span className="hl">Leading today</span></span>}
        <h3><Link href={card.href}>{card.title}</Link>{card.mature && <span className="flag">Mature</span>}</h3>
        <p className="tag">{card.tagline} <span className="it">{card.byline}</span></p>
        <div className="tags">
          {card.genre && <Link className="g" href={`/genre/${card.genre.slug}`}>{card.genre.name}</Link>}
          {card.city && card.citySlug && <Link className="p" href={`/city/${card.citySlug}`}>{card.city}</Link>}
          {card.reference && <Link className="r" href={`/${card.reference.kind === "readers_of" ? "for-readers-of" : "inspired-by"}/${card.reference.slug}`}>{card.reference.kind === "readers_of" ? "For readers of" : "Inspired by"} {card.reference.name}</Link>}
        </div>
      </div>
      <div className="acts">
        <Link className="count" href={`${card.href}#comments`} aria-label={`${card.commentCount} comments`}><SayIcon />{card.commentCount}</Link>
        {cheer}
      </div>
    </li>
  );
}
