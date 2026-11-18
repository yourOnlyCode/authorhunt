"use client";

/**
 * components/splash/share.tsx
 *
 * What someone sees once they've joined: an invitation to pass the page on.
 * The link carries `?src=friend`, so the owner's list (/owner) shows how many
 * people came by word of mouth.
 *
 * Two ways, both of the visitor's own: the phone's share sheet where there
 * is one, and a link to copy everywhere. No buttons for particular networks,
 * which would load nothing but would still say which services we favour,
 * and nothing is sent on the visitor's behalf.
 */

import { useState, useSyncExternalStore } from "react";

const LINK = "https://www.authorhunt.com/?src=friend";
const TEXT = "Author Hunt is a daily launch board for writers, opening January 8. Free to launch.";
const noop = () => () => {};

export function ShareAsk({ side }: { side: "reader" | "author" }) {
  const [said, setSaid] = useState<string | null>(null);
  // Whether this browser has a share sheet. False on the server and on the first frame, so the two agree.
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  async function copy() {
    try { await navigator.clipboard.writeText(LINK); setSaid("Link copied."); }
    catch { setSaid("Select the link above to copy it."); }
  }
  async function share() {
    try { await navigator.share({ title: "Author Hunt", text: TEXT, url: LINK }); }
    catch { /* they closed the sheet: nothing to say */ }
  }

  return (
    <div className="pass-on">
      <p className="pass-ask">{side === "author" ? "Know another writer? Bring them to the first launch." : "Know a writer, or someone who reads? Send them the link."}</p>
      <p className="pass-link"><span>authorhunt.com/?src=friend</span></p>
      <p className="pass-do">
        {canShare && <button type="button" onClick={share}>Share</button>}
        <button type="button" onClick={copy}>Copy the link</button>
      </p>
      <p className="pass-said" role="status">{said ?? ""}</p>
    </div>
  );
}
