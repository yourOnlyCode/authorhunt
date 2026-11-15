"use client";

/**
 * components/studio/actions.tsx
 *
 * The studio's small forms: setting a launch, moving or cancelling one,
 * posting and deleting an update, writing to followers, and copying a line
 * of text. Each says what happened beside itself.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIMITS, UPDATE_KINDS } from "@/lib/studio/rules";
import { Field, StatusLine } from "./fields";
import { send, type Status } from "./send";

type Choice = { value: string; label: string };

export function LaunchForm({ choices, today, lastDay, preset }: { choices: Choice[]; today: string; lastDay: string; preset: string }) {
  const router = useRouter();
  const [what, setWhat] = useState(choices.some((c) => c.value === preset) ? preset : choices[0]?.value ?? "");
  const [day, setDay] = useState(today);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    const body = what === "page" ? { kind: "author", day } : { kind: "work", workId: what, day };
    const res = await send<{ launch: { status: string } }>("POST", "/api/studio/launches", body);
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    setStatus({ tone: "ok", text: res.data.launch.status === "live" ? "It's live on today's board." : "Set. It goes on the board that day, at midnight New York time." });
    router.refresh();
  }

  return (
    <form className="stack studio-inline-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label="What to launch" htmlFor="lf-what">
        <select id="lf-what" className="select" value={what} onChange={(e) => setWhat(e.target.value)}>
          {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="The day" htmlFor="lf-day" hint="Days run midnight to midnight, New York time. Choose today to go live now, or any day in the next sixty.">
        <input id="lf-day" type="date" className="input" required min={today} max={lastDay} value={day} onChange={(e) => setDay(e.target.value)} />
      </Field>
      <div className="studio-actions"><button type="submit" className="btn solid" disabled={busy || !what}>{day === today ? "Launch today" : "Set the launch"}</button></div>
      <StatusLine status={status} />
    </form>
  );
}

export function LaunchControls({ id, day, today, lastDay }: { id: string; day: string; today: string; lastDay: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<"none" | "move" | "cancel">("none");
  const [next, setNext] = useState(day);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function run(method: "PATCH" | "DELETE") {
    setBusy(true);
    const res = await send<unknown>(method, `/api/studio/launches/${id}`, method === "PATCH" ? { day: next } : undefined);
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    setOpen("none");
    setStatus({ tone: "ok", text: method === "PATCH" ? "Moved." : "Cancelled." });
    router.refresh();
  }

  return (
    <div className="studio-controls">
      {open === "none" && <><button type="button" className="word" onClick={() => setOpen("move")}>Move</button> <button type="button" className="word" onClick={() => setOpen("cancel")}>Cancel</button></>}
      {open === "move" && (
        <span className="studio-move">
          <input type="date" className="input" aria-label="The new day" min={today} max={lastDay} value={next} onChange={(e) => setNext(e.target.value)} />
          <button type="button" className="word" disabled={busy} onClick={() => void run("PATCH")}>Move it</button>
          <button type="button" className="word" onClick={() => setOpen("none")}>Leave it</button>
        </span>
      )}
      {open === "cancel" && <span>Cancel this launch? <button type="button" className="word" disabled={busy} onClick={() => void run("DELETE")}>Yes, cancel it</button> <button type="button" className="word" onClick={() => setOpen("none")}>Keep it</button></span>}
      <StatusLine status={status} />
    </div>
  );
}

export function UpdateForm({ works }: { works: Choice[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("news");
  const [workId, setWorkId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    const res = await send<{ earned: boolean }>("POST", "/api/studio/updates", { kind, body, workId: workId || null });
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    setBody("");
    setStatus({ tone: "ok", text: "Posted. Your followers will see it." });
    router.refresh();
  }

  return (
    <form className="stack studio-inline-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="studio-two">
        <Field label="What kind" htmlFor="uf-kind">
          <select id="uf-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
            {UPDATE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="About" htmlFor="uf-work">
          <select id="uf-work" className="select" value={workId} onChange={(e) => setWorkId(e.target.value)}>
            <option value="">Nothing in particular</option>
            {works.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Your update" htmlFor="uf-body" hint={`${body.length} of ${LIMITS.updateBody} characters. Links in an update aren't followed links.`}>
        <textarea id="uf-body" className="textarea" required maxLength={LIMITS.updateBody} rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="studio-actions"><button type="submit" className="btn solid" disabled={busy || !body.trim()}>Post the update</button></div>
      <StatusLine status={status} />
    </form>
  );
}

export function DeleteUpdate({ id }: { id: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function run() {
    const res = await send<unknown>("DELETE", `/api/studio/updates?id=${id}`);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    router.refresh();
  }
  return (
    <span className="studio-controls">
      {asking
        ? <>Delete it? <button type="button" className="word" onClick={() => void run()}>Yes</button> <button type="button" className="word" onClick={() => setAsking(false)}>No</button></>
        : <button type="button" className="word" onClick={() => setAsking(true)}>Delete</button>}
      <StatusLine status={status} />
    </span>
  );
}

export function FollowerEmailForm({ takers }: { takers: number }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit() {
    setBusy(true);
    setStatus(null);
    const res = await send<{ sent: number; of: number }>("POST", "/api/studio/followers/email", { subject, body });
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    setSubject("");
    setBody("");
    setStatus({ tone: "ok", text: `Sent to ${res.data.sent} of ${res.data.of} ${res.data.of === 1 ? "follower" : "followers"}.` });
  }

  return (
    <form className="stack studio-inline-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <Field label="Subject" htmlFor="ef-subject">
        <input id="ef-subject" className="input" required minLength={3} maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Your message" htmlFor="ef-body" hint="Plain text. Leave an empty line between paragraphs. It ends with a link to your page and a line saying how to stop these.">
        <textarea id="ef-body" className="textarea" required minLength={20} maxLength={5000} rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <div className="studio-actions"><button type="submit" className="btn solid" disabled={busy || takers === 0}>Send to {takers} {takers === 1 ? "follower" : "followers"}</button></div>
      <StatusLine status={status} />
    </form>
  );
}

/** A line of text with a way to copy it. Says "Copied" beside itself. */
export function CopyLine({ label, text, multiline }: { label: string; text: string; multiline?: boolean }) {
  const [said, setSaid] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setSaid("Copied."); }
    catch { setSaid("Select the text and copy it by hand."); }
  }
  return (
    <div className="field-row studio-copy">
      <span className="label">{label}</span>
      <div className="studio-copy-row">
        {multiline
          ? <textarea className="textarea" readOnly rows={3} aria-label={label} value={text} onFocus={(e) => e.currentTarget.select()} />
          : <input className="input" readOnly aria-label={label} value={text} onFocus={(e) => e.currentTarget.select()} />}
        <button type="button" className="btn" onClick={() => void copy()}>Copy</button>
      </div>
      <p className="hint" role="status" aria-live="polite">{said}</p>
    </div>
  );
}
