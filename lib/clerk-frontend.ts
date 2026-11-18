/**
 * lib/clerk-frontend.ts
 *
 * Clerk's own address for this site (clerk.authorhunt.com in production), read from the publishable key, which
 * carries it base64-encoded after "pk_live_" or "pk_test_". The layout opens a connection to it early, so the
 * sign-in form's script is quicker to arrive. Null when Clerk isn't configured or the key can't be read.
 */

export function clerkFrontendOrigin(publishableKey: string | undefined): string | null {
  const m = /^pk_(?:live|test)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey ?? "");
  if (!m) return null;
  try {
    const host = Buffer.from(m[1]!, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}
