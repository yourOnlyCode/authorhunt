import type { Metadata } from "next";
import Link from "next/link";
import { CatMark } from "@/components/ui/icons";
import { UnsubscribeButton } from "./unsubscribe-button";

export const metadata: Metadata = { title: "Unsubscribe from the Sunday letter", robots: { index: false } };

/** Where the letter's unsubscribe link lands. Opening the link changes nothing; the press does. */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="splash">
      <div className="wrap">
        <header className="top"><Link className="logo" href="/" style={{ fontSize: 34 }}><CatMark />Author Hunt</Link></header>
        <section className="join" style={{ marginBlock: 56 }}>
          <h2>Stop the Sunday letter</h2>
          <p className="lede" style={{ marginBottom: 20 }}>One press takes this address off the list. Nothing else is sent to it.</p>
          {t ? <UnsubscribeButton token={t} /> : <p>This link is missing its code. Open the one at the foot of the letter again.</p>}
        </section>
      </div>
    </div>
  );
}
