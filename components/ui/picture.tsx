/**
 * components/ui/picture.tsx
 *
 * A cover (2:3) and a portrait (square on the board, 4:5 on a page), each with
 * a hairline border and square corners. With no image, a cover shows its title
 * and a portrait its initials on a flat colour: never a grey box (DESIGN.md).
 */

import type { CSSProperties } from "react";

export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

type Props = { url: string | null; color: string; label: string; className?: string; blurred?: boolean; style?: CSSProperties };

export function Cover({ url, color, label, className = "", blurred, style }: Props) {
  if (url) return <img className={`cover ${className} ${blurred ? "blurred" : ""}`} src={url} alt={`Cover of ${label}`} style={{ padding: 0, objectFit: "cover", ...style }} />;
  return <div className={`cover ${className}`} style={{ background: color, ...style }} aria-hidden="true">{blurred ? "" : label}</div>;
}

export function Portrait({ url, color, label, className = "", blurred, style }: Props) {
  if (url) return <img className={`portrait ${className} ${blurred ? "blurred" : ""}`} src={url} alt={label} style={{ objectFit: "cover", ...style }} />;
  return <div className={`portrait ${className}`} style={{ background: color, ...style }} aria-hidden="true">{initials(label)}</div>;
}
