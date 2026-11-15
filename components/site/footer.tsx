import Link from "next/link";

/** The foot of every page: the Marigold trim, the places, and the ornament's credit. */
export function SiteFooter() {
  return (
    <>
      <div className="trim" aria-hidden="true" />
      <footer>
        <div className="wrap">
          <span>Author Hunt. Free for readers and free to launch. <Link className="word" href="/pricing">Member tools</Link> · <Link className="word" href="/about">About</Link> · <Link className="word" href="/terms">Terms</Link> · <Link className="word" href="/privacy">Privacy</Link></span>
          <span>Ornament: William Morris, Marigold, 1875. Art Institute of Chicago, public domain.</span>
        </div>
      </footer>
    </>
  );
}
