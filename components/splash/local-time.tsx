"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The opening hour in the visitor's own time zone, shown beside the Eastern one. Drawn only in the browser, which knows the zone. */
export function LocalTime({ at }: { at: number }) {
  const text = useSyncExternalStore(subscribe, () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === "America/New_York") return "";
    return new Intl.DateTimeFormat(undefined, { weekday: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(at));
  }, () => "");
  return text ? <span className="local"> That&apos;s {text} where you are.</span> : null;
}
