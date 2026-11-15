import type { Config } from "tailwindcss";

// Colours and faces are the tokens in app/globals.css (DESIGN.md). Tailwind is
// here for layout utilities; component looks live in globals.css, ported from
// docs/mockups/author-hunt.html.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    borderRadius: { none: "0", DEFAULT: "0" },
    extend: {
      colors: {
        page: "var(--page)", ink: "var(--ink)", "ink-2": "var(--ink-2)", muted: "var(--muted)",
        hair: "var(--hair)", tint: "var(--tint)", red: "var(--red)", "red-text": "var(--red-text)", mark: "var(--mark)",
      },
      fontFamily: { display: "var(--display)", text: "var(--text)" },
    },
  },
  plugins: [],
};
export default config;
