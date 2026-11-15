import Link from "next/link";

/** A missing page says so plainly and offers the two places most people wanted. */
export default function NotFound() {
  return (
    <main className="wrap">
      <div className="page-head">
        <h1>That page isn&apos;t here.</h1>
        <p>It may have moved, or the address may be mistyped. Try <Link className="word" href="/">today&apos;s launches</Link> or <Link className="word" href="/authors">the authors</Link>.</p>
      </div>
      <div style={{ height: 80 }} />
    </main>
  );
}
