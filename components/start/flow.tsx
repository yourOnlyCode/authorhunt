"use client";

/**
 * components/start/flow.tsx
 *
 * The guided setup an author goes through to make their page and set their
 * first launch (/start): four steps, one screen each.
 *
 *   1. You            who you are; then what you write, and how
 *   2. Your launch    the piece; then where to get it, your note, its day
 *   3. More           links and the like; can be skipped
 *   4. A last look    what you've made, what's free, and the page itself
 *
 * The first two steps are each two short screens, so no screen asks for
 * much (the owner's call: the first version put fifteen fields on one page).
 * Their bar in the header fills half-way on the first screen and all the
 * way on the second.
 *
 * Each screen saves through the Studio's own routes when you press on, so a
 * tab closed half-way loses nothing and everything made here is an ordinary
 * page, work and launch. The server decides every rule; this only asks.
 * What happened is said beside the buttons, never in a pop-up (DESIGN.md).
 *
 * The day isn't a blank choice. Before opening an author is given the first
 * board with room (lib/studio/days.ts), so early launches gather on opening
 * day and spill to the next only when it is full; "Choose another day" opens
 * the calendar for anyone who wants a later one.
 *
 * The order of saving in step 2 matters: the work is saved, then the page
 * is made public (a public page needs a link or a work), then the launch is
 * set (a launch needs a public page). Before opening, "public" still means
 * hidden from everyone else until the first board (lib/early.ts).
 */

import Link from "next/link";
import { useState } from "react";
import type { AiUse, LinkItem, PageKind, WorkKind } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";
import { AI_PLEDGE_MISSING, COVER_SWATCHES, LIMITS, WORK_KINDS } from "@/lib/studio/rules";
import { trustMeter } from "@/lib/studio/trust-meter";
import { AiChoice, AiPledge, CheckSet, Field, LinkList, NameList, StatusLine } from "@/components/studio/fields";
import { ImageField } from "@/components/studio/image-field";
import { send, type Status } from "@/components/studio/send";
import { FoundingMark } from "@/components/ui/icons";

type PageValues = {
  name: string; handle: string; kind: PageKind; tagline: string; bio: string; portraitUrl: string | null;
  city: string; region: string; country: string; website: string; links: LinkItem[]; genres: string[];
  readersOf: string[]; inspiredBy: string[]; mature: boolean; aiUse: AiUse | null; supportUrl: string;
};
type WorkValues = {
  id: string | null; slug: string | null; kind: WorkKind; form: string; title: string; tagline: string; description: string; excerpt: string;
  coverUrl: string | null; coverColor: string; pages: number | null; words: number | null; buyLinks: LinkItem[]; genres: string[]; mature: boolean;
};
type LaunchValues = { id: string | null; day: string | null; note: string; status: string | null };

export type StartData = {
  page: PageValues | null;
  pageExists: boolean;
  published: boolean;
  viewerName: string;
  work: Omit<WorkValues, "id" | "slug"> & { id: string; slug: string } | null;
  launch: { id: string; day: string; note: string; status: string } | null;
  genres: { slug: string; name: string }[];
  knownNames: string[];
  days: { day: string; count: number }[];
  defaultDay: string | null;
  /** How many launches a board takes before opening, or null once the site is open. */
  room: number | null;
  appHost: string;
  early: boolean;
  toolsUntil: string;
  trialDays: number;
  founding: boolean;
};

const STEPS = ["You", "Your first launch", "More about you", "A last look"] as const;
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

