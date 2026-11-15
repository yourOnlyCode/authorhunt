/**
 * components/comments/text.tsx
 *
 * A comment's body is plain text. It is drawn with its line breaks, with web
 * addresses made into links (rel "ugc nofollow", so a comment can never pass
 * on the site's standing) and with an @handle linked when it names a real
 * page. Nothing a reader typed is ever treated as markup.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { relFor, safeUrl } from "@/lib/seo/links";

const TOKEN = /(https?:\/\/[^\s<>"]+|@[a-z0-9][a-z0-9-]{1,30}[a-z0-9])/gi;
const USER_TEXT_REL = relFor("user_text", { siteVerified: false });

/** The handles a body mentions, lowercased, for looking up which of them exist. */
export function mentionedHandles(body: string): string[] {
  return [...body.matchAll(/(?:^|[^\w@/])@([a-z0-9][a-z0-9-]{1,30}[a-z0-9])/gi)].map((m) => (m[1] as string).toLowerCase());
}

function line(text: string, known: ReadonlySet<string>, key: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith("@")) {
      const handle = part.slice(1).toLowerCase();
      return known.has(handle) ? <Link key={`${key}-${i}`} className="word" href={`/author/${handle}`}>{part}</Link> : part;
    }
    // A full stop or bracket after an address belongs to the sentence, not the link.
    const trail = part.match(/[.,;:!?)\]'"]+$/)?.[0] ?? "";
    const raw = trail ? part.slice(0, -trail.length) : part;
    const url = safeUrl(raw);
    if (!url) return part;
    return <span key={`${key}-${i}`}><a className="word" href={url} rel={USER_TEXT_REL} target="_blank">{raw}</a>{trail}</span>;
  });
}

export function CommentText({ body, mentions }: { body: string; mentions: string[] }) {
  const known = new Set(mentions);
  const paragraphs = body.replace(/\r\n?/g, "\n").split(/\n{2,}/).filter((p) => p.trim());
  return (
    <>
      {paragraphs.map((para, p) => (
        <p key={p}>
          {para.split("\n").map((l, i) => <span key={i}>{i > 0 && <br />}{line(l, known, `${p}-${i}`)}</span>)}
        </p>
      ))}
    </>
  );
}
