/**
 * lib/emails/templates.ts
 *
 * The words of every email the scheduled jobs send. Each function returns a
 * subject, html and text, built on the one layout in send.ts. The voice is
 * DESIGN.md's: calm, plain, a number says what it counts.
 *
 * Every email here says how to stop it. Mail to an account points at
 * /settings; the Sunday letter to a bare address carries its own unsubscribe
 * link. The letter is not transactional, so it also carries a postal address
 * (EMAIL_POSTAL_ADDRESS), which US law asks for.
 */

import { appUrl } from "../env";
import { formatDay } from "../ranking/day";
import { count, placeWord, topThreeLine, type DigestLine } from "../cron/pure";
import { layout } from "./send";

export type Mail = { subject: string; html: string; text: string };

const SETTINGS = `${appUrl}/settings`;
const accountFooter = `Author Hunt, authorhunt.com. Choose which emails you get at ${SETTINGS}`;

const abs = (href: string) => (href.startsWith("http") ? href : `${appUrl}${href.startsWith("/") ? "" : "/"}${href}`);

/** To the author, the morning their launch goes on the board. */
export function launchLive(input: { title: string; href: string; day: string }): Mail {
  const mail = layout({
    heading: `${input.title} is live`,
    paragraphs: [
      `Your launch is on the board for ${formatDay(input.day)}. The day runs until midnight Eastern.`,
      "For the first four hours the board is shuffled and shows no counts, so nobody wins on a head start. After that, cheers decide the order.",
      "Readers who follow you have been told. The comments are open, and your own note at the top is the first thing people read.",
    ],
    action: { label: "See your launch", url: abs(input.href) },
    footer: accountFooter,
  });
  return { subject: `${input.title} is live on today's board`, ...mail };
}

/** To the author, once the day has closed and the place is final. */
export function launchClosed(input: { title: string; href: string; day: string; rank: number | null; of: number; cheers: number }): Mail {
  const placed = input.rank !== null
    ? `${input.title} finished ${placeWord(input.rank)} of ${count(input.of, "launch", "launches")} on ${formatDay(input.day)}, with ${count(input.cheers, "cheer")}.`
    : `${input.title} finished its day on ${formatDay(input.day)}, with ${count(input.cheers, "cheer")}.`;
  const top = input.rank !== null ? topThreeLine(input.rank) : "";
  const mail = layout({
    heading: input.rank !== null ? `${input.title} finished ${placeWord(input.rank)}` : `${input.title} has finished its day`,
    paragraphs: [
      placed,
      ...(top ? [top] : []),
      "The launch stays where it is. Readers can still cheer, comment and follow from it, and it counts toward your Momentum.",
    ],
    action: { label: "See the launch", url: abs(input.href) },
    footer: accountFooter,
  });
  return { subject: input.rank !== null ? `${input.title} finished ${placeWord(input.rank)} of ${input.of}` : `${input.title} has finished its day`, ...mail };
}

/** To a reader who asked to be told. One email, and the request is then forgotten. */
export function notifyRequestLive(input: { title: string; authorName: string; href: string; account: boolean }): Mail {
  const mail = layout({
    heading: `${input.title} is live today`,
    paragraphs: [
      `You asked to be told when ${input.title} by ${input.authorName} launched. It is on today's board now.`,
      "A cheer is free and takes one press. It is what moves a launch up the day's board.",
    ],
    action: { label: "See the launch", url: abs(input.href) },
    footer: input.account
      ? accountFooter
      : "Author Hunt, authorhunt.com. You asked for this one email. We have not kept your address for anything else.",
  });
  return { subject: `Live today: ${input.title} by ${input.authorName}`, ...mail };
}

const lineText = (l: DigestLine) => {
  const more = l.times > 1 ? ` (and ${l.times - 1} more like it)` : "";
  return `${l.title}${more}${l.body ? `. ${l.body}` : ""} ${abs(l.href)}`;
};

