/**
 * /studio/share: the short link, the stickers and the badge
 * (docs/development.md, Sharing a page on video). It says plainly what each
 * platform allows: a sticker is a picture and can't be pressed. Everyone gets
 * the short link, the badge and one sticker shape; the second shape is a
 * member tool, described here for a free author.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CopyLine } from "@/components/studio/actions";
import { isMember } from "@/lib/billing/server";
import { appUrl } from "@/lib/env";
import { requireAuthor } from "@/lib/studio/page";

export const metadata: Metadata = { title: "Share kit" };

export default async function SharePage() {
  const { author } = await requireAuthor("/studio/share");
  const member = await isMember(author);
  const host = new URL(appUrl).host;
  const shortLink = `${appUrl}/${author.handle}`;
  const pageUrl = `${appUrl}/author/${author.handle}`;
  const badgeUrl = `${appUrl}/api/badge/${author.handle}`;
  const badgeHtml = `<a href="${pageUrl}"><img src="${badgeUrl}" alt="${author.name.replace(/"/g, "&quot;")} on Author Hunt" width="220" height="48"></a>`;
  const shapes = [
    { shape: "wide", label: "Wide", says: "For the lower part of a video.", open: true },
    { shape: "tall", label: "Tall", says: "For a corner, beside your face.", open: member },
  ];

  return (
    <main className="wrap studio studio-narrow">
      <div className="page-head">
        <h1>Share kit</h1>
        <p>What works for sending readers to your page, and what each place allows.</p>
      </div>

      {!author.publishedAt && <p className="notice studio-made">Your page is a draft, so these lead nowhere yet. <Link className="word" href="/studio/page">Make it public</Link></p>}

      <section className="studio-part">
        <h2>Your short link</h2>
        <p>Easy to say aloud, type from a video, or put in a profile. It opens your page.</p>
        <CopyLine label="Short link" text={shortLink} />
        <p className="hint">Said aloud: &ldquo;{host} slash {author.handle}&rdquo;.</p>
      </section>

      <section className="studio-part">
        <h2>Stickers</h2>
        <p>A sticker is a picture with your short link and portrait, on a clear background, to lay over a video. <b>It is a picture, so nobody can press it.</b> Viewers read the link and type it, or find it in your profile.</p>
        <ul className="studio-stickers">
          {shapes.map((s) => (
            <li key={s.shape}>
              <p className="label">{s.label}</p>
              {s.open ? (
                <>
                  <div className={`studio-sticker ${s.shape}`}><img src={`/api/sticker/${author.handle}?shape=${s.shape}`} alt={`The ${s.label.toLowerCase()} sticker for ${author.name}`} loading="lazy" /></div>
                  <p>{s.says}</p>
                  <p><a className="word" href={`/api/sticker/${author.handle}?shape=${s.shape}`} download={`${author.handle}-${s.shape}.png`}>Download the PNG</a></p>
                </>
              ) : (
                <div className="studio-quiet">
                  <p>{s.says} The second shape is a member tool. <Link className="word" href="/pricing">See member tools</Link></p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="studio-part">
        <h2>What each place allows</h2>
        <ul className="studio-points">
          <li><b>Instagram Stories.</b> Instagram&rsquo;s own link sticker takes any address. Add a link sticker to your Story and paste your short link; that one can be pressed.</li>
          <li><b>Instagram Reels and TikTok.</b> Neither has a sticker that links outside the app, and a link in a caption can&rsquo;t be pressed. The link a viewer can press is the one in your profile, so put your short link there and lay the sticker over the video to point at it.</li>
          <li><b>Everywhere else.</b> Paste the short link. It shows a card with your name and portrait.</li>
        </ul>
        <p className="hint">These rules are the platforms&rsquo; and they change. Try it in the app before you count on it.</p>
      </section>

      <section className="studio-part">
        <h2>A badge for your own site</h2>
        <p>&ldquo;Featured on Author Hunt&rdquo;, linking to your page. Put it on your website and it also serves as the link back that verifies your site.</p>
        <div className="studio-badge"><img src={`/api/badge/${author.handle}`} alt={`The Author Hunt badge for ${author.name}`} loading="lazy" /></div>
        <CopyLine label="HTML to paste" text={badgeHtml} multiline />
        <p className="hint">{author.siteVerifiedAt ? "Your site is verified." : <>Once it&rsquo;s on your site, <Link className="word" href="/studio/page">check your site</Link> from your page form.</>}</p>
      </section>
    </main>
  );
}