export function StartFlow({ data }: { data: StartData }) {
  // Someone coming back lands where they left off.
  const [step, setStep] = useState(() => (!data.pageExists ? 0 : !data.launch ? 1 : 3));
  /** Which half of a two-screen step is showing: 0 or 1. */
  const [part, setPart] = useState(0);
  const [pickDay, setPickDay] = useState(false);
  /** Every line of the no-AI pledge is ticked. Asked each time a launch is first set; one already set has it on record. */
  const [pledged, setPledged] = useState(false);
  /** The author would rather show no sample and send readers straight to the link. */
  const [noSample, setNoSample] = useState(Boolean(data.launch) && !data.work?.excerpt);
  const [page, setPage] = useState<PageValues>(data.page ?? {
    name: data.viewerName, handle: slugify(data.viewerName), kind: "author", tagline: "", bio: "", portraitUrl: null, city: "", region: "", country: "",
    website: "", links: [], genres: [], readersOf: [], inspiredBy: [], mature: false, aiUse: null, supportUrl: "",
  });
  const [pageExists, setPageExists] = useState(data.pageExists);
  const [published, setPublished] = useState(data.published);
  const [handleTouched, setHandleTouched] = useState(data.pageExists);
  const [work, setWork] = useState<WorkValues>(data.work ?? {
    id: null, slug: null, kind: "short", form: "", title: "", tagline: "", description: "", excerpt: "", coverUrl: null, coverColor: COVER_SWATCHES[0]!.value,
    pages: null, words: null, buyLinks: [], genres: [], mature: false,
  });
  const [unit, setUnit] = useState<"words" | "pages">(data.work?.pages && !data.work.words ? "pages" : "words");
  const [launch, setLaunch] = useState<LaunchValues>(data.launch ?? { id: null, day: data.defaultDay, note: "", status: null });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const setP = <K extends keyof PageValues>(k: K, v: PageValues[K]) => setPage((old) => ({ ...old, [k]: v }));
  const setW = <K extends keyof WorkValues>(k: K, v: WorkValues[K]) => setWork((old) => ({ ...old, [k]: v }));
  const length = unit === "words" ? work.words : work.pages;
  const live = launch.status !== null && launch.status !== "scheduled";

  function go(to: number, half = 0) { setStatus(null); setStep(to); setPart(half); window.scrollTo({ top: 0 }); }
  const bad = (text: string) => { setStatus({ tone: "bad", text }); return false; };

  async function savePage(publish: boolean): Promise<boolean> {
    const res = await send<{ author: { handle: string; publishedAt: string | null } }>("PUT", "/api/studio/page", { ...page, publish });
    // A 422 means "saved, but not public yet": the page itself is fine.
    if (!res.ok && !res.data?.author) return bad(res.error);
    setPageExists(true); setHandleTouched(true);
    if (res.data?.author?.publishedAt) setPublished(true);
    if (!res.ok && publish) return bad(res.error);
    return true;
  }

  async function nextFromYou() {
    if (part === 0) {
      if (!page.name.trim()) return bad("Your page needs a name.");
      if (!page.bio.trim()) return bad("Add a few lines about you. Two sentences is plenty.");
    } else {
      if (page.genres.length === 0) return bad("Choose at least one genre, so readers of it can find you.");
      if (!page.aiUse) return bad("Say how your work is written. No page goes public without it.");
    }
    setBusy(true); setStatus(null);
    const ok = await savePage(false);
    setBusy(false);
    if (ok) { if (part === 0) go(0, 1); else go(1); }
  }

  async function nextFromLaunch() {
    if (!work.title.trim()) return bad("Your launch needs a title.");
    if (part === 1 && !launch.day) return bad("Choose the day it goes on the board.");
    const linked = work.buyLinks.some((l) => l.url.trim());
    if (part === 1 && noSample && !linked) return bad("With no sample, readers need somewhere to go. Add a place to read it or get it.");
    if (part === 1 && !launch.id && !pledged) return bad(AI_PLEDGE_MISSING);
    setBusy(true); setStatus(null);
    try {
      // 1. the work. Its declaration is the one made for the page: one person, one way of writing.
      const body = {
        kind: work.kind, form: work.form || WORK_KINDS.find((k) => k.value === work.kind)!.form, title: work.title, tagline: work.tagline, description: work.description, excerpt: noSample ? "" : work.excerpt,
        coverUrl: work.coverUrl, coverColor: work.coverColor, pages: unit === "pages" ? length : null, words: unit === "words" ? length : null,
        buyLinks: work.buyLinks.filter((l) => l.url.trim()), genres: work.genres, mature: work.mature, aiUse: page.aiUse,
      };
      const saved = work.id
        ? await send<{ work: { id: string; slug: string } }>("PUT", `/api/studio/works/${work.id}`, body)
        : await send<{ work: { id: string; slug: string } }>("POST", "/api/studio/works", body);
      if (!saved.ok) return bad(saved.error);
      const { id, slug } = saved.data.work;
      setWork((old) => ({ ...old, id, slug }));
      if (part === 0) { go(1, 1); return true; }
      // 2. the page goes public, now that it has a work.
      if (!published && !(await savePage(true))) return false;
      // 3. the launch, on its day, with the author's note.
      if (!live) {
        const set = launch.id
          ? await send<{ launch: { id: string; status: string } }>("PATCH", `/api/studio/launches/${launch.id}`, { day: launch.day, note: launch.note })
          : await send<{ launch: { id: string; status: string } }>("POST", "/api/studio/launches", { kind: "work", workId: id, day: launch.day, note: launch.note, pledge: pledged });
        if (!set.ok) return bad(set.error);
        setLaunch((old) => ({ ...old, id: set.data.launch.id, status: set.data.launch.status }));
      }
      go(2);
      return true;
    } finally { setBusy(false); }
  }

  async function nextFromMore() {
    setBusy(true); setStatus(null);
    const ok = await savePage(false);
    setBusy(false);
    if (ok) go(3);
  }

  // Trust with readers: what the page and the launch have so far, and the next thing worth adding (trust-meter.ts).
  const trust = trustMeter({
    portraitUrl: page.portraitUrl, bio: page.bio, tagline: page.tagline, genres: page.genres, city: page.city, aiUse: page.aiUse,
    website: page.website, links: page.links, readersOf: page.readersOf,
    work: work.title.trim() || work.id ? { hasCover: Boolean(work.coverUrl), description: work.description, excerpt: noSample ? "" : work.excerpt, buyLinks: work.buyLinks, note: launch.note } : null,
  });

  const genreNames = (slugs: string[]) => slugs.map((s) => data.genres.find((g) => g.slug === s)?.name ?? s).join(", ");

  return (
    <div className="start-flow">
      <header className="start-head">
        <p className="sc">Set up your first launch</p>
        <ol className="start-steps" aria-label="Steps">
          {STEPS.map((name, i) => {
            const reachable = i <= step || (i === 1 && pageExists) || (i >= 2 && Boolean(launch.id));
            return (
              <li key={name} className={i === step ? "on" : i < step ? "past" : ""} aria-current={i === step ? "step" : undefined}
                style={{ "--p": i < step ? 1 : i > step ? 0 : i <= 1 && part === 0 ? 0.5 : 1 } as React.CSSProperties}>
                <button type="button" disabled={!reachable || busy} onClick={() => go(i)}><i /><span className="n">{i + 1}</span><b>{name}</b></button>
              </li>
            );
          })}
        </ol>
        <div className="start-trust">
          <p className="label" id="trust-l">Trust with your readers</p>
          <div className="meter" role="meter" aria-labelledby="trust-l" aria-valuemin={0} aria-valuemax={100} aria-valuenow={trust.score} aria-valuetext={`${trust.score} out of 100`}><i style={{ "--p": trust.score / 100 } as React.CSSProperties} /></div>
          <p className="say"><b>{trust.score}</b><span>/100</span>{trust.next && step < 3 && <> · Next: {trust.next.label.toLowerCase()}, <b>+{trust.next.points}</b></>}</p>
        </div>
      </header>

      {step === 0 && (
        <section className="start-step" aria-labelledby="start-h">
          <h1 id="start-h">{part === 0 ? "First, you." : "What you write."}</h1>
          <p className="start-lede">{part === 0
            ? <>This becomes your author page: the one place on Author Hunt that is yours, and stays. It&apos;s free, and you can change any of it later.</>
            : <>How readers will find you, and the one thing every author here says about their work.</>}</p>
          {part === 0 ? (
          <div className="studio-form">
            <Field label="Your name, as it is on your work" htmlFor="st-name">
              <input id="st-name" className="input" value={page.name} maxLength={80} autoComplete="name"
                onChange={(e) => { const name = e.target.value; setPage((old) => ({ ...old, name, handle: handleTouched ? old.handle : slugify(name) })); }} />
            </Field>
            <Field label="Your page's address" htmlFor="st-handle" hint={<>{data.appHost}/author/<b>{page.handle || "your-name"}</b>. Lowercase letters, digits and hyphens.</>}>
              <input id="st-handle" className="input" value={page.handle} maxLength={32} autoCapitalize="none" spellCheck={false} disabled={published}
                onChange={(e) => { setHandleTouched(true); setP("handle", e.target.value.toLowerCase()); }} />
            </Field>
            <ImageField kind="portrait" label="A portrait" value={page.portraitUrl} onChange={(url) => setP("portraitUrl", url)} alt={`Portrait of ${page.name || "the author"}`} />
            {!page.portraitUrl && <p className="hint start-why">Not required, but nothing does more for a reader&apos;s trust than a face: it&apos;s a quarter of the meter above. A photograph, a drawing, anything you&apos;d put on a book jacket. Without one your page shows your initials.</p>}
            <Field label="In a line" htmlFor="st-tag" hint="What you write, in a sentence. It sits under your name.">
              <input id="st-tag" className="input" value={page.tagline} maxLength={140} placeholder="Novels about maps, weather and inheritance." onChange={(e) => setP("tagline", e.target.value)} />
            </Field>
            <Field label="About you" htmlFor="st-bio" hint="A few lines. Two sentences is plenty to start.">
              <textarea id="st-bio" className="textarea" rows={5} value={page.bio} maxLength={4000} onChange={(e) => setP("bio", e.target.value)} />
            </Field>
          </div>
          ) : (
          <div className="studio-form">
            <CheckSet legend="What you write" options={data.genres.map((g) => ({ slug: g.slug, name: g.name }))} value={page.genres} onChange={(v) => setP("genres", v)} max={LIMITS.genres} hint={`Up to ${LIMITS.genres}. Readers filter by these.`} />
            <div className="start-pair">
              <Field label="City" htmlFor="st-city" hint="Optional. Readers can look for authors near them.">
                <input id="st-city" className="input" value={page.city} maxLength={80} onChange={(e) => setP("city", e.target.value)} />
              </Field>
              <Field label="Country" htmlFor="st-country">
                <input id="st-country" className="input" value={page.country} maxLength={80} autoComplete="country-name" onChange={(e) => setP("country", e.target.value)} />
              </Field>
            </div>
            <AiChoice legend="How your work is written" value={page.aiUse} onChange={(v) => setP("aiUse", v)} hint="Every author says this once, and it shows on your page." />
          </div>
          )}
          <div className="start-next">
            <StatusLine status={status} />
            {part === 1 && <button type="button" className="word" disabled={busy} onClick={() => go(0, 0)}>Back</button>}
            <button type="button" className="btn solid" disabled={busy} onClick={nextFromYou}>{busy ? "Saving…" : part === 0 ? "Continue" : "Save and go on"}</button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="start-step" aria-labelledby="start-h">
          <h1 id="start-h">{part === 0 ? "Your first launch." : "Where, and when."}</h1>
          <p className="start-lede">{part === 0
            ? <>One finished piece of writing, of any size. A poem gets a row like a novel.</>
            : <>A taste of <i>{work.title || "it"}</i>, where readers can get the rest, and the day it goes on the board.</>}</p>
          {part === 0 ? (
          <div className="studio-form">
            <Field label="Title" htmlFor="st-title">
              <input id="st-title" className="input" value={work.title} maxLength={160} onChange={(e) => setW("title", e.target.value)} />
            </Field>
            <div className="start-pair">
              <Field label="What kind of thing it is" htmlFor="st-kind">
                <select id="st-kind" className="select" value={work.kind} onChange={(e) => setW("kind", e.target.value as WorkKind)}>
                  {WORK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </Field>
              <Field label="What to call it" htmlFor="st-form" hint={'The words readers see: "A poem", "A novel", "Fan fiction".'}>
                <input id="st-form" className="input" value={work.form} maxLength={40} placeholder={WORK_KINDS.find((k) => k.value === work.kind)!.form} onChange={(e) => setW("form", e.target.value)} />
              </Field>
            </div>
            <CheckSet legend="Its genre" options={data.genres} value={work.genres} onChange={(v) => setW("genres", v)} max={LIMITS.genres} hint={`Up to ${LIMITS.genres}.`} />
            <Field label="How long it is" htmlFor="st-len" hint="Optional. Roughly is fine.">
              <div className="start-length">
                <input id="st-len" className="input" type="number" inputMode="numeric" min={1} value={length ?? ""} placeholder={unit === "words" ? "1200" : "320"}
                  onChange={(e) => { const n = e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null; setWork((old) => (unit === "words" ? { ...old, words: n } : { ...old, pages: n })); }} />
                <select className="select" aria-label="Measured in" value={unit}
                  onChange={(e) => { const to = e.target.value as "words" | "pages"; setWork((old) => (to === "words" ? { ...old, words: length, pages: null } : { ...old, pages: length, words: null })); setUnit(to); }}>
                  <option value="words">words</option><option value="pages">pages</option>
                </select>
              </div>
            </Field>
            <ImageField kind="cover" label="A cover" value={work.coverUrl} onChange={(url) => setW("coverUrl", url)} alt={`Cover of ${work.title || "the work"}`} />
            {!work.coverUrl && (
              <fieldset className="studio-set">
                <legend className="label">No cover? Choose a colour</legend>
                <p className="hint">A work with no cover shows its title on a plain cover in this colour.</p>
                <div className="start-swatches">
                  {COVER_SWATCHES.map((c) => (
                    <label key={c.value} title={c.name}><input type="radio" name="st-color" checked={work.coverColor === c.value} onChange={() => setW("coverColor", c.value)} /><span style={{ background: c.value }} /><i className="visually-hidden">{c.name}</i></label>
                  ))}
                </div>
              </fieldset>
            )}
            <Field label="In a line" htmlFor="st-wtag" hint="What a reader sees beside the title on the board.">
              <input id="st-wtag" className="input" value={work.tagline} maxLength={160} placeholder="A mapmaker's daughter inherits an atlas that redraws itself each winter." onChange={(e) => setW("tagline", e.target.value)} />
            </Field>
            <Field label="About it" htmlFor="st-desc" hint="What it is, as you'd put it on the back of the book.">
              <textarea id="st-desc" className="textarea" rows={6} value={work.description} maxLength={6000} onChange={(e) => setW("description", e.target.value)} />
            </Field>
          </div>
          ) : (
          <div className="studio-form">
            <fieldset className="studio-set">
              <legend className="label">A sample for readers</legend>
              <p className="hint">The opening, a poem from the set, a page you&apos;re proud of. A reader who has tasted the writing is far likelier to follow the link, so even a few lines help. It&apos;s shown on the launch page as &ldquo;An excerpt&rdquo;.</p>
              {!noSample && <textarea className="textarea" rows={8} aria-label="A sample of the work" value={work.excerpt} maxLength={8000} placeholder="Paste a passage here." onChange={(e) => setW("excerpt", e.target.value)} />}
              <label className="studio-check"><input type="checkbox" checked={noSample} onChange={(e) => setNoSample(e.target.checked)} /><span>No sample. I&apos;d rather readers go straight to where the work is.</span></label>
            </fieldset>
            <LinkList legend="Where to read it or get it" value={work.buyLinks} onChange={(v) => setW("buyLinks", v)} max={LIMITS.buyLinks} labelHint="Bookshop.org" addWord="Add a place"
              hint="A bookshop, a magazine, your own site, Archive of Our Own: wherever it lives. These belong to this launch: its page has a button that takes readers there." />
            <label className="studio-check"><input type="checkbox" checked={work.mature} onChange={(e) => setW("mature", e.target.checked)} /><span>This is for adults only (explicit sex or graphic violence). It gets a Mature mark.</span></label>
            <Field label="Your note to readers" htmlFor="st-note" hint="Why you wrote it, what you'd like them to know. It's shown first on the launch page, in your name.">
              <textarea id="st-note" className="textarea" rows={5} value={launch.note} maxLength={2000} onChange={(e) => setLaunch((old) => ({ ...old, note: e.target.value }))} />
            </Field>
            <fieldset className="studio-set" disabled={live}>
              <legend className="label">The day it goes on the board</legend>
              {launch.day && (
                <p className="start-day">
                  <b>{dayLabel(launch.day, { weekday: "long", month: "long", day: "numeric" })}</b>
                  {data.early && launch.day === data.days[0]?.day ? ", the first board." : "."}
                  {!pickDay && !live && <> <button type="button" className="word" onClick={() => setPickDay(true)}>Choose another day</button></>}
                </p>
              )}
              <p className="hint">{data.early
                ? "Early launches gather on the first board, so it opens full. When a board fills, the next author is given the day after."
                : "Each day shows how many launches it has so far."} Days run midnight to midnight, New York time.</p>
              {(pickDay || !launch.day) && (
                <div className="start-days" role="radiogroup" aria-label="Launch day">
                  {data.days.map((d, n) => {
                    const full = data.room !== null && d.count >= data.room && d.day !== data.launch?.day;
                    return (
                      <label key={d.day} className={`${launch.day === d.day ? "on" : ""} ${full ? "full" : ""}`}>
                        <input type="radio" name="st-day" disabled={full} checked={launch.day === d.day} onChange={() => setLaunch((old) => ({ ...old, day: d.day }))} />
                        <span className="wd">{dayLabel(d.day, { weekday: "short" })}</span>
                        <span className="dn">{dayLabel(d.day, { month: "short", day: "numeric" })}</span>
                        <span className="ct">{full ? "full" : <>{n === 0 && data.early ? "Opening day · " : ""}{d.count === 0 ? "none yet" : d.count === 1 ? "1 launch" : `${d.count} launches`}</>}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
            {!launch.id && <AiPledge onChange={setPledged} />}
          </div>
          )}
          <div className="start-next">
            <StatusLine status={status} />
            <button type="button" className="word" disabled={busy} onClick={() => (part === 1 ? go(1, 0) : go(0, 1))}>Back</button>
            <button type="button" className="btn solid" disabled={busy} onClick={nextFromLaunch}>{busy ? "Saving…" : part === 0 ? "Continue" : "Save and go on"}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="start-step" aria-labelledby="start-h">
          <h1 id="start-h">A little more, if you like.</h1>
          <p className="start-lede">None of this is needed, and all of it can be added later in the Studio. It helps readers who liked your launch find the rest of you.</p>
          <div className="studio-form">
            <Field label="Your website" htmlFor="st-site" hint="Your own site, if you have one.">
              <input id="st-site" className="input" inputMode="url" value={page.website} maxLength={300} placeholder="https://" onChange={(e) => setP("website", e.target.value)} />
            </Field>
            <LinkList legend="Where else to find you" value={page.links} onChange={(v) => setP("links", v)} max={5} labelHint="Newsletter" addWord="Add a link"
              hint="A newsletter, Instagram, Bluesky, a contact page. To be reachable without showing an email address, link a contact page. A way to give you money isn't a link here: that's the Support link, one of the member tools." />
            <NameList legend="For readers of" value={page.readersOf} onChange={(v) => setP("readersOf", v)} known={data.knownNames} max={LIMITS.references}
              hint="Well-known writers whose readers might like your work. Readers search by these." />
            <NameList legend="Inspired by" value={page.inspiredBy} onChange={(v) => setP("inspiredBy", v)} known={data.knownNames} max={LIMITS.references} />
          </div>
          <div className="start-next">
            <StatusLine status={status} />
            <button type="button" className="word" disabled={busy} onClick={() => go(1, 1)}>Back</button>
            <button type="button" className="word" disabled={busy} onClick={() => go(3)}>Skip for now</button>
            <button type="button" className="btn solid" disabled={busy} onClick={nextFromMore}>{busy ? "Saving…" : "Save and go on"}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="start-step" aria-labelledby="start-h">
          <h1 id="start-h">{launch.day ? "You're set." : "A last look."}</h1>
          <p className="start-lede">
            {launch.day
              ? <><i>{work.title}</i> goes on the board on <b>{dayLabel(launch.day, { weekday: "long", month: "long", day: "numeric" })}</b>.{data.early ? " Until then, only you can see your pages." : ""}</>
              : "Your page is saved. Set your first launch whenever you're ready."}
          </p>

          <div className="start-review">
            <article>
              <header><h2>Your launch</h2><button type="button" className="word" onClick={() => go(1)}>Change</button></header>
              <div className="start-row">
                <span className="start-cover" style={{ background: work.coverUrl ? undefined : work.coverColor }}>{work.coverUrl ? <img src={work.coverUrl} alt="" /> : work.title}</span>
                <div>
                  <p className="t">{work.title || "No title yet"}</p>
                  <p className="by">{work.form || WORK_KINDS.find((k) => k.value === work.kind)!.form} · by {page.name}{data.founding && <FoundingMark />}</p>
                  {work.tagline && <p>{work.tagline}</p>}
                  <p className="facts">{[genreNames(work.genres), length ? `${length.toLocaleString("en-US")} ${unit}` : null, work.excerpt.trim() && !noSample ? "a sample" : null, work.buyLinks.length ? `${work.buyLinks.length} ${work.buyLinks.length === 1 ? "place" : "places"} to get it` : "no link to it yet"].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {work.slug && <p className="start-see"><Link className="btn" href={`/work/${work.slug}`} target="_blank">See the launch page as readers will</Link></p>}
            </article>

            <article>
              <header><h2>Your page</h2><button type="button" className="word" onClick={() => go(0)}>Change</button></header>
              <p className="t">{page.name}{data.founding && <FoundingMark />}</p>
              {page.tagline && <p>{page.tagline}</p>}
              <p className="facts">{[genreNames(page.genres), [page.city, page.country].filter(Boolean).join(", ") || null, page.links.length + (page.website ? 1 : 0) ? `${page.links.length + (page.website ? 1 : 0)} links` : null].filter(Boolean).join(" · ")}</p>
              <p className="start-see"><Link className="word" href={`/author/${page.handle}`} target="_blank">See your page</Link> · <button type="button" className="word" onClick={() => go(2)}>Add links</button></p>
            </article>

            {trust.score < 100 && (
              <article className="start-trust-list">
                <h2>Build trust with your readers: {trust.score} of 100</h2>
                <p>None of this is required. Each thing you add tells a reader a real person is behind the work.</p>
                <ul>
                  {trust.items.filter((i) => !i.done).sort((a, b) => b.points - a.points).map((i) => (
                    <li key={i.key}><button type="button" className="word" onClick={() => go(i.step, i.part)}>{i.label}</button><span>+{i.points}</span></li>
                  ))}
                </ul>
              </article>
            )}

            {data.founding && (
              <article className="start-founding">
                <h2><FoundingMark />Founding author</h2>
                <p>You made your page before Author Hunt opened. This mark sits beside your name for good.</p>
              </article>
            )}

            <article>
              <h2>What&apos;s free, and what comes with it</h2>
              <p>Your page and every launch are free, for good. Until <b>{data.toolsUntil}</b> you also have the member tools, with no card asked for: a Support link for readers who want to give, emailing your followers, and full analytics.</p>
              <p className="facts">After that the tools are $3.99 a month if you want to keep them. If you don&apos;t, they switch off and your Support link is hidden; your page, your launches and your rank stay exactly as they are. Nothing is ever charged without a card you add yourself.</p>
            </article>
          </div>

          <div className="start-next">
            <StatusLine status={status} />
            <Link className="btn solid" href="/studio">Go to your Studio</Link>
          </div>
        </section>
      )}
    </div>
  );
}
