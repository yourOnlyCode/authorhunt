/**
 * app/layout.tsx
 *
 * The frame every page shares: the two faces and the stylesheet. Clerk's
 * provider wraps the app only when Clerk is configured, so the site (and the
 * splash page in particular) runs before sign-in is wired up.
 */

import { preconnect } from "react-dom";
import { clerkFrontendOrigin } from "@/lib/clerk-frontend";
import type { Metadata, Viewport } from "next";
import { Averia_Serif_Libre, Cormorant_Garamond } from "next/font/google";
import { appUrl, clerkEnabled } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next";
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
  title: { default: "Author Hunt: find your next favorite author", template: "%s · Author Hunt" },
  description: "A daily launch board for authors and their writing, from flash fiction to novels. New work goes up each morning, readers cheer for what they love, and every day ends with a ranking.",
  openGraph: { siteName: "Author Hunt", type: "website" },
};
export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

/**
 * Clerk's forms in Author Hunt's own look (DESIGN.md): white, ink, the text face, square corners, and a card on a
 * hard ink shadow like the join box. The colours are the tokens' values, since Clerk can't read CSS variables
 * for colour; the font is the variable next/font sets on <html>.
 */
const CLERK_LOOK = {
  variables: {
    colorPrimary: "#111111", colorPrimaryForeground: "#FFFFFF", colorForeground: "#111111", colorMutedForeground: "#5C5C5C",
    colorBackground: "#FFFFFF", colorInput: "#FFFFFF", colorInputForeground: "#111111", colorBorder: "#111111", colorRing: "#111111",
    colorDanger: "#9C2F25", colorNeutral: "#111111", borderRadius: "0", fontFamily: "var(--font-text), Garamond, Georgia, serif", fontSize: "1.05rem",
  },
  elements: {
    cardBox: { border: "1.5px solid #111111", boxShadow: "8px 8px 0 #111111" },
    card: { boxShadow: "none" },
    headerTitle: { fontFamily: "var(--font-display), Georgia, serif", fontWeight: 300, fontSize: "1.6rem" },
  },
};

/**
 * The words on Clerk's forms that name the site. Clerk otherwise takes the name from its own settings, which
 * spelled it "authorhunt"; set here, it is right whatever those say.
 */
const CLERK_WORDS = {
  signIn: { start: { title: "Sign in to Author Hunt", titleCombined: "Sign in to Author Hunt" } },
  signUp: { start: { title: "Make your Author Hunt account", titleCombined: "Make your Author Hunt account" } },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The face variables sit on <html>, because the tokens that use them are defined on :root.
  // Clerk's provider goes inside <body> for the current SDK (@clerk/nextjs 7), not around <html>.
  const html = (body: React.ReactNode) => <html lang="en" className={`${display.variable} ${text.variable}`}><body>{body}<Analytics /></body></html>;
  if (!clerkEnabled) return html(children);
  // Open the connection to Clerk's address now, so its sign-in form has less to wait for (lib/clerk-frontend.ts).
  const clerkOrigin = clerkFrontendOrigin(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (clerkOrigin) preconnect(clerkOrigin, { crossOrigin: "anonymous" });
  const { ClerkProvider } = await import("@clerk/nextjs");
  return html(<ClerkProvider appearance={CLERK_LOOK} localization={CLERK_WORDS}>{children}</ClerkProvider>);
}
