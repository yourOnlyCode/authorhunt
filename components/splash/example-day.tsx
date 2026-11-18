"use client";

/**
 * components/splash/example-day.tsx
 *
 * One day on the board, played as an example: four sample pieces go up in
 * the morning, cheers arrive through the day, a piece of flash fiction
 * climbs from fourth to first, and at midnight the day closes with it
 * marked First of the day. It shows what a launch is instead of describing it.
 *
 * Rules it keeps (DESIGN.md, "Motion"): it plays once, when it comes into
 * view, and never loops. It runs about ten seconds, so it has Play and Pause
 * above it and three stages that can be pressed. The server renders the
 * finished day, so it is complete with no JavaScript and under reduced
 * motion, where it never plays by itself. It stops when the tab is hidden.
 *
 * The titles are samples and say so. Nothing here reads or writes real data.
 *
 * How it works: one clock, `t` in milliseconds, and a `render` that draws
 * the whole board for any `t`. Playing advances the clock; Pause stops it;
 * a stage sets it. React renders the markup once and never again (there is
 * no state), so the rows can be reordered by hand: a row that changes place
 * is moved in the DOM and animated from where it was (FLIP).
 */

import { useEffect, useRef } from "react";

type Work = { id: string; title: string; by: string; who: string; color: string; counts: [number, number][] };
const WORKS: Work[] = [
  { id: "salt", title: "The Salt Road", by: "A novel", who: "Maren Okafor", color: "#1F3A5C", counts: [[0, 0], [1500, 41], [3000, 46], [4500, 50], [5600, 52]] },
  { id: "rooms", title: "Eleven Rooms", by: "A serial", who: "Ines Halloran", color: "#24503B", counts: [[0, 0], [1500, 30], [3000, 34], [4500, 37], [5600, 38]] },
  { id: "tide", title: "What the Tide Keeps", by: "A poem", who: "Jun Abara", color: "#7A2533", counts: [[0, 0], [1500, 24], [3000, 33], [4500, 41], [5600, 44]] },
  { id: "small", title: "Small Hours", by: "Flash fiction", who: "Dele Whitcombe", color: "#B5791A", counts: [[0, 0], [1500, 12], [2600, 31], [3800, 43], [4800, 55], [5600, 61]] },
];
const MORNING = 2600, DAY = 5600, NIGHT = 2400, TOTAL = MORNING + DAY + NIGHT;
const STARTS = [0, MORNING, MORNING + DAY], LENGTHS = [MORNING, DAY, NIGHT];
const HOURS = ["9:00 a.m.", "10:00 a.m.", "11:00 a.m.", "Noon", "1:00 p.m.", "2:00 p.m.", "3:00 p.m.", "4:00 p.m.", "5:00 p.m.", "6:00 p.m.", "7:00 p.m.", "8:00 p.m.", "9:00 p.m.", "10:00 p.m.", "11:00 p.m."];
const STAGES: { name: string; author: string; reader: string }[] = [
  { name: "Morning", author: "New work goes up.", reader: "New work goes up." },
  { name: "All day", author: "Readers cheer for what they love.", reader: "You cheer for what you love." },
  { name: "Midnight", author: "The day closes. The ranking stands.", reader: "The day closes. Its best stands." },
];

function countAt(k: [number, number][], t: number): number {
  for (let i = 1; i < k.length; i++) {
    const [t0, a] = k[i - 1]!, [t1, b] = k[i]!;
    if (t <= t1) return Math.round(a + (b - a) * ((t - t0) / (t1 - t0)));
  }
  return k[k.length - 1]![1];
}
const FINAL = [...WORKS].sort((a, b) => countAt(b.counts, DAY) - countAt(a.counts, DAY));

const Arrow = () => <svg viewBox="0 0 14 10" aria-hidden="true"><path d="M7 0l7 10H0z" /></svg>;

