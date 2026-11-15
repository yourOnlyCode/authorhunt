import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/** Every page but the splash wears the header and the footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
