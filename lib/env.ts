/**
 * lib/env.ts
 *
 * Which outside services are wired up. Every one is optional in development:
 * the app runs with none of them, and says so where a feature is switched off.
 */

export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
/** Sample accounts you can sign in as with one click. Never on when Clerk is, and never in production unless asked for. */
export const devAuthEnabled = !clerkEnabled && (process.env.NODE_ENV !== "production" || process.env.AUTH_DEV === "1");
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
export const resendEnabled = Boolean(process.env.RESEND_API_KEY);
export const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const upstashEnabled = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** When the site opens. Unset means it is open (development). docs/launch.md. */
export function launchAt(): Date | null {
  const raw = process.env.LAUNCH_AT;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function beforeLaunch(now: Date): boolean {
  const at = launchAt();
  return at !== null && now < at;
}
