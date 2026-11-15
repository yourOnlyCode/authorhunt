"use client";

/**
 * components/board/cheer-button.tsx
 *
 * The cheer: an up arrow over the count, at the right of a row (DESIGN.md).
 * It answers at once and corrects itself if the server disagrees. Signed out,
 * pressing it asks for an account at the action, never at the door.
 */

import { useState } from "react";
import { UpIcon } from "../ui/icons";

type Props = { launchId: string; title: string; count: number; cheered: boolean; signedIn: boolean; quiet?: boolean; variant?: "row" | "big"; disabled?: boolean };

export function CheerButton({ launchId, title, count, cheered, signedIn, quiet, variant = "row", disabled }: Props) {
  const [state, setState] = useState({ count, cheered });
  const [pop, setPop] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function press() {
    if (!signedIn) { window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`; return; }
    const before = state;
    const next = { cheered: !before.cheered, count: before.count + (before.cheered ? -1 : 1) };
    setState(next); setPop(next.cheered); setError(null);
    try {
      const res = await fetch("/api/cheers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ launchId }) });
      const data = await res.json();
      if (!res.ok) { setState(before); setError(data.error ?? "That didn't go through."); return; }
      setState({ cheered: data.cheered, count: data.count });
    } catch { setState(before); setError("That didn't go through."); }
  }

  const label = quiet ? `Cheer for ${title}` : `Cheer for ${title}, ${state.count} cheers`;
  if (variant === "big") {
    return (
      <div>
        <button className={`bigcheer ${pop ? "pop" : ""}`} type="button" aria-pressed={state.cheered} aria-label={label} onClick={press} disabled={disabled}>
          <UpIcon />{!quiet && <b>{state.count}</b>}<span className="sc">{state.cheered ? "Cheered" : "Cheer"}</span>
        </button>
        {error && <p className="error-text" role="alert" style={{ marginTop: 8, fontSize: 17, maxWidth: 108 }}>{error}</p>}
      </div>
    );
  }
  return (
    <button className={`cheer ${pop ? "pop" : ""}`} type="button" aria-pressed={state.cheered} aria-label={label} title={error ?? undefined} onClick={press} disabled={disabled}>
      <UpIcon />{!quiet && <b>{state.count}</b>}
    </button>
  );
}
