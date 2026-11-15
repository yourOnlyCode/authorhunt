import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/**
 * Every page but the splash wears the header and the footer. The header shows
 * who is signed in, so nothing under it may be prerendered at build time: a
 * signed-in page built with no session would be frozen as a redirect to sign-in.
 */
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
