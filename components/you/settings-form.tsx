"use client";

/**
 * components/you/settings-form.tsx
 *
 * The settings page's one form. Everything saves together with one button and
 * says so beside it; the Mature switch has its own route because other pages
 * call it too (the confirm on a blurred cover).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PrefRow = { kind: string; label: string; bell: boolean; email: boolean; emailNote: string };
type Props = { displayName: string; alwaysShowNotes: boolean; adult: boolean; prefs: PrefRow[] };

export function SettingsForm({ displayName, alwaysShowNotes, adult, prefs }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("saving"); setError(null);
    const body = {
      displayName: String(form.get("displayName") ?? ""),
      alwaysShowNotes: form.get("alwaysShowNotes") === "on",
      prefs: prefs.map((p) => ({ kind: p.kind, bell: form.get(`bell-${p.kind}`) === "on", email: form.get(`email-${p.kind}`) === "on" })),
    };
    const wantsAdult = form.get("adult") === "on";
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(typeof data.error === "string" ? data.error : ""); }
      if (wantsAdult !== adult) {
        const res2 = await fetch("/api/settings/adult", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(wantsAdult ? {} : { confirm: false }) });
        if (!res2.ok) throw new Error("");
      }
      setState("saved");
      router.refresh();
    } catch (err) {
      setError((err instanceof Error && err.message) || "That didn't save. Try again.");
      setState("idle");
    }
  }

  return (
    <form className="stack settings" onSubmit={submit} onChange={() => { if (state === "saved") setState("idle"); }}>
      <section className="sec">
        <header><h2>Your name</h2></header>
        <div className="field-row">
          <label htmlFor="displayName">Name</label>
          <input className="input" id="displayName" name="displayName" defaultValue={displayName} required maxLength={60} autoComplete="name" />
          <span className="hint">Shown beside your comments and on collections you share.</span>
        </div>
      </section>

      <section className="sec">
        <header><h2>What you hear about</h2><span>The bell is on this site. Email goes to your inbox.</span></header>
        <table className="table prefs">
          <thead><tr><th scope="col">When</th><th scope="col">Bell</th><th scope="col">Email</th></tr></thead>
          <tbody>
            {prefs.map((p) => (
              <tr key={p.kind}>
                <th scope="row">{p.label}{p.emailNote && <small>{p.emailNote}</small>}</th>
                <td><input type="checkbox" name={`bell-${p.kind}`} defaultChecked={p.bell} aria-label={`Bell: ${p.label}`} /></td>
                <td><input type="checkbox" name={`email-${p.kind}`} defaultChecked={p.email} aria-label={`Email: ${p.label}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sec">
        <header><h2>Mature work and content notes</h2></header>
        <div className="stack">
          <label className="check"><input type="checkbox" name="adult" defaultChecked={adult} /> I&apos;m 18 or over: show Mature work</label>
          <p className="hint">Until you say so, work marked Mature has its cover blurred and asks before it opens.</p>
          <label className="check"><input type="checkbox" name="alwaysShowNotes" defaultChecked={alwaysShowNotes} /> Always show content notes</label>
          <p className="hint">Content notes are hidden until asked for, because a note can itself spoil or distress. Turn this on to see them straight away.</p>
        </div>
      </section>

      <div className="save-line">
        <button className="btn solid" type="submit" disabled={state === "saving"}>Save settings</button>
        {state === "saved" && <span role="status" className="it">Saved.</span>}
        {error && <span className="error-text" role="alert">{error}</span>}
      </div>
    </form>
  );
}
