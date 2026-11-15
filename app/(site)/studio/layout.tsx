/**
 * The author's side of the site. Every page under /studio is for the signed-in
 * author alone (each calls requireViewer) and none is for search engines.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio · Author Hunt" }, robots: { index: false, follow: false } };

const PLACES = [
  ["/studio", "Desk"], ["/studio/page", "Page"], ["/studio/works/new", "Add a work"], ["/studio/launch", "Launch"], ["/studio/updates", "Updates"],
  ["/studio/followers", "Followers"], ["/studio/analytics", "Analytics"], ["/studio/share", "Share kit"],
] as const;

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="studio-nav" aria-label="Studio">
        <div className="wrap">
          <span className="sc">Studio</span>
          <ul>{PLACES.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
        </div>
      </nav>
      {children}
    </>
  );
}
