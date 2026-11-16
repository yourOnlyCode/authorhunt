"use client";

/**
 * components/splash/confetti.tsx
 *
 * A handful of square paper pieces in the brand's colours, thrown up and out
 * from the middle of whatever holds them, turning, then falling and fading
 * (the keyframes are in app/globals.css). Used when someone joins the list
 * and when they confirm their address. Hidden under reduced motion.
 */

import type { CSSProperties } from "react";

export type Piece = { id: number; dx: number; dy: number; rot: number; color: string; w: number; h: number; delay: number };

const COLORS = ["var(--red)", "var(--blue)", "var(--mark)", "var(--ink)"];

/** Call from an event handler, never during render: it rolls dice. */
export function throwConfetti(count = 44): Piece[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
    const reach = 120 + Math.random() * 230;
    return {
      id, dx: Math.round(Math.cos(angle) * reach), dy: Math.round(Math.sin(angle) * reach), rot: Math.round((Math.random() - 0.5) * 900),
      color: COLORS[id % COLORS.length] as string, w: id % 3 === 0 ? 6 : 9, h: id % 3 === 0 ? 13 : 9, delay: Math.round(Math.random() * 140),
    };
  });
}

export function Confetti({ pieces }: { pieces: Piece[] }) {
  if (pieces.length === 0) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => <i key={p.id} style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`, background: p.color, width: p.w, height: p.h, animationDelay: `${p.delay}ms` } as CSSProperties} />)}
    </div>
  );
}
