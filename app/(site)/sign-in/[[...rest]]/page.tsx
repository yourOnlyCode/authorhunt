/**
 * Sign in. With Clerk configured this is Clerk's own form, in Author Hunt's
 * own Clerk application. In development with no
 * Clerk keys it lists the seeded sample accounts.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { clerkEnabled, devAuthEnabled } from "@/lib/env";
import { AuthFrame, AuthSkeleton } from "@/components/auth/auth-frame";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const SAMPLES = [
  { id: "dev_reader", name: "June Bellweather", what: "A reader. Follows an author and has a collection." },
  { id: "dev_author", name: "Maren Okafor-Lindqvist", what: "An author with a page, two books and a launch today. Has the member tools." },
  { id: "dev_new", name: "A new account", what: "No page yet. Start here to try making one." },
  { id: "dev_admin", name: "The owner", what: "An admin. Sees the reports queue." },
];

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const viewer = await getViewer();

  if (clerkEnabled) {
    if (viewer) redirect(next);
    const { SignIn: ClerkSignIn } = await import("@clerk/nextjs");
    return <AuthFrame><ClerkSignIn fallbackRedirectUrl={next} signUpUrl={`/sign-up?next=${encodeURIComponent(next)}`} fallback={<AuthSkeleton title="Sign in to Author Hunt" />} /></AuthFrame>;
  }

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div className="page-head"><h1>Sign in</h1>
        <p>{devAuthEnabled ? "Sign-in isn't wired up yet, so pick a sample account. This list is for development only and disappears once Clerk's keys are set." : "Sign-in isn't available yet."}</p>
      </div>
      {devAuthEnabled && (
        <ul style={{ paddingBlock: 12 }}>
          {SAMPLES.map((s) => (
            <li key={s.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center", paddingBlock: 16, borderBottom: "1px solid var(--hair)" }}>
              <div><b>{s.name}</b>{viewer?.id === s.id ? " (signed in)" : ""}<br /><span style={{ color: "var(--muted)" }}>{s.what}</span></div>
              <form action="/api/dev-auth" method="post"><input type="hidden" name="user" value={s.id} /><input type="hidden" name="next" value={next} /><button className="btn" type="submit">Sign in</button></form>
            </li>
          ))}
          {viewer && <li style={{ paddingBlock: 16 }}><form action="/api/dev-auth" method="post"><input type="hidden" name="user" value="" /><button className="word" type="submit">Sign out</button></form></li>}
        </ul>
      )}
    </main>
  );
}
