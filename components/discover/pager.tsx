/**
 * components/discover/pager.tsx
 *
 * Earlier and later pages of a list, as plain links so each page has its own
 * address. Nothing is drawn when there is one page.
 */

import Link from "next/link";

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      {page > 1 ? <Link className="word" href={href(page - 1)} rel="prev">Previous page</Link> : <span />}
      <span>Page {page} of {pages}</span>
      {page < pages ? <Link className="word" href={href(page + 1)} rel="next">Next page</Link> : <span />}
    </nav>
  );
}
