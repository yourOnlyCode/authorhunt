"use client";

/**
 * components/studio/work-form.tsx
 *
 * Adding or changing a work: a book, a short work, a serial or an issue.
 * Free, with no limit on how many. The work's own AI declaration is asked
 * here and is required before it can launch (AGENTS.md rule 7). Content notes
 * come from a fixed list with room for a line of the author's own; readers
 * see them only when they ask.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiUse, LinkItem, WorkKind } from "@/lib/db/schema";
import { CONTENT_NOTES, COVER_SWATCHES, LIMITS, WORK_KINDS } from "@/lib/studio/rules";
import { AiChoice, CheckSet, Field, LinkList, StatusLine } from "./fields";
import { ImageField } from "./image-field";
import { send, type Status } from "./send";

export type WorkFormValues = {
  kind: WorkKind; form: string; title: string; tagline: string; description: string; excerpt: string;
  coverUrl: string | null; coverColor: string; gallery: { url: string; caption: string }[];
  pubDate: string; pages: string; isbn: string; buyLinks: LinkItem[]; genres: string[]; platforms: string[];
  aiUse: AiUse | null; mature: boolean; contentNotes: string[]; contentNoteText: string;
};

type Props = {
  id: string | null;
  initial: WorkFormValues;
  slug: string | null;
  launchState: "none" | "scheduled" | "launched";
  genres: { slug: string; name: string }[];
  platforms: { slug: string; name: string }[];
};

const NOTE_OPTIONS = CONTENT_NOTES.map((n) => ({ slug: n.slug, name: n.label }));

export function WorkForm(props: Props) {
  const router = useRouter();
  const [v, setV] = useState<WorkFormValues>(props.initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof WorkFormValues>(key: K, value: WorkFormValues[K]) => setV((old) => ({ ...old, [key]: value }));
  const formHint = WORK_KINDS.find((k) => k.value === v.kind)?.form ?? "A novel";

  async function save() {
    setBusy(true);
    setStatus(null);
    const body = { ...v, pubDate: v.pubDate || null, pages: v.pages ? Number(v.pages) : null };
    const res = props.id
      ? await send<{ work: { id: string } }>("PUT", `/api/studio/works/${props.id}`, body)
      : await send<{ work: { id: string } }>("POST", "/api/studio/works", body);
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    if (!props.id) { router.push(`/studio/works/${res.data.work.id}?made=1`); return; }
    setStatus({ tone: "ok", text: "Saved." });
    router.refresh();
  }

  async function remove() {
    if (!props.id) return;
    setBusy(true);
    const res = await send<{ deleted: boolean }>("DELETE", `/api/studio/works/${props.id}`);
    setBusy(false);
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); setConfirmDelete(false); return; }
    router.push("/studio");
    router.refresh();
  }

  return (
    <form className="stack studio-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <section className="studio-part">
        <h2>What it is</h2>
        <div className="studio-two">
          <Field label="Kind" htmlFor="wf-kind">
            <select id="wf-kind" className="select" value={v.kind} onChange={(e) => set("kind", e.target.value as WorkKind)}>
              {WORK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          <Field label="What to call it" htmlFor="wf-form" hint={`The words readers see, such as "${formHint}", "A chapbook" or "Issue 12".`}>
            <input id="wf-form" className="input" maxLength={40} placeholder={formHint} value={v.form} onChange={(e) => set("form", e.target.value)} />
          </Field>
        </div>
        <Field label="Title" htmlFor="wf-title" hint={props.slug ? `Its address is /work/${props.slug}${props.launchState === "none" ? ", and follows the title until it has a launch." : "."}` : undefined}>
          <input id="wf-title" className="input" required maxLength={160} value={v.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="In a line" htmlFor="wf-tagline" hint="The line shown beside it on the board.">
          <input id="wf-tagline" className="input" maxLength={160} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="About it" htmlFor="wf-description">
          <textarea id="wf-description" className="textarea" rows={7} maxLength={6000} value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="An excerpt" htmlFor="wf-excerpt" hint="An opening page or a passage, if you'd like readers to try it.">
          <textarea id="wf-excerpt" className="textarea" rows={7} maxLength={8000} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        </Field>
      </section>

      <section className="studio-part">
        <h2>How it looks</h2>
        <ImageField kind="cover" label="Cover" value={v.coverUrl} onChange={(url) => set("coverUrl", url)} alt={`Cover of ${v.title || "this work"}`} />
        <fieldset className="studio-set">
          <legend className="label">Colour, if there&rsquo;s no cover yet</legend>
          <div className="studio-swatches">
            {COVER_SWATCHES.map((s) => (
              <label key={s.value} className="studio-swatch">
                <input type="radio" name="coverColor" className="visually-hidden" checked={v.coverColor === s.value} onChange={() => set("coverColor", s.value)} />
                <span style={{ background: s.value }} aria-hidden="true" />
                <span className="visually-hidden">{s.name}</span>
              </label>
            ))}
          </div>
          <p className="hint">Without a cover, the title is set on this colour.</p>
        </fieldset>
        <fieldset className="studio-set">
          <legend className="label">More pictures</legend>
          <ul className="studio-gallery">
            {v.gallery.map((g, i) => (
              <li key={g.url}>
                <ImageField kind="gallery" label={`Picture ${i + 1}`} value={g.url} alt={g.caption || `Picture ${i + 1}`}
                  onChange={(url) => set("gallery", url ? v.gallery.map((x, n) => (n === i ? { ...x, url } : x)) : v.gallery.filter((_, n) => n !== i))} />
                <input className="input" aria-label={`Picture ${i + 1}: caption`} placeholder="A caption" maxLength={140} value={g.caption}
                  onChange={(e) => set("gallery", v.gallery.map((x, n) => (n === i ? { ...x, caption: e.target.value } : x)))} />
              </li>
            ))}
          </ul>
          {v.gallery.length < LIMITS.gallery && (
            <ImageField key={v.gallery.length} kind="gallery" label="Add a picture" value={null} alt="" onChange={(url) => { if (url) set("gallery", [...v.gallery, { url, caption: "" }]); }} />
          )}
        </fieldset>
      </section>

      <section className="studio-part">
        <h2>Particulars</h2>
        <div className="studio-three">
          <Field label="Published on" htmlFor="wf-pub"><input id="wf-pub" type="date" className="input" value={v.pubDate} onChange={(e) => set("pubDate", e.target.value)} /></Field>
          <Field label="Pages" htmlFor="wf-pages"><input id="wf-pages" type="number" min={1} max={20000} className="input" value={v.pages} onChange={(e) => set("pages", e.target.value)} /></Field>
          <Field label="ISBN" htmlFor="wf-isbn"><input id="wf-isbn" className="input" maxLength={20} value={v.isbn} onChange={(e) => set("isbn", e.target.value)} /></Field>
        </div>
        <CheckSet legend="Genres" options={props.genres} value={v.genres} onChange={(g) => set("genres", g)} max={LIMITS.genres} hint="Up to three." />
        <CheckSet legend="Published through" options={props.platforms} value={v.platforms} onChange={(p) => set("platforms", p)} />
        <LinkList legend="Where to buy or read it" value={v.buyLinks} onChange={(l) => set("buyLinks", l)} max={LIMITS.buyLinks} labelHint="Bookshop.org, your own shop" addWord="Add a place"
          hint="Every place you list is shown equally, in the order you give." />
      </section>

      <section className="studio-part">
        <h2>What readers should know</h2>
        <AiChoice legend="How this was written" value={v.aiUse} onChange={(a) => set("aiUse", a)}
          hint="Each work says this for itself, and it can't launch without it. You can change it later, and a change is kept on record. A false declaration ends in a ban, decided by a person on evidence." />
        <fieldset className="studio-set">
          <legend className="label">Mature</legend>
          <label className="studio-check">
            <input type="checkbox" checked={v.mature} onChange={(e) => set("mature", e.target.checked)} />
            <span>Not for under-18s: explicit sex, graphic violence or similar. Its cover is blurred for signed-out visitors until they confirm.</span>
          </label>
        </fieldset>
        <CheckSet legend="Content notes" options={NOTE_OPTIONS} value={v.contentNotes} onChange={(n) => set("contentNotes", n)}
          hint="Things a reader may want to know first. They're shown only when a reader asks, because a note can itself spoil or distress." />
        <Field label="A note of your own" htmlFor="wf-note" hint="One line, for anything the list doesn't cover.">
          <input id="wf-note" className="input" maxLength={200} value={v.contentNoteText} onChange={(e) => set("contentNoteText", e.target.value)} />
        </Field>
      </section>

      <section className="studio-part studio-finish">
        <div className="studio-actions">
          <button type="submit" className="btn solid" disabled={busy}>{props.id ? "Save" : "Add this work"}</button>
          {props.id && props.launchState === "none" && <Link className="btn" href={`/studio/launch?work=${props.id}`}>Launch it</Link>}
          {props.slug && <Link className="word" href={`/work/${props.slug}`}>See its page</Link>}
        </div>
        <StatusLine status={status} />
        {props.id && props.launchState === "none" && (
          <p className="studio-danger">
            {confirmDelete
              ? <>Delete this for good? <button type="button" className="word" disabled={busy} onClick={() => void remove()}>Yes, delete it</button> <button type="button" className="word" onClick={() => setConfirmDelete(false)}>Keep it</button></>
              : <button type="button" className="word" onClick={() => setConfirmDelete(true)}>Delete this work</button>}
          </p>
        )}
        {props.id && props.launchState !== "none" && <p className="hint">{props.launchState === "scheduled" ? "This has a launch set. To delete it, cancel the launch first." : "This has launched, so it stays. Its details can still be changed."}</p>}
      </section>
    </form>
  );
}
