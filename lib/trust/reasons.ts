/**
 * lib/trust/reasons.ts
 *
 * The reasons a report can give, and which kinds of thing each applies to
 * (docs/product-structure.md, section 6). The form in
 * components/trust/report-link.tsx holds the same list for the browser; it is
 * a client module, so the server can't read its exports, and this is the copy
 * the route and the admin pages check against. tests/trust.test.ts fails if
 * the two ever differ.
 */

import type { ReportTarget } from "../db/schema";

export type ReasonKey = "spam" | "stolen" | "impersonation" | "undeclared_ai" | "missing_note" | "harassment" | "cheer_trading" | "other";

export const REASONS: { key: ReasonKey; label: string; for: ReportTarget[] | "any" }[] = [
  { key: "spam", label: "Spam or a scam", for: "any" },
  { key: "stolen", label: "Stolen or plagiarised work", for: ["work", "launch", "image"] },
  { key: "impersonation", label: "Not the real author", for: ["author", "launch"] },
  { key: "undeclared_ai", label: "Written by AI", for: ["author", "work", "launch"] },
  { key: "missing_note", label: "A missing Mature mark or content note", for: ["author", "work", "launch"] },
  { key: "harassment", label: "Harassment or hate", for: ["comment", "author", "collection"] },
  { key: "cheer_trading", label: "Asking for or trading cheers", for: ["launch", "comment"] },
  { key: "other", label: "Something else", for: "any" },
];

export const TARGET_KINDS: ReportTarget[] = ["launch", "author", "work", "comment", "collection", "image"];

/** The word an admin reads for each kind of thing. */
export const TARGET_LABELS: Record<ReportTarget, string> = { launch: "Launch", author: "Page", work: "Work", comment: "Comment", collection: "Collection", image: "Picture" };

export function isTargetKind(value: string): value is ReportTarget {
  return (TARGET_KINDS as string[]).includes(value);
}

export function reasonsFor(kind: ReportTarget) {
  return REASONS.filter((r) => r.for === "any" || r.for.includes(kind));
}

export function reasonAllowed(kind: ReportTarget, reason: string): boolean {
  return reasonsFor(kind).some((r) => r.key === reason);
}

export function reasonLabel(key: string): string {
  return REASONS.find((r) => r.key === key)?.label ?? key;
}
