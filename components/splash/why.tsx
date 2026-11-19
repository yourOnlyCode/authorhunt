/**
 * components/splash/why.tsx
 *
 * The case each side is given under the first view: "Why read here" for a
 * reader, "Why launch here" for an author. Both are rendered, and the styles
 * show the one for the chosen side (`data-side` on the page's root).
 *
 * An author gets eight, led by what a launch gets them (gets.tsx makes that
 * case first); a reader gets six. On a phone each set is one row to swipe.
 *
 * Every reason is shown before it is told (DESIGN.md, "Show it before you
 * tell it"): a small piece of the app drawn in the page's own parts (a board
 * row, a cheer, a date, the filters), a heading and one short line. The
 * pictures are decoration for the line beside them, so they are hidden from
 * screen readers. Each line is something the product does (AGENTS.md's
 * rules): the board's filter by type is real, anyone may cheer once and
 * never their own launch, and launching is free.
 */

const Cheer = ({ n }: { n: number }) => <span className="cheerbox"><svg viewBox="0 0 14 10"><path d="M7 0l7 10H0z" /></svg>{n}</span>;
const Leaf = ({ top }: { top: string }) => <div className="leaf"><b>{top}</b><span>8</span></div>;
/** The board's type filter over a poem in first place and a novel in second: small counts. */
const ByType = () => (
  <div>
    <p className="chips"><span className="on">Everything</span><span>Books</span><span>Short works</span></p>
    <div className="mini"><span className="rk">1</span><span className="cv b s" /><span className="tt">A poem</span><Cheer n={44} /></div>
    <div className="mini"><span className="rk">2</span><span className="cv" /><span className="tt">A novel</span><Cheer n={38} /></div>
  </div>
);
const Fair = ({ n }: { n: number }) => <div className="fair"><Cheer n={n} /><span className="coin">$</span></div>;
const Free = () => <span className="price"><mark>$0</mark></span>;

type Tile = { h: string; p: string; vis: React.ReactNode };

// What a launch gets an author comes first, then how the board works (the owner's call, November 2026).
const AUTHOR: Tile[] = [
  { h: "Readers go to your work", p: "One button, straight to where you sell or publish. No cut.", vis: <span className="goes">Read it &rarr;</span> },
  { h: "Readers for next time", p: "Followers are told about your next launch.", vis: <div className="keeps"><span className="fol"><b>128</b> followers</span></div> },
  { h: "In the Sunday letter", p: "The week's best is emailed to readers.", vis: <div className="sunday"><small>Sunday</small><b>This week&apos;s best</b><small>1. Your title</small></div> },
  { h: "A page that lasts", p: "It stays up, and can be found by search, long after the day.", vis: <div className="found"><small>authorhunt.com &rsaquo; work</small><u>Your title, by you</u><small>First of the day, January 8</small></div> },
  { h: "A day that's yours", p: "One day, your work on the board.", vis: <Leaf top="JAN" /> },
  { h: "Small counts", p: "Every piece gets a row, and every type its own ranking.", vis: <ByType /> },
  { h: "A fair order", p: "Decided by readers and writers alike. No one pays for a place.", vis: <Fair n={61} /> },
  { h: "It's free", p: "Your page and every launch, for good.", vis: <Free /> },
];

const READER: Tile[] = [
  { h: "New every morning", p: "A fresh board of new writing, every day.", vis: <Leaf top="TODAY" /> },
  { h: "Every size", p: "Poems to novels, each type with its own ranking.", vis: <ByType /> },
  { h: "Find your kind", p: "By genre, by city, or by authors you love.", vis: <div className="mini wide"><span className="rk">1</span><span className="cv" /><span className="tt">The Salt Road<small>by Maren Okafor</small><small className="tags"><mark>Fantasy</mark> &middot; <u>Raleigh</u> &middot; <u>For readers of Le Guin</u></small></span><Cheer n={52} /></div> },
  { h: "Your cheer decides", p: "One cheer each. No one buys a place.", vis: <Fair n={62} /> },
  // A line of a draft with a writer's corrections on it: a person changed their mind here.
  { h: "Written by people", p: "No AI-written work, ever.", vis: <p className="proof">It was a <span className="del">dark<i className="ins">quiet</i></span> night<span className="del">,</span><i className="stop">.</i></p> },
  { h: "Free to read", p: "Every page, with no account and no wall.", vis: <Free /> },
];

function Tiles({ tiles }: { tiles: Tile[] }) {
  return <ul className="tiles swipe">{tiles.map((t) => <li key={t.h}><div className="vis" aria-hidden="true">{t.vis}</div><h3>{t.h}</h3><p>{t.p}</p></li>)}</ul>;
}

export function Why() {
  return (
    <section className="why" id="why" aria-label="Why Author Hunt">
      <div className="wrap">
        <div className="for-author"><p className="sc">For authors</p><h2>Why launch here</h2><Tiles tiles={AUTHOR} /></div>
        <div className="for-reader"><p className="sc">For readers</p><h2>Why read here</h2><Tiles tiles={READER} /></div>
      </div>
    </section>
  );
}
