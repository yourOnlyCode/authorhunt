"use client";

/**
 * components/trust/report-link.tsx
 *
 * "Report" on any launch, page, work, comment or collection. It opens in
 * place: a reason, a sentence of why, and what happened, said where the
 * reader pressed (docs/product-structure.md, section 6).
 */

import { useState } from "react";
import type { ReportTarget } from "@/lib/db/schema";

export const REPORT_REASONS: { key: string; label: string; for: ReportTarget[] | "any" }[] = [
  { key: "spam", label: "Spam or a scam", for: "any" },
  { key: "stolen", label: "Stolen or plagiarised work", for: ["work", "launch", "image"] },
  { key: "impersonation", label: "Not the real author", for: ["author", "launch"] },
  { key: "undeclared_ai", label: "AI use that wasn't declared", for: ["author", "work", "launch"] },
  { key: "missing_note", label: "A missing Mature mark or content note", for: ["author", "work", "launch"] },
  { key: "harassment", label: "Harassment or hate", for: ["comment", "author", "collection"] },
  { key: "cheer_trading", label: "Asking for or trading cheers", for: ["launch", "comment"] },
  { key: "other", label: "Something else", for: "any" },
];

type Props = { targetKind: ReportTarget; targetId: string; signedIn: boolean; label?: string };

export function ReportLink({ targetKind, targetId, signedIn, label = "Report" }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const reasons = REPORT_REASONS.filter((r) => r.for === "any" || r.for.includes(targetKind));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending"); setError(null);
    try {
      const res = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetKind, targetId, reason: form.get("reason"), note: form.get("note") }) });
      if (res.ok) { setState("done"); return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "That didn't go through.");
    } catch { setError("That didn't go through."); }
    setState("idle");
  }

  if (!open) {
    return <button type="button" className="word" onClick={() => { if (!signedIn) { window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`; return; } setOpen(true); }}>{label}</button>;
  }
  if (state === "done") return <span role="status">Reported. A person will look at it, and you&apos;ll be told what was decided.</span>;
  return (
    <form className="stack notice" onSubmit={submit} style={{ marginTop: 10, textAlign: "left" }}>
      <div className="field-row"><label htmlFor={`reason-${targetId}`}>What&apos;s wrong</label>
        <select className="select" id={`reason-${targetId}`} name="reason" required defaultValue="">
          <option value="" disabled>Choose one</option>
          {reasons.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select></div>
      <div className="field-row"><label htmlFor={`note-${targetId}`}>What are you going on?</label>
        <textarea className="textarea" id={`note-${targetId}`} name="note" required minLength={10} maxLength={2000} style={{ minHeight: 80 }} placeholder="A sentence or two. The person you're reporting never sees who reported them." /></div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}><button className="btn solid" type="submit" disabled={state === "sending"}>Send report</button><button className="word" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
