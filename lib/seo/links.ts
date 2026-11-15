/**
 * lib/seo/links.ts
 *
 * The rel on every outbound link (docs/development.md, Outbound links).
 * It never depends on plan: a followed link is earned by verifying the site,
 * not bought (AGENTS.md rule 4). Pure, and tested.
 */

export type LinkKind = "website" | "profile" | "buy" | "support" | "user_text";

export function relFor(kind: LinkKind, facts: { siteVerified: boolean }): string {
  switch (kind) {
    case "website": return facts.siteVerified ? "noopener" : "nofollow noopener";
    case "profile": return facts.siteVerified ? "me noopener" : "me nofollow noopener";
    case "buy": return "noopener";
    // A payment link is the author's own business, not an endorsement.
    case "support": return "nofollow noopener";
    case "user_text": return "ugc nofollow noopener";
  }
}

/** Only http and https links are ever rendered; anything else is dropped. */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch { return null; }
}

/** A member's support link must be on a service we recognise, so the button can't be pointed anywhere. */
const SUPPORT_HOSTS = ["ko-fi.com", "buymeacoffee.com", "paypal.me", "paypal.com", "patreon.com", "venmo.com", "cash.app", "buy.stripe.com", "donate.stripe.com", "liberapay.com", "github.com"];
export function supportUrlAllowed(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url) return false;
  const host = new URL(url).hostname.replace(/^www\./, "");
  return SUPPORT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