export function ExampleDay() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
    const board = q<HTMLElement>(".board"), rowsEl = q<HTMLElement>(".rows"), when = q<HTMLElement>(".when");
    const again = q<HTMLButtonElement>(".play"), againText = q<HTMLElement>(".play span"), pause = q<HTMLButtonElement>(".pause");
    const stages = [...el.querySelectorAll<HTMLElement>(".stages li")];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = WORKS.map((d, i) => ({ d, i, el: rowsEl.querySelector<HTMLElement>(`[data-id="${d.id}"]`)!, n: -1, shown: null as boolean | null }));

    let t = TOTAL, playing = false, last = 0, order = "", timers: ReturnType<typeof setTimeout>[] = [];

    function confetti(host: HTMLElement) {
      if (still) return;
      const box = document.createElement("div"); box.className = "confetti";
      const colors = ["var(--red)", "var(--blue)", "var(--mark)", "var(--ink)"];
      for (let i = 0; i < 40; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25, reach = 110 + Math.random() * 220, piece = document.createElement("i");
        piece.style.cssText = `--dx:${Math.round(Math.cos(a) * reach)}px;--dy:${Math.round(Math.sin(a) * reach)}px;--rot:${Math.round((Math.random() - 0.5) * 900)}deg;background:${colors[i % 4]};width:${i % 3 ? 9 : 6}px;height:${i % 3 ? 9 : 13}px;animation-delay:${Math.round(Math.random() * 140)}ms`;
        box.append(piece);
      }
      host.append(box);
      timers.push(setTimeout(() => { if (box.parentNode) box.parentNode.removeChild(box); }, 2200));
    }

    function render(animate: boolean) {
      const phase = t < MORNING ? 0 : t < MORNING + DAY ? 1 : 2, dayT = Math.min(Math.max(t - MORNING, 0), DAY);
      stages.forEach((li, k) => {
        li.classList.toggle("on", k === phase); li.classList.toggle("past", k < phase);
        li.style.setProperty("--p", String(Math.min(Math.max((t - STARTS[k]!) / LENGTHS[k]!, 0), 1)));
      });
      when.textContent = phase === 0 ? "8:00 a.m." : phase === 2 ? "Midnight" : HOURS[Math.min(HOURS.length - 1, Math.floor((dayT / DAY) * HOURS.length))]!;
      const closed = t >= MORNING + DAY + 500;
      if (animate && closed && !board.classList.contains("closed")) timers.push(setTimeout(() => { const lead = rowsEl.firstElementChild; if (lead) confetti(lead as HTMLElement); }, 60));
      board.classList.toggle("closed", closed);

      const counts: Record<string, number> = {};
      for (const r of rows) {
        // Morning: the work goes up, one piece at a time.
        const shown = t >= 250 + r.i * 520;
        r.el.classList.toggle("wait", !shown);
        if (shown && r.shown === false && animate) r.el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "ease-out" });
        r.shown = shown;
        // Cheers land in beats, each row on its own beat, so a number can be read before it changes again.
        const beat = dayT >= DAY ? DAY : Math.max(0, Math.floor((dayT - r.i * 110) / 440) * 440 + r.i * 110);
        const n = counts[r.d.id] = countAt(r.d.counts, beat);
        if (n !== r.n) {
          const cheer = r.el.querySelector<HTMLElement>(".cheer")!;
          cheer.querySelector("b")!.textContent = String(n);
          if (animate && n > r.n && r.n >= 0) { cheer.classList.remove("pop"); void cheer.offsetWidth; cheer.classList.add("pop"); }
          r.n = n;
        }
      }
      // In the morning the order is the order things went up; after that, cheers decide it.
      const sorted = [...rows].sort((a, b) => (phase === 0 ? a.i - b.i : counts[b.d.id]! - counts[a.d.id]! || a.i - b.i));
      const key = sorted.map((r) => r.d.id).join();
      if (key !== order) {
        const first = new Map(sorted.map((r) => [r, r.el.getBoundingClientRect().top]));
        sorted.forEach((r, i) => { rowsEl.append(r.el); r.el.querySelector(".rank")!.textContent = String(i + 1); });
        if (animate && order) for (const r of sorted) {
          const d = first.get(r)! - r.el.getBoundingClientRect().top;
          if (!d) continue;
          r.el.style.zIndex = d > 0 ? "2" : "1";
          if (d > 0) { r.el.classList.add("moved"); timers.push(setTimeout(() => r.el.classList.remove("moved"), 700)); }
          r.el.animate([{ transform: `translateY(${d}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.22,.8,.24,1)" }).onfinish = () => { r.el.style.zIndex = ""; };
        }
        order = key;
      }
      sorted.forEach((r, i) => r.el.classList.toggle("lead", i === 0 && phase > 0));
    }

    function controls() {
      pause.hidden = t >= TOTAL || still;
      pause.textContent = playing ? "Pause" : "Resume";
      againText.textContent = t >= TOTAL ? "Play again" : "Start over";
    }
    function frame(now: number) {
      if (!playing) return;
      t = Math.min(TOTAL, t + (now - last)); last = now; render(true);
      if (t >= TOTAL) { playing = false; controls(); } else requestAnimationFrame(frame);
    }
    function playFrom(ms: number) {
      t = ms; order = ""; for (const r of rows) { r.n = -1; r.shown = false; }
      render(false);
      // Under reduced motion a stage shows where that stage ends, and nothing plays.
      if (still) { const k = STARTS.indexOf(ms); t = ms === 0 ? TOTAL : Math.min(TOTAL, ms + LENGTHS[k]! - 1); render(false); controls(); return; }
      playing = true; last = performance.now(); controls(); requestAnimationFrame(frame);
    }
    const onAgain = () => playFrom(0);
    const onPause = () => { playing = !playing; if (playing) { last = performance.now(); requestAnimationFrame(frame); } controls(); };
    const onStage = stages.map((_, k) => () => playFrom(STARTS[k]!));
    const onHide = () => { if (document.hidden && playing) { playing = false; controls(); } };

    again.addEventListener("click", onAgain);
    pause.addEventListener("click", onPause);
    stages.forEach((li, k) => li.querySelector("button")!.addEventListener("click", onStage[k]!));
    document.addEventListener("visibilitychange", onHide);
    for (const r of rows) r.n = countAt(r.d.counts, DAY); // what the server drew
    controls();

    // It plays once, the first time most of it is in view.
    let seen: IntersectionObserver | null = null;
    if (!still) {
      seen = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { seen?.disconnect(); playFrom(0); } }, { threshold: 0.6 });
      seen.observe(board);
    }
    return () => {
      playing = false; seen?.disconnect(); timers.forEach(clearTimeout); timers = [];
      again.removeEventListener("click", onAgain); pause.removeEventListener("click", onPause);
      stages.forEach((li, k) => li.querySelector("button")?.removeEventListener("click", onStage[k]!));
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return (
    <div className="example" ref={root}>
      <p className="player">
        <span className="ctl">
          <button type="button" className="play"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0l10 6-10 6z" /></svg><span>Play again</span></button>
          <button type="button" className="pause" hidden>Pause</button>
        </span>
        <span className="note">Example launch. The titles are samples.</span>
      </p>
      <ol className="stages">
        {STAGES.map((s, k) => (
          <li key={s.name} className={k === 2 ? "on" : "past"} style={{ "--p": 1 } as React.CSSProperties}>
            <button type="button"><i /><b>{s.name}</b><span className="for-author">{s.author}</span><span className="for-reader">{s.reader}</span></button>
          </li>
        ))}
      </ol>
      <div className="board closed" aria-hidden="true">
        <header><span className="sc">Today&apos;s launches</span><span className="when">Midnight</span></header>
        <div className="rows">
          {FINAL.map((d, i) => (
            <div className={`row ${i === 0 ? "lead" : ""}`} data-id={d.id} key={d.id}>
              <span className="rank">{i + 1}</span>
              <span className="cover" style={{ background: d.color }}>{d.title[0]}</span>
              <span><span className="t">{d.title}</span><br /><span className="by">{d.by} <span className="who">&middot; {d.who}</span><mark className="first-of">First of the day</mark></span></span>
              <span className="cheer"><Arrow /><span className="num"><b>{countAt(d.counts, DAY)}</b></span></span>
            </div>
          ))}
        </div>
      </div>
      <p className="sr">An example: four pieces launch in the morning. Through the day readers cheer, and a piece of flash fiction climbs from fourth place to first. At midnight the day closes and it is First of the day.</p>
    </div>
  );
}
