"use client";

/**
 * components/author/share-button.tsx
 *
 * Share opens the phone's share sheet where there is one, and copies the link
 * where there isn't. The link carries ?via= so the author's analytics can say
 * where readers came from (docs/development.md, Sharing a page on video).
 * What happened is said beside the word, not in a toast.
 */

import { useState } from "react";

type Props = { title: string; text?: string; /** A path to share instead of the page being read, such as the short link. */ path?: string };

export function ShareButton({ title, text, path }: Props) {
  const [said, setSaid] = useState<string | null>(null);

  async function press() {
    const base = `${window.location.origin}${path ?? window.location.pathname}`;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title, text, url: `${base}?via=share` }); return; }
      catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(`${base}?via=link`); setSaid("Link copied."); }
    catch { setSaid(base); }
  }

  return (
    <span className="share">
      <button type="button" className="word" onClick={press}>Share</button>
      {said && <span role="status" className="it">{said}</span>}
    </span>
  );
}
