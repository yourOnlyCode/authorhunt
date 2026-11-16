"use client";

/**
 * components/splash/countdown.tsx
 *
 * The live count to opening. It counts to one fixed moment, and it takes the
 * time from the server, not the visitor's device: the first frame is the
 * server's own clock, and the browser then asks once more and allows for the
 * time the answer took, so a phone whose clock is wrong still shows the right
 * count. At zero the page loads the open site.
 *
 * A screen reader hears the count as one sentence that changes each minute,
 * not four numbers ticking every second.
 */

import { useEffect, useRef, useState } from "react";

const two = (n: number) => (n < 10 ? `0${n}` : String(n));
const RELOADED = "ah_opened_reload";

export function Countdown({ opensAt, initialNow }: { opensAt: number; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  // How far the device's clock is from the server's, in milliseconds.
  const offset = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const started = Date.now();
    // Until the server answers, assume the page arrived about now.
    offset.current = initialNow - started;
    fetch("/api/time", { cache: "no-store" }).then((r) => r.json()).then((data: { now: number }) => {
      if (!alive || typeof data.now !== "number") return;
      const landed = Date.now();
      offset.current = data.now + (landed - started) / 2 - landed;
    }).catch(() => { /* keep the first estimate */ });
    const timer = setInterval(() => setNow(Date.now() + (offset.current ?? 0)), 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [initialNow]);

  const left = Math.floor((opensAt - now) / 1000);

  useEffect(() => {
    if (left > 0) return;
    // Load the open site, once. The marker stops a loop if the server's gate hasn't lifted yet.
    try {
      const last = Number(window.sessionStorage.getItem(RELOADED) ?? 0);
      if (Date.now() - last < 60_000) return;
      window.sessionStorage.setItem(RELOADED, String(Date.now()));
    } catch { /* storage unavailable: reload anyway */ }
    const t = setTimeout(() => window.location.replace("/"), 1500);
    return () => clearTimeout(t);
  }, [left]);

  if (left <= 0) return <p className="open">Author Hunt is open.</p>;
  const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60);
  const cells: [string, number, string?][] = [["Days", d], ["Hours", h], ["Minutes", m], ["Seconds", left % 60, "sec"]];
  return (
    <div className="clock" role="timer" aria-label={`${d} days, ${h} hours and ${m} minutes until Author Hunt opens`} suppressHydrationWarning>
      {cells.map(([label, value, cls]) => <div key={label} className={cls} aria-hidden="true"><b suppressHydrationWarning>{two(value)}</b><span>{label}</span></div>)}
    </div>
  );
}
