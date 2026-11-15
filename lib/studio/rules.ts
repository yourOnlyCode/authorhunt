/**
 * lib/studio/rules.ts
 *
 * The fixed lists and small rules the studio's forms and its routes share:
 * the three AI declarations and what each means, the content notes, the cover
 * colours, and what a page needs before it can be made public. Pure, so the
 * browser's form and the server's check read the same list and can't drift.
 */

import type { AiUse, WorkKind } from "../db/schema";

/** The plain definitions the terms use (docs/development.md, The AI declaration). */
export const AI_CHOICES: { value: AiUse; label: string; means: string }[] = [
  { value: "none", label: "Written without AI", means: "A person wrote every passage. Spelling and grammar checkers don't count as AI." },
  { value: "assisted", label: "Written with AI assistance", means: "AI drafted, rewrote or translated passages of the text, and a person wrote the rest." },
  { value: "generated", label: "Written by AI", means: "Most of the text was produced by a model." },
];
export const AI_VALUES = ["none", "assisted", "generated"] as const;
export function aiLabel(value: AiUse | null): string {
  return AI_CHOICES.find((c) => c.value === value)?.label ?? "Not declared yet";
}

/** Shown on a launch only when a reader asks (docs/product-structure.md, section 5). */
export const CONTENT_NOTES: { slug: string; label: string }[] = [
  { slug: "death-of-a-parent", label: "Death of a parent" },
  { slug: "death-of-a-child", label: "Death of a child" },
  { slug: "suicide", label: "Suicide" },
  { slug: "self-harm", label: "Self-harm" },
  { slug: "sexual-violence", label: "Sexual violence" },
  { slug: "abuse", label: "Abuse" },
  { slug: "animal-death", label: "Death of an animal" },
  { slug: "body-horror", label: "Body horror" },
  { slug: "drowning", label: "Drowning" },
  { slug: "grief", label: "Grief" },
  { slug: "war", label: "War" },
  { slug: "addiction", label: "Addiction" },
];
export const CONTENT_NOTE_SLUGS = new Set(CONTENT_NOTES.map((n) => n.slug));

/** The cover colours in app/globals.css (--cv-1 to --cv-7), for a work with no cover yet. */
export const COVER_SWATCHES: { value: string; name: string }[] = [
  { value: "#1F3A5C", name: "Prussian blue" },
  { value: "#7A2533", name: "Oxblood" },
  { value: "#24503B", name: "Bottle green" },
  { value: "#4A3A78", name: "Violet" },
  { value: "#B5791A", name: "Ochre" },
  { value: "#26262C", name: "Ink" },
  { value: "#C24A2A", name: "Brick" },
];

export const WORK_KINDS: { value: WorkKind; label: string; form: string }[] = [
  { value: "book", label: "A book", form: "A novel" },
  { value: "short", label: "A short work", form: "A short story" },
  { value: "serial", label: "A serial", form: "A serial" },
  { value: "issue", label: "An issue", form: "Issue 1" },
];

export const UPDATE_KINDS = [
  { value: "news", label: "News" },
  { value: "progress", label: "Progress" },
  { value: "cover", label: "A cover" },
  { value: "event", label: "An event" },
  { value: "excerpt", label: "An excerpt" },
] as const;
export const UPDATE_KIND_VALUES = ["news", "progress", "cover", "event", "excerpt"] as const;

/** How far ahead a launch can be set. */
export const LAUNCH_WINDOW_DAYS = 60;

export const LIMITS = { genres: 3, references: 5, buyLinks: 12, memberLinks: 40, gallery: 8, updateBody: 2000 } as const;

export type ChecklistItem = { key: "portrait" | "bio" | "genre" | "link_or_work" | "declaration"; label: string; done: boolean };

type PageFacts = { portraitUrl: string | null; bio: string; genres: string[]; website: string | null; links: unknown[]; aiUse: AiUse | null };

/** What a page needs before it can be made public (docs/development.md, section 4; AGENTS.md rule 7). */
export function pageChecklist(page: PageFacts, workCount: number): ChecklistItem[] {
  return [
    { key: "portrait", label: "A portrait", done: Boolean(page.portraitUrl) },
    { key: "bio", label: "A few lines about you", done: page.bio.trim().length > 0 },
    { key: "genre", label: "At least one genre", done: page.genres.length > 0 },
    { key: "link_or_work", label: "A link or a work", done: Boolean(page.website) || page.links.length > 0 || workCount > 0 },
    { key: "declaration", label: "How your work is written (the AI declaration)", done: page.aiUse !== null },
  ];
}
export function missingFrom(list: ChecklistItem[]): string[] {
  return list.filter((i) => !i.done).map((i) => i.label);
}
