"use client";

/**
 * components/studio/fields.tsx
 *
 * The small repeated pieces of the page form and the work form: a list of
 * labelled links, a set of checkboxes with a most-you-can-choose, the three
 * AI declarations with what each means, and a list of well-known writers'
 * names. Kept in one place so both forms ask the same questions the same way.
 */

import { useId, useState } from "react";
import type { AiUse, LinkItem } from "@/lib/db/schema";
import { AI_CHOICES, AI_NOT_ACCEPTED } from "@/lib/studio/rules";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="field-row">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function LinkList({ legend, value, onChange, max, hint, labelHint = "Newsletter", addWord = "Add a link" }: { legend: string; value: LinkItem[]; onChange: (v: LinkItem[]) => void; max: number; hint?: React.ReactNode; labelHint?: string; addWord?: string }) {
  const set = (i: number, patch: Partial<LinkItem>) => onChange(value.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  return (
    <fieldset className="studio-set">
      <legend className="label">{legend}</legend>
      {value.length === 0 && <p className="hint">None yet.</p>}
      <ul className="studio-links">
        {value.map((l, i) => (
          <li key={i}>
            <input className="input" aria-label={`Link ${i + 1}: what it's called`} placeholder={labelHint} value={l.label} maxLength={40} onChange={(e) => set(i, { label: e.target.value })} />
            <input className="input" aria-label={`Link ${i + 1}: its address`} placeholder="https://" inputMode="url" value={l.url} maxLength={300} onChange={(e) => set(i, { url: e.target.value })} />
            <button type="button" className="word" onClick={() => onChange(value.filter((_, n) => n !== i))}>Remove</button>
          </li>
        ))}
      </ul>
      {value.length < max && <p><button type="button" className="word" onClick={() => onChange([...value, { label: "", url: "" }])}>{addWord}</button></p>}
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}

export function CheckSet({ legend, options, value, onChange, max, hint }: { legend: string; options: { slug: string; name: string }[]; value: string[]; onChange: (v: string[]) => void; max?: number; hint?: React.ReactNode }) {
  const full = max !== undefined && value.length >= max;
  return (
    <fieldset className="studio-set">
      <legend className="label">{legend}</legend>
      <div className="studio-checks">
        {options.map((o) => {
          const on = value.includes(o.slug);
          return (
            <label key={o.slug} className="studio-check">
              <input type="checkbox" checked={on} disabled={!on && full} onChange={() => onChange(on ? value.filter((v) => v !== o.slug) : [...value, o.slug])} />
              <span>{o.name}</span>
            </label>
          );
        })}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}

export function AiChoice({ legend, value, onChange, hint }: { legend: string; value: AiUse | null; onChange: (v: AiUse) => void; hint: React.ReactNode }) {
  const name = useId();
  return (
    <fieldset className="studio-set studio-declare">
      <legend className="label">{legend}</legend>
      <p className="hint">{hint}</p>
      <p className="notice warn" style={{ fontSize: 18 }}>{AI_NOT_ACCEPTED}</p>
      {AI_CHOICES.map((c) => (
        <label key={c.value} className="studio-radio">
          <input type="radio" name={name} checked={value === c.value} onChange={() => onChange(c.value)} />
          <span><b>{c.label}.</b> {c.means}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Well-known writers, chosen from the list or typed in. Each entry is a name; the server finds or makes its row. */
export function NameList({ legend, value, onChange, known, max, hint }: { legend: string; value: string[]; onChange: (v: string[]) => void; known: string[]; max: number; hint?: React.ReactNode }) {
  const id = useId();
  const [draft, setDraft] = useState("");
  function add() {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name || value.length >= max) return;
    const match = known.find((k) => k.toLowerCase() === name.toLowerCase()) ?? name;
    if (!value.some((v) => v.toLowerCase() === match.toLowerCase())) onChange([...value, match]);
    setDraft("");
  }
  return (
    <fieldset className="studio-set">
      <legend className="label">{legend}</legend>
      {value.length > 0 && (
        <ul className="studio-names">
          {value.map((n) => (
            <li key={n}><i>{n}</i> <button type="button" className="word" aria-label={`Remove ${n}`} onClick={() => onChange(value.filter((v) => v !== n))}>Remove</button></li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="studio-add">
          <input className="input" list={id} aria-label={`${legend}: a writer's name`} placeholder="A writer's name" value={draft} maxLength={80}
            onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
          <datalist id={id}>{known.map((k) => <option key={k} value={k} />)}</datalist>
          <button type="button" className="btn" onClick={add}>Add</button>
        </div>
      )}
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}

export function StatusLine({ status }: { status: { tone: "ok" | "bad"; text: string } | null }) {
  return <p className={status?.tone === "bad" ? "error-text" : "studio-ok"} role="status" aria-live="polite">{status?.text ?? ""}</p>;
}
