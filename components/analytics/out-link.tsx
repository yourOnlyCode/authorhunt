"use client";

/**
 * components/analytics/out-link.tsx
 *
 * A link that leaves the site. It is a plain <a href> to the real address, so
 * the link is worth to the author whatever its rel says, and a click is
 * counted with a beacon on the way out. Never a redirect through our server
 * (docs/development.md, Outbound links): that would throw the link away.
 */

import type { ReactNode } from "react";
import { sendEvent, viaFromLocation } from "./beacon";

type Props = { href: string; rel: string; authorId?: string; className?: string; children: ReactNode };

export function OutLink({ href, rel, authorId, className, children }: Props) {
  return (
    <a href={href} rel={rel} target="_blank" className={className}
      onClick={() => sendEvent({ kind: "click", path: window.location.pathname, target: href, via: viaFromLocation(), authorId })}>
      {children}
    </a>
  );
}
