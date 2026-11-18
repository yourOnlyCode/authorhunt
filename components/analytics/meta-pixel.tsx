"use client";

/**
 * components/analytics/meta-pixel.tsx
 *
 * Meta's pixel, so the waitlist ads on Facebook and Instagram can be measured
 * (the owner's call, November 2026). It is loaded on the two pages a sign-up
 * passes through, the splash and the confirm page, and nowhere else: not on
 * author pages, launch pages or anything a reader reads once the site opens.
 *
 * Three events: PageView when one of those pages loads, Lead when someone
 * joins the list (`metaEvent("Lead")` from the join), and CompleteRegistration
 * when they confirm their address. Nothing about the person goes with them:
 * no email, no name, no "advanced matching". Meta still sets its own cookie
 * and sees the visit, which the privacy page says.
 *
 * It does not load at all for a browser that asks not to be tracked (Global
 * Privacy Control, or Do Not Track), and then every event is a no-op. The
 * pixel's id is public by nature (it is in every page that loads it), so it
 * lives here, and META_PIXEL_ID in the environment can replace or, set to
 * "off", remove it.
 */

import Script from "next/script";
import { useSyncExternalStore } from "react";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1609685179509267";
const ON = PIXEL_ID !== "off" && /^\d+$/.test(PIXEL_ID);

type Fbq = (...args: unknown[]) => void;
declare global { interface Window { fbq?: Fbq } }

/** Whether this browser has asked not to be tracked. Read in the browser only. */
function declines(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}
const noop = () => () => {};

/** Send one of the pixel's standard events. Does nothing if the pixel isn't loaded. */
export function metaEvent(name: "Lead" | "CompleteRegistration"): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") window.fbq("track", name);
}

export function MetaPixel() {
  // Decided in the browser, after the first frame, so the server and the first render agree.
  const allowed = useSyncExternalStore(noop, () => ON && !declines(), () => false);
  if (!allowed) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${PIXEL_ID}');
      fbq('track', 'PageView');
    `}</Script>
  );
}
