import type { Metadata } from "next";
import Link from "next/link";
import { CatMark } from "@/components/ui/icons";
import { ConfirmButton } from "./confirm-button";

export const metadata: Metadata = { title: "Confirm your address", robots: { index: false } };

/** Where the waitlist email's link lands. The page asks for one press, so opening the link confirms nothing by itself. */
export default async function Confirm({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="splash">
      <div className="wrap">
        <header className="top"><Link className="logo" href="/" style={{ fontSize: 34 }}><CatMark />Author Hunt</Link></header>
        <section className="join" style={{ marginBlock: 56 }}>
          <h2>One press to confirm</h2>
          <p className="lede" style={{ marginBottom: 20 }}>This puts your address on Author Hunt&apos;s list for opening day.</p>
          {t ? <ConfirmButton token={t} /> : <p>This link is missing its code. Open the one in your email again.</p>}
        </section>
      </div>
    </div>
  );
}