/** Things a person asked to hear about promptly, as one email per run. */
export function notificationDigest(input: { name: string; lines: DigestLine[] }): Mail {
  const [only] = input.lines;
  if (input.lines.length === 1 && only) {
    const mail = layout({
      heading: only.title,
      paragraphs: [...(only.body ? [only.body] : []), ...(only.times > 1 ? [`And ${only.times - 1} more like it.`] : [])],
      action: { label: "Open it", url: abs(only.href) },
      footer: accountFooter,
    });
    return { subject: only.title, ...mail };
  }
  const mail = layout({
    heading: `${count(input.lines.length, "thing")} since we last wrote`,
    paragraphs: input.lines.map(lineText),
    action: { label: "See them all", url: `${appUrl}/notifications` },
    footer: accountFooter,
  });
  return { subject: `${input.lines.length} new on Author Hunt: ${input.lines[0]?.title ?? ""}`.trim(), ...mail };
}

/** Cheers, followers and updates from followed authors, once an evening. */
export function eveningSummary(input: { name: string; day: string; lines: DigestLine[] }): Mail {
  const mail = layout({
    heading: `Your day on Author Hunt, ${formatDay(input.day, { month: "long", day: "numeric" })}`,
    paragraphs: input.lines.map(lineText),
    action: { label: "See them all", url: `${appUrl}/notifications` },
    footer: `${accountFooter}. This summary is sent at most once a day.`,
  });
  return { subject: `Today on Author Hunt: ${input.lines[0]?.title ?? "your summary"}`, ...mail };
}

export type LetterItem = { title: string; byline: string; tagline: string; href: string; cheers?: number; day?: string };

const itemText = (it: LetterItem, n?: number) => {
  const head = `${n ? `${n}. ` : ""}${it.title}, ${it.byline}`;
  const cheers = it.cheers !== undefined ? ` ${count(it.cheers, "cheer")}.` : "";
  const when = it.day ? ` Launching ${formatDay(it.day)}.` : "";
  return `${head}.${it.tagline ? ` ${it.tagline}` : ""}${cheers}${when} ${abs(it.href)}`;
};

/**
 * The Sunday letter: the week's top ten, what followed authors launched, and
 * what is coming. `unsubscribeUrl` is set for a bare address; an account is
 * pointed at its settings instead.
 */
export function sundayLetter(input: { weekOf: string; top: LetterItem[]; followed: LetterItem[]; soon: LetterItem[]; unsubscribeUrl: string | null }): Mail {
  const paragraphs: string[] = [];
  if (input.followed.length) {
    paragraphs.push("From authors you follow:");
    paragraphs.push(...input.followed.map((it) => itemText(it)));
  }
  if (input.top.length) {
    paragraphs.push(input.top.length >= 10 ? "The week's top ten launches, by cheers:" : "The week's top launches, by cheers:");
    paragraphs.push(...input.top.map((it, i) => itemText(it, i + 1)));
  } else {
    paragraphs.push("No launches closed this week. The board opens again each midnight Eastern.");
  }
  if (input.soon.length) {
    paragraphs.push("Launching in the week ahead:");
    paragraphs.push(...input.soon.map((it) => itemText(it)));
  }
  const postal = process.env.EMAIL_POSTAL_ADDRESS ? ` ${process.env.EMAIL_POSTAL_ADDRESS}.` : "";
  const stop = input.unsubscribeUrl
    ? `You get this because this address subscribed to the Sunday letter. Unsubscribe: ${input.unsubscribeUrl}`
    : `You get this because you follow or have cheered for authors here. Turn it off at ${SETTINGS}`;
  const mail = layout({
    heading: `The Sunday letter, ${formatDay(input.weekOf, { month: "long", day: "numeric" })}`,
    paragraphs,
    action: { label: "See today's board", url: appUrl },
    footer: `Author Hunt, authorhunt.com.${postal} ${stop}`,
  });
  return { subject: `The Sunday letter: ${input.top[0] ? `${input.top[0].title} leads the week` : "the week on Author Hunt"}`, ...mail };
}
