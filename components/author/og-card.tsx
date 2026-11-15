/**
 * components/author/og-card.tsx
 *
 * The card a pasted link shows: a white page, ink, the brand red, a title and
 * a byline. One drawing for author pages and work pages, so a link looks
 * finished anywhere. It is set in the face next/og carries with it, since the
 * image is drawn on the server with no access to the site's own fonts, and a
 * card that always renders is worth more than one that sometimes can't.
 */

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
const INK = "#111111";
const RED = "#D9361E";

type Card = { kicker: string; title: string; line?: string; foot: string };

export function ogCard({ kicker, title, line, foot }: Card): ImageResponse {
  const size = title.length > 60 ? 64 : title.length > 32 ? 80 : 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFFFF", padding: 28 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", border: `3px solid ${INK}`, padding: "48px 56px", color: INK }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>
            <div style={{ width: 18, height: 18, background: RED, marginRight: 18 }} />
            {kicker}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: size, lineHeight: 1.04, letterSpacing: -1 }}>{title.length > 110 ? `${title.slice(0, 107)}...` : title}</div>
            {line && <div style={{ display: "flex", marginTop: 22, fontSize: 36, color: "#333333" }}>{line.length > 90 ? `${line.slice(0, 87)}...` : line}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `3px solid ${INK}`, paddingTop: 22, fontSize: 28 }}>
            <div style={{ display: "flex" }}>Author Hunt</div>
            <div style={{ display: "flex", color: "#B92C16" }}>{foot}</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
