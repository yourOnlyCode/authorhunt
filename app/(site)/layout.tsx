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
    // The page is at least the screen's height and its middle takes the slack, so the footer sits at the bottom
    // of the screen on a short page, and never moves up while something (Clerk's form, a list) is still loading.
    <div className="site">
      <SiteHeader />
      <div className="site-body">{children}</div>
      <SiteFooter />
    </div>
  );
}
