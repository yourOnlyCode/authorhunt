/**
 * components/analytics/beacon.ts
 *
 * One page view or one outbound click, sent to /api/events as the page is
 * left alone or left behind. sendBeacon survives the navigation a click
 * starts, which a fetch may not. No cookie and no identifier is sent: the
 * event is a path, a target and where the reader came from.
 */

export type SiteEvent = { kind: "view" | "click"; path: string; target?: string; via?: string; authorId?: string };

export function sendEvent(event: SiteEvent): void {
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  } catch { /* Counting a view must never break the page. */ }
}

/** The ?via= a shared link carries (docs/development.md, Sharing a page on video). */
export function viaFromLocation(): string | undefined {
  const via = new URLSearchParams(window.location.search).get("via");
  return via && /^[a-z0-9_-]{1,40}$/i.test(via) ? via.toLowerCase() : undefined;
}
