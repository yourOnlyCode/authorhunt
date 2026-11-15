"use client";

import { useEffect, useState } from "react";

const two = (n: number) => (n < 10 ? `0${n}` : String(n));

/** The live count to opening. The server draws the first frame from its own clock, and the browser takes over. */
export function Countdown({ opensAt, initialNow }: { opensAt: number; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    // The first frame uses the server's clock; the browser's takes over at the first tick.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.floor((opensAt - now) / 1000);
  if (left <= 0) return <p className="open">Author Hunt is open.</p>;
  const cells: [string, number, string?][] = [["Days", Math.floor(left / 86400)], ["Hours", Math.floor((left % 86400) / 3600)], ["Minutes", Math.floor((left % 3600) / 60)], ["Seconds", left % 60, "sec"]];
  return (
    <div className="clock" role="timer" aria-label="Time until Author Hunt opens">
      {cells.map(([label, value, cls]) => <div key={label} className={cls}><b suppressHydrationWarning>{two(value)}</b><span>{label}</span></div>)}
    </div>
  );
}
