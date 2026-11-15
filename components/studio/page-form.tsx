"use client";

/**
 * components/studio/page-form.tsx
 *
 * The form an author makes and changes their page with. Making a page is
 * free. Two fields are member tools (the Support link, and more than five
 * links): a free author sees them described with a link to the member tools,
 * never a locked page, and the server decides either way. The AI declaration
 * is asked here because no page goes public without it (AGENTS.md rule 7).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AiUse, LinkItem, PageKind } from "@/lib/db/schema";
import type { ChecklistItem } from "@/lib/studio/rules";
import { slugify } from "@/lib/slug";
import { AiChoice, CheckSet, Field, LinkList, NameList, StatusLine } from "./fields";
import { ImageField } from "./image-field";
import { send, type Status } from "./send";

export type PageFormValues = {
  name: string; handle: string; kind: PageKind; tagline: string; bio: string; portraitUrl: string | null;
  city: string; region: string; country: string; website: string; links: LinkItem[]; genres: string[];
  readersOf: string[]; inspiredBy: string[]; mature: boolean; aiUse: AiUse | null; supportUrl: string;
};

type Props = {
  initial: PageFormValues;
  exists: boolean;
  published: boolean;
  verified: boolean;
  savedWebsite: string | null;
  member: boolean;
  linkLimit: number;
  appHost: string;
  appUrl: string;
  genres: { slug: string; name: string }[];
  knownNames: string[];
  checklist: ChecklistItem[];
};

type Saved = { author: { handle: string; publishedAt: string | null; website: string | null; siteVerifiedAt: string | null }; checklist: ChecklistItem[]; created?: boolean };

export function PageForm(props: Props) {
  const router = useRouter();
  const [v, setV] = useState<PageFormValues>(props.initial);
  const [exists, setExists] = useState(props.exists);
  const [published, setPublished] = useState(props.published);
  const [verified, setVerified] = useState(props.verified);
  const [savedWebsite, setSavedWebsite] = useState(props.savedWebsite);
  const [checklist, setChecklist] = useState(props.checklist);
  const [handleTouched, setHandleTouched] = useState(props.exists);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [verifyStatus, setVerifyStatus] = useState<Status>(null);
  const set = <K extends keyof PageFormValues>(key: K, value: PageFormValues[K]) => setV((old) => ({ ...old, [key]: value }));
  const missing = checklist.filter((c) => !c.done);
  const pageAddress = `${props.appUrl}/author/${v.handle}`;

  async function save(publish: boolean) {
    setBusy(true);
    setStatus(null);
    const res = await send<Saved>("PUT", "/api/studio/page", { ...v, publish });
    setBusy(false);
    const data = res.data;
    if (data?.author) {
      setExists(true);
      setHandleTouched(true);
      setPublished(Boolean(data.author.publishedAt));
      setVerified(Boolean(data.author.siteVerifiedAt));
      setSavedWebsite(data.author.website);
      if (data.checklist) setChecklist(data.checklist);
      router.refresh();
    }
    if (!res.ok) { setStatus({ tone: "bad", text: res.error }); return; }
    setStatus({ tone: "ok", text: publish && data?.author.publishedAt ? "Saved. Your page is public." : res.data.created ? "Your page is made. It stays a draft until you make it public." : "Saved." });
  }

  async function verify() {
    setVerifyStatus({ tone: "ok", text: "Reading your site…" });
    const res = await send<{ verified: boolean }>("POST", "/api/studio/verify-site");
    if (res.ok) { setVerified(true); setVerifyStatus({ tone: "ok", text: "Found it. Your site is verified." }); router.refresh(); }
    else setVerifyStatus({ tone: "bad", text: res.error });
  }

  return (
    <form className="stack studio-form" onSubmit={(e) => { e.preventDefault(); void save(false); }}>
      <section className="studio-part">
        <h2>Who you are</h2>
        <CheckLine legend="This page is for">
          {(["author", "publication"] as const).map((k) => (
            <label key={k} className="studio-radio">
              <input type="radio" name="kind" checked={v.kind === k} onChange={() => set("kind", k)} />
              <span>{k === "author" ? "An author" : "A publication: a magazine, a journal or a small press"}</span>
            </label>
          ))}
        </CheckLine>
        <Field label="Name" htmlFor="pf-name" hint="A pen name is fine. Another living author's name is not.">
          <input id="pf-name" className="input" required maxLength={80} value={v.name}
            onChange={(e) => { const name = e.target.value; setV((old) => ({ ...old, name, handle: handleTouched ? old.handle : slugify(name).slice(0, 32) })); }} />
        </Field>
        <Field label="Handle" htmlFor="pf-handle"
          hint={published ? `Your page is public at ${props.appHost}/${v.handle}, so its handle is fixed.` : `Your short link will be ${props.appHost}/${v.handle || "your-handle"}. Lowercase letters, digits and hyphens. It's fixed once the page is public.`}>
          <input id="pf-handle" className="input" required maxLength={32} value={v.handle} disabled={published} autoCapitalize="none" spellCheck={false}
            onChange={(e) => { setHandleTouched(true); set("handle", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} />
        </Field>
        <Field label="In a line" htmlFor="pf-tagline" hint="What you write, said plainly.">
          <input id="pf-tagline" className="input" maxLength={140} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <ImageField kind="portrait" label="Portrait" value={v.portraitUrl} onChange={(url) => set("portraitUrl", url)} alt={`Portrait of ${v.name || "the author"}`} />
        <Field label="About you" htmlFor="pf-bio" hint="A few lines or a few paragraphs. Leave an empty line between paragraphs.">
          <textarea id="pf-bio" className="textarea" maxLength={4000} rows={7} value={v.bio} onChange={(e) => set("bio", e.target.value)} />
        </Field>
      </section>

      <section className="studio-part">
        <h2>Where readers find you</h2>
        <CheckSet legend="Genres" options={props.genres} value={v.genres} onChange={(g) => set("genres", g)} max={3} hint="Up to three." />
        <NameList legend="For readers of" value={v.readersOf} onChange={(n) => set("readersOf", n)} known={props.knownNames} max={5}
          hint="Well-known writers whose readers would like your work. Up to five. Choose from the list or type a name." />
        <NameList legend="Inspired by" value={v.inspiredBy} onChange={(n) => set("inspiredBy", n)} known={props.knownNames} max={5}
          hint="Writers whose work shaped yours. Up to five." />
        <div className="studio-three">
          <Field label="City" htmlFor="pf-city"><input id="pf-city" className="input" maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="State or region" htmlFor="pf-region"><input id="pf-region" className="input" maxLength={80} value={v.region} onChange={(e) => set("region", e.target.value)} /></Field>
          <Field label="Country" htmlFor="pf-country"><input id="pf-country" className="input" maxLength={80} value={v.country} onChange={(e) => set("country", e.target.value)} /></Field>
        </div>
      </section>

      <section className="studio-part">
        <h2>Links</h2>
        <Field label="Your website" htmlFor="pf-website" hint="Your own site, if you have one. Bookshops, newsletters and profiles go below.">
          <input id="pf-website" className="input" inputMode="url" placeholder="https://" maxLength={300} value={v.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <div className="notice studio-verify">
          <p className="label">{verified ? "Site verified" : "Verify your site"}</p>
          {verified ? (
            <p>Your site links back to your page, so we know the page is yours and the link to your site is a followed one.</p>
          ) : (
            <>
              <p>A two-way link shows the page is yours. Put a link to <b className="studio-break">{pageAddress}</b> (or your badge from the share kit) anywhere on the page at your website&rsquo;s address, then have us look for it. Once it&rsquo;s found, the link from your page to your site is a followed link. This is free and has nothing to do with membership.</p>
              {exists && savedWebsite ? (
                <p><button type="button" className="btn" onClick={() => void verify()}>Check my site</button></p>
              ) : (
                <p className="hint">Save your page with your website first.</p>
              )}
            </>
          )}
          <StatusLine status={verifyStatus} />
        </div>
        <LinkList legend="Other links" value={v.links} onChange={(l) => set("links", l)} max={props.linkLimit} labelHint="Newsletter, Bookshop, Instagram"
          hint={props.member
            ? "Wherever you sell and write. No store is favoured."
            : <>A page has {props.linkLimit} links. More than that is a member tool. <Link className="word" href="/pricing">See member tools</Link></>} />
        {props.member ? (
          <Field label="Support link" htmlFor="pf-support"
            hint="A Support button on your page that opens your own Ko-fi, Buy Me a Coffee, PayPal, Patreon, Venmo, Cash App, Liberapay, GitHub Sponsors or Stripe payment link in a new tab. Author Hunt handles no money and takes no part of it.">
            <input id="pf-support" className="input" inputMode="url" placeholder="https://ko-fi.com/you" maxLength={300} value={v.supportUrl} onChange={(e) => set("supportUrl", e.target.value)} />
          </Field>
        ) : (
          <div className="studio-quiet">
            <p className="label">Support link</p>
            <p>A Support button that opens your own Ko-fi, PayPal or similar is a member tool. <Link className="word" href="/pricing">See member tools</Link></p>
          </div>
        )}
      </section>

      <section className="studio-part">
        <h2>What readers should know</h2>
        <AiChoice legend="How your work is written" value={v.aiUse} onChange={(a) => set("aiUse", a)}
          hint="Every page says this, and it's shown under Particulars. Your page can't be made public without it. You can change it later, and a change is kept on record. A false declaration ends in a ban, decided by a person on evidence." />
        <CheckLine legend="Mature">
          <label className="studio-check">
            <input type="checkbox" checked={v.mature} onChange={(e) => set("mature", e.target.checked)} />
            <span>My work is not for under-18s: explicit sex, graphic violence or similar. Signed-out visitors see it blurred until they confirm.</span>
          </label>
        </CheckLine>
      </section>

      <section className="studio-part studio-finish">
        {!published && (
          <div className="notice">
            <p className="label">Before your page can be public</p>
            <ul className="studio-checklist">
              {checklist.map((c) => <li key={c.key} className={c.done ? "done" : ""}><span aria-hidden="true">{c.done ? "✓" : "–"}</span> {c.label}{c.done ? "" : " (still needed)"}</li>)}
            </ul>
            <p className="hint">This list is as of your last save.</p>
          </div>
        )}
        <div className="studio-actions">
          <button type="submit" className={`btn ${published ? "solid" : ""}`} disabled={busy}>{exists ? "Save" : "Make my page"}</button>
          {!published && exists && <button type="button" className="btn solid" disabled={busy} onClick={() => void save(true)}>Save and make my page public</button>}
          {published && <Link className="word" href={`/author/${v.handle}`}>See your page</Link>}
        </div>
        <StatusLine status={status} />
        {!published && exists && missing.length === 0 && <p className="hint">Everything is in place. Making your page public is free.</p>}
      </section>
    </form>
  );
}

function CheckLine({ legend, children }: { legend: string; children: React.ReactNode }) {
  return <fieldset className="studio-set"><legend className="label">{legend}</legend>{children}</fieldset>;
}
