"use client";

/**
 * components/analytics/track.tsx
 *
 * Counts one view of the page it is mounted on, for the author's analytics.
 * It draws nothing. The ref keeps React's development double-mount from
 * counting twice.
 */

import { useEffect, useRef } from "react";
import { sendEvent, viaFromLocation } from "./beacon";

export function Track({ authorId }: { authorId?: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    sendEvent({ kind: "view", path: window.location.pathname, via: viaFromLocation(), authorId });
  }, [authorId]);
  return null;
}
