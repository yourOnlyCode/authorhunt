/**
 * app/(site)/admin/_ui.tsx
 *
 * The few pieces every admin page shares: the row of places, the line that
 * says what the last form did, and the hidden fields each form carries. The
 * pages are server components and plain forms, so they work with no script.
 */

import Link from "next/link";
import type { Standing } from "@/lib/db/schema";

const PLACES = [
  { href: "/admin", label: "Desk" }, { href: "/admin/reports", label: "Reports" }, { href: "/admin/authors", label: "Pages" },
  { href: "/admin/log", label: "Log" }, { href: "/admin/references", label: "Reference names" }, { href: "/admin/waitlist", label: "Waitlist" },
];

export function AdminNav({ at }: { at: string }) {
  return (
    <nav className="tabs admin-nav" aria-label="Admin">
      {PLACES.map((p) => <Link key={p.href} href={p.href} aria-current={p.href === at ? "page" : undefined}>{p.label}</Link>)}
    </nav>
  );
}

/** What the form that sent the owner back here did, said once at the top. */
export function Flash({ done, error }: { done?: string; error?: string }) {
  if (error) return <p className="notice warn admin-flash" role="alert">{error}</p>;
  if (done) return <p className="notice admin-flash" role="status">{done}</p>;
  return null;
}

export function StandingWord({ standing }: { standing: Standing }) {
  if (standing === "good") return <span>Good standing</span>;
  return <span className="flag admin-flag">{standing === "banned" ? "Banned" : "Suspended"}</span>;
}

const stamp = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
const dayOnly = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" });
/** Times on admin pages are New York's, the same clock the launch day runs on. */
export const when = (d: Date) => stamp.format(d);
export const onDay = (d: Date) => dayOnly.format(d);

export function Hidden({ values }: { values: Record<string, string> }) {
  return <>{Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}</>;
}

/** A note field. Where the decision needs one the browser asks for it too, though the server is what insists. */
export function Note({ id, required, label = "Note for the log", hint }: { id: string; required?: boolean; label?: string; hint?: string }) {
  return (
    <div className="field-row">
      <label htmlFor={id}>{label}{required ? "" : " (optional)"}</label>
      <textarea className="textarea admin-note" id={id} name="note" required={required} minLength={required ? 10 : undefined} maxLength={4000} />
      <span className="hint">{hint ?? "What you looked at, and why this is the decision. Kept in the log; never sent to anyone."}</span>
    </div>
  );
}
