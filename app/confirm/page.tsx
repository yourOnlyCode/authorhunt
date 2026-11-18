import type { Metadata } from "next";
import Link from "next/link";
import { CatMark } from "@/components/ui/icons";
import { ConfirmButton } from "./confirm-button";
import { MetaPixel } from "@/components/analytics/meta-pixel";

export const metadata: Metadata = { title: "Confirm your address", robots: { index: false } };

/** Where the waitlist email's link lands. The page asks for one press, so opening the link confirms nothing by itself. */
export default async function Confirm({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="splash">
      <div className="first">
        <div className="wrap">
          <Link className="logo" href="/"><CatMark />Author Hunt</Link>
          <section className="join" aria-labelledby="confirm-h">
            <h2 id="confirm-h">One press to confirm</h2>
            <p className="as" style={{ marginBottom: 14 }}>This puts your address on Author Hunt&apos;s list for opening day.</p>
            {t ? <ConfirmButton token={t} /> : <p>This link is missing its code. Open the one in your email again.</p>}
          </section>
        </div>
      </div>
      <MetaPixel />
    </div>
  );
}
