/**
 * app/layout.tsx
 *
 * The frame every page shares: the two faces and the stylesheet. Clerk's
 * provider wraps the app only when Clerk is configured, so the site (and the
 * splash page in particular) runs before sign-in is wired up.
 */

import type { Metadata, Viewport } from "next";
import { Averia_Serif_Libre, Cormorant_Garamond } from "next/font/google";
import { appUrl, clerkEnabled } from "@/lib/env";
import "./globals.css";
import "./styles/pages.css";
import "./styles/discover.css";
import "./styles/studio.css";
import "./styles/account.css";
import "./styles/admin.css";

const display = Averia_Serif_Libre({ subsets: ["latin"], weight: ["300", "400"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const text = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], variable: "--font-text", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Author Hunt: find your next favourite author", template: "%s · Author Hunt" },
  description: "A daily launch board for authors and their writing, from flash fiction to novels. New work goes up each morning, readers cheer for what they love, and every day ends with a ranking.",
  openGraph: { siteName: "Author Hunt", type: "website" },
};
export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The face variables sit on <html>, because the tokens that use them are defined on :root.
  const page = <html lang="en" className={`${display.variable} ${text.variable}`}><body>{children}</body></html>;
  if (!clerkEnabled) return page;
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{page}</ClerkProvider>;
}
