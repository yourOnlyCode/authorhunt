"use client";

/**
 * components/analytics/ad-pixels.tsx
 *
 * The ad platforms' pixels, so the waitlist ads can be measured (the owner's
 * call, November 2026): Meta's (Facebook and Instagram) and OpenAI's. They
 * load on the two pages a sign-up passes through, the splash and the confirm
 * page, and nowhere else: not on author pages, launch pages or anything a
 * reader reads once the site opens.
 *
 * Three moments are counted, under each platform's own names:
 *
 *   the page is seen          Meta PageView              OpenAI page_viewed
 *   someone joins the list    Meta Lead                  OpenAI registration_completed
 *   someone confirms          Meta CompleteRegistration  (none for OpenAI)
 *
 * OpenAI's sign-up event is the call the owner was given for it, with its
 * `type`, and is sent when someone joins (November 2026).
 *
 * `adEvent("joined")` and `adEvent("confirmed")` send those to each pixel loaded.
 * Nothing about the person goes with them: no email, no name, no matching
 * data. The platforms still set or read their own identifiers and see the
 * visit, which the privacy page says.
 *
 * Neither loads at all for a browser that asks not to be tracked (Global
 * Privacy Control, or Do Not Track), and then every event is a no-op. The ids
 * are public by nature (they are in every page that loads them), so they live
 * here; NEXT_PUBLIC_META_PIXEL_ID and NEXT_PUBLIC_OPENAI_PIXEL_ID can replace
 * either, or remove it when set to "off".
 */

import Script from "next/script";
import { useSyncExternalStore } from "react";

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1609685179509267";
const META_ON = META_ID !== "off" && /^\d+$/.test(META_ID);
const OPENAI_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID ?? "G1paEUxiMrM9B5KQVfuSJR";
const OPENAI_ON = OPENAI_ID !== "off" && /^[A-Za-z0-9]+$/.test(OPENAI_ID);
/** OpenAI's pixel can log what it does to the browser's console. Only outside production, where it helps to see. */
const OPENAI_DEBUG = process.env.NODE_ENV !== "production";

type Queue = (...args: unknown[]) => void;
declare global { interface Window { fbq?: Queue; oaiq?: Queue } }

const META_EVENT = { joined: "Lead", confirmed: "CompleteRegistration" } as const;
/** OpenAI's events, with the parameters each takes. None is sent on confirming. */
const OPENAI_EVENT: Record<"joined" | "confirmed", [string, Record<string, string>] | null> = {
  joined: ["registration_completed", { type: "customer_action" }],
  confirmed: null,
};

/** Whether this browser has asked not to be tracked. Read in the browser only. */
function declines(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}
const noop = () => () => {};

/** Count a sign-up moment with every pixel that is loaded. Does nothing where none is. */
export function adEvent(moment: "joined" | "confirmed"): void {
  if (typeof window === "undefined") return;
  if (typeof window.fbq === "function") window.fbq("track", META_EVENT[moment]);
  const openai = OPENAI_EVENT[moment];
  if (openai && typeof window.oaiq === "function") window.oaiq("measure", ...openai);
}

export function AdPixels() {
  // Decided in the browser, after the first frame, so the server and the first render agree.
  const allowed = useSyncExternalStore(noop, () => !declines(), () => false);
  if (!allowed) return null;
  return (
    <>
      {META_ON && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_ID}');
          fbq('track', 'PageView');
        `}</Script>
      )}
      {OPENAI_ON && (
        <Script id="openai-pixel" strategy="afterInteractive">{`
          !function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
          oaiq("init", { pixelId: "${OPENAI_ID}", debug: ${OPENAI_DEBUG} });
          oaiq("measure", "page_viewed");
        `}</Script>
      )}
    </>
  );
}
