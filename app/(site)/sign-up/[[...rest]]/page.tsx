/**
 * Make an account. With Clerk configured this is Clerk's own form, in Author
 * Hunt's own Clerk application. With no Clerk keys there is nothing to sign
 * up to, so it goes to /sign-in, which lists the sample accounts in development.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { clerkEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Make an account", robots: { index: false } };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (await getViewer()) redirect(next);
  if (!clerkEnabled) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const { SignUp: ClerkSignUp } = await import("@clerk/nextjs");
  return <main className="wrap" style={{ paddingBlock: 56, display: "grid", placeItems: "center" }}><ClerkSignUp fallbackRedirectUrl={next} signInUrl={`/sign-in?next=${encodeURIComponent(next)}`} /></main>;
}
