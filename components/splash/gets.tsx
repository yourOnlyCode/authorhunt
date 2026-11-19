/**
 * components/splash/gets.tsx
 *
 * "What a launch gets you", on the author's side only, before the reasons.
 * An author's real question is whether a launch brings readers to their
 * work, so this answers it first with the path a reader takes: the board,
 * the launch page, and then the author's own store or site, which is where
 * the page's main button goes (lib/work-words.ts has its words). Then the
 * counts an author sees after a launch, which every author has for the week
 * (docs/monetization.md, Analytics).
 *
 * The numbers are an example and say so. Nothing here promises a sale
 * (DESIGN.md, "Say what a launch does, never what it will earn"). The
 * pictures are decoration for the words beside them, so screen readers skip
 * them. On a phone the three steps are one row to swipe.
 */

const Cheer = ({ n }: { n: number }) => <span className="cheerbox"><svg viewBox="0 0 14 10"><path d="M7 0l7 10H0z" /></svg>{n}</span>;

export function Gets() {
  return (
    <section className="gets for-author" id="gets" aria-labelledby="gets-h">
      <div className="wrap">
        <p className="sc">For authors</p>
        <h2 id="gets-h">What a launch gets you</h2>
        <p className="lede" data-reveal>A reader&apos;s path from the board to the place you sell or publish. Three steps, and <mark className="draw">we take no cut</mark>.</p>
        <ol className="path swipe" aria-label="A reader's path to your work">
          <li>
            <p className="sc">On the board</p>
            <div className="pic" aria-hidden="true">
              <div>
                <div className="mini you"><span className="rk">1</span><span className="cv" /><span className="tt">Your title<small>by you</small></span><Cheer n={61} /></div>
              </div>
            </div>
            <h3>Readers see it</h3>
            <p>Your work has a row on the day&apos;s board, where readers come to find someone new.</p>
          </li>
          <li>
            <p className="sc">Your launch page</p>
            <div className="pic" aria-hidden="true">
              <div className="lp"><span className="cv" /><span><b>Your title</b><small>A sample, and a note from you</small><span className="goes">Read it &rarr;</span></span></div>
            </div>
            <h3>They read a sample</h3>
            <p>Then one button, the largest on the page, goes where you send it.</p>
          </li>
          <li>
            <p className="sc">Your store or site</p>
            <div className="pic" aria-hidden="true">
              <div className="lp shop"><span className="url">yoursite.com/your-title</span><span className="in"><span className="cv" /><span><b>Your title</b><span className="buy">Buy &middot; $4.99</span></span></span></div>
              <p className="places">Your own site, a bookshop, a newsletter, a magazine: wherever it lives.</p>
            </div>
            <h3>They read or buy it</h3>
            <p>On your terms. The sale and the reader are yours.</p>
          </li>
        </ol>
        <div className="results" data-reveal>
          <header><h3>Your launch, a week on</h3><p className="sc">An example, not a promise</p></header>
          <dl>
            <div><dt>readers saw it</dt><dd>1,240</dd></div>
            <div><dt>went on to your work</dt><dd>186</dd></div>
            <div><dt>new followers, told about your next launch</dt><dd>43</dd></div>
          </dl>
          <p className="fine">These are the counts you see in your Studio after a launch. Yours will be your own.</p>
        </div>
      </div>
    </section>
  );
}
