/**
 * scripts/seed.ts
 *
 * Sample authors, works, launches, cheers and comments, so every page has
 * something to show in development. Dates are set around today, so there is
 * always a board for today, yesterday and last week.
 *
 * None of this is real, and none of it may reach production: the script
 * refuses to run against DATABASE_URL unless SEED_OK=1 is set on purpose.
 */

import "./env";
import { sql } from "drizzle-orm";
import { db, usingLocalDb } from "../lib/db";
import * as t from "../lib/db/schema";
import { addDays, launchDay } from "../lib/ranking/day";
import { momentum } from "../lib/ranking/points";
import { launchScore } from "../lib/ranking/score";
import { slugify } from "../lib/slug";
import { genreRows, platformRows } from "../lib/catalog";

const REFERENCES = ["Ursula K. Le Guin", "Susanna Clarke", "Shirley Jackson", "Becky Chambers", "Octavia E. Butler", "Richard Osman", "Mary Oliver", "Italo Calvino", "Tove Jansson", "Tana French", "Kazuo Ishiguro", "Joan Didion", "N. K. Jemisin", "Daphne du Maurier"];

type SeedAuthor = { handle: string; name: string; tagline: string; bio: string; city: string; region?: string; country: string; genres: string[]; readersOf: string[]; inspiredBy: string[]; mature?: boolean; kind?: t.PageKind; works: SeedWork[]; pageLaunch?: number; member?: boolean };
type SeedWork = { title: string; tagline: string; description: string; kind?: t.WorkKind; form?: string; color: string; genres: string[]; platforms: string[]; day: number | null; cheers: number; pages?: number; notes?: string[]; noteText?: string; excerpt?: string; mature?: boolean };

// `day` is days from today: 0 today, -1 yesterday, 3 three days ahead; null means no launch yet.
const AUTHORS: SeedAuthor[] = [
  { handle: "maren", name: "Maren Okafor-Lindqvist", tagline: "Novels about maps, weather and inheritance.", city: "Raleigh", region: "N.C.", country: "United States", genres: ["Fantasy", "Literary"], readersOf: ["Ursula K. Le Guin", "Susanna Clarke"], inspiredBy: ["Italo Calvino", "Tove Jansson"], member: true,
    bio: "I trained as a cartographer and spent eight years drawing flood maps for the state before I wrote a word of fiction. My books are about people who are handed a map and told it's finished.\n\nThe Salt Road Almanac is my second novel. I'm writing the third now, a chapter a week, and posting what I learn here.",
    works: [
      { title: "The Salt Road Almanac", tagline: "A mapmaker's daughter inherits an atlas that redraws itself each winter.", form: "A novel", color: "#1F3A5C", genres: ["Fantasy", "Literary"], platforms: ["ingramspark"], day: 0, cheers: 128, pages: 352, notes: ["death-of-a-parent", "drowning"], noteText: "A house fire. No graphic violence.",
        description: "Every winter the atlas in Odile's attic changes. Roads move. A town she has visited is gone from the page, and then gone from the valley. Her mother drew it, and her mother's debts came with it.\n\nThe Salt Road Almanac is a novel about inheritance and weather, and about what a map owes the people it leads astray.",
        excerpt: "The first thing my mother taught me about maps was that they are promises, and the second was that she had broken most of hers.\n\nI was nine. We were standing in the attic with the atlas open on the trestle, and outside the first snow of the year was coming down over the salt road. She put my finger on a village called Ennis Low. \"Remember where that is,\" she said. In the morning it had moved a mile to the east, and by spring nobody I asked had ever heard of it." },
      { title: "What the River Kept", tagline: "A surveyor returns to a drowned town to settle who owned what.", form: "A novel", color: "#26262C", genres: ["Literary"], platforms: ["ingramspark", "amazon-kdp"], day: -1, cheers: 212, pages: 288, description: "When the reservoir is drained for repairs, the town under it comes back into the light, and so do its property lines. Thea Vance is sent to survey what's left and finds her own family's name on a deed she was told never existed." },
    ] },
  { handle: "tobias", name: "Tobias Brandt-Ueda", tagline: "Quiet horror from the fishing towns of the North Sea.", city: "Aberdeen", country: "United Kingdom", genres: ["Horror"], readersOf: ["Daphne du Maurier"], inspiredBy: ["Shirley Jackson"], mature: true, pageLaunch: 0,
    bio: "I grew up above a net loft in Fraserburgh and have never managed to write a story that wasn't within earshot of the sea. Two novels so far, a third on the way.",
    works: [{ title: "Tidewrack", tagline: "Something is leaving gifts above the high-water mark.", form: "A novel", color: "#7A2533", genres: ["Horror"], platforms: ["traditional"], day: 4, cheers: 0, mature: true, notes: ["body-horror", "death-of-a-child"], description: "After the storm the beach at Skarra is covered in things the sea has no business returning: a wedding ring, a child's shoe, a door. Each is addressed, in its way, to someone in the village." }] },
  { handle: "ines", name: "Ines Carvalho Pryce", tagline: "Mysteries with flour on them.", city: "Lisbon", country: "Portugal", genres: ["Cozy mystery", "Mystery"], readersOf: ["Richard Osman"], inspiredBy: ["Tana French"],
    bio: "Former pastry chef. I write the kind of mystery where nobody gets hurt who didn't have it coming, and everyone eats well.",
    works: [{ title: "Small Hours at the Fig Tree", tagline: "A night-shift baker, a retired detective, and the missing bread.", form: "A novel", color: "#24503B", genres: ["Cozy mystery"], platforms: ["amazon-kdp", "kobo-writing-life"], day: 0, cheers: 84, pages: 304, description: "Every morning for a week, forty loaves have vanished from the Fig Tree bakery between the oven and the shelf. Dona Amélia has run the night shift for thirty years and has never lost so much as a roll." }] },
  { handle: "dev", name: "Dev Raghunathan", tagline: "Science fiction about rent, mostly.", city: "Toronto", region: "Ont.", country: "Canada", genres: ["Science fiction"], readersOf: ["Becky Chambers"], inspiredBy: ["Octavia E. Butler"],
    bio: "I write about ordinary people in extraordinary housing situations. Low Orbit, Late Rent is my first novel.",
    works: [{ title: "Low Orbit, Late Rent", tagline: "Six flatmates on a failing space station try to make rent.", form: "A first novel", color: "#4A3A78", genres: ["Science fiction"], platforms: ["draft2digital", "royal-road"], day: 0, cheers: 61, pages: 276, description: "Ring Four of Halcyon Station has been losing air for a decade and its landlord for longer. When the rent triples, the six tenants of unit 4-C have one month and one very bad idea." }] },
  { handle: "hollis", name: "Hollis Abernathy-Cruz", tagline: "Poems about freight trains, grandmothers and the panhandle.", city: "Amarillo", region: "Tex.", country: "United States", genres: ["Poetry"], readersOf: [], inspiredBy: ["Mary Oliver"], pageLaunch: 0,
    bio: "Third-generation railroad family, first-generation poet. I read at feed stores, libraries and anywhere with a folding chair.",
    works: [{ title: "Coupling Rods", tagline: "Forty poems for the BNSF line and the people along it.", kind: "book", form: "A chapbook", color: "#9A6412", genres: ["Poetry"], platforms: ["lulu", "own-site"], day: null, cheers: 0, description: "Poems written between Amarillo and Clovis, mostly on the back of switch lists." }] },
  { handle: "priya", name: "Priya Venkataraman-Holt", tagline: "Essays on leaving, and on staying gone.", city: "Leeds", country: "United Kingdom", genres: ["Essays", "Memoir"], readersOf: ["Joan Didion"], inspiredBy: ["Kazuo Ishiguro"],
    bio: "I have moved house nineteen times. These are the notes.",
    works: [{ title: "A Field Guide to Leaving", tagline: "Nineteen houses, nineteen essays.", form: "Essays", color: "#C24A2A", genres: ["Essays", "Memoir"], platforms: ["traditional"], day: -1, cheers: 167, pages: 224, description: "An essay for every house the author has left, from a caravan in Tamil Nadu to a flat above a bookmaker's in Leeds." }] },
  { handle: "callum", name: "Callum Adeyemi", tagline: "Thrillers set between Lagos and London.", city: "London", country: "United Kingdom", genres: ["Thriller"], readersOf: ["Tana French"], inspiredBy: ["Daphne du Maurier"], pageLaunch: -1,
    bio: "Former court reporter. I write about what people say under oath and what they do afterwards.",
    works: [{ title: "The Understudy's Knife", tagline: "The lead is dead by the interval. The understudy knows her lines too well.", form: "A novel", color: "#26262C", genres: ["Thriller"], platforms: ["amazon-kdp"], day: 1, cheers: 0, description: "On the opening night of a West End revival, the star collapses in the second act. Her understudy steps on without missing a cue, and that is the first thing the police find strange." }] },
  { handle: "saltmarsh", name: "Saltmarsh Review", kind: "publication", tagline: "A quarterly of short fiction from coasts and edges.", city: "Halifax", region: "N.S.", country: "Canada", genres: ["Short stories", "Literary"], readersOf: [], inspiredBy: [],
    bio: "Saltmarsh Review publishes eight stories a quarter, in print and online, and pays every writer.",
    works: [{ title: "Saltmarsh Review, Issue 12", tagline: "Eight new stories about weather that arrives early.", kind: "issue", form: "Issue 12, winter", color: "#24503B", genres: ["Short stories"], platforms: ["own-site"], day: 0, cheers: 37, description: "The winter issue: eight stories, two in translation, and an interview with a lighthouse keeper." }] },
  { handle: "junebug", name: "Odalys Ferreira-Moon", tagline: "A serial about a lighthouse that takes in lodgers.", city: "Providence", region: "R.I.", country: "United States", genres: ["Fantasy", "Young adult"], readersOf: ["Tove Jansson"], inspiredBy: ["Ursula K. Le Guin"],
    bio: "I post a chapter every Thursday and have not missed one in two years.",
    works: [{ title: "The Lodgers at Gull Rock", tagline: "A new chapter each week, in its third year.", kind: "serial", form: "A serial", color: "#1F3A5C", genres: ["Fantasy", "Young adult"], platforms: ["wattpad", "royal-road"], day: 0, cheers: 29, description: "Gull Rock light has eleven rooms and takes anyone the mainland won't. Told a week at a time." }] },
  { handle: "wren", name: "Wren Okonkwo-Bell", tagline: "Short stories about small machines.", city: "Detroit", region: "Mich.", country: "United States", genres: ["Science fiction", "Short stories"], readersOf: ["Octavia E. Butler", "N. K. Jemisin"], inspiredBy: ["Italo Calvino"],
    bio: "Machinist by day. I write about the things we build and what they'd say about us.",
    works: [{ title: "The Lathe Remembers", tagline: "A short story about a machine shop's last night.", kind: "short", form: "A short story", color: "#4A3A78", genres: ["Science fiction", "Short stories"], platforms: ["substack"], day: 0, cheers: 22, description: "Nine thousand words. A tool-and-die shop is sold for its land, and the oldest machine in it is asked to make one more part." }] },
  { handle: "anneliese", name: "Anneliese Thackeray-Rao", tagline: "Historical romance with ledgers in it.", city: "Bath", country: "United Kingdom", genres: ["Romance", "Historical fiction"], readersOf: ["Susanna Clarke"], inspiredBy: ["Daphne du Maurier"],
    bio: "I was an accountant for twelve years and it shows. My heroines can all read a balance sheet.",
    works: [{ title: "A Fortune in Arrears", tagline: "She has his debts. He has her letters.", form: "A novel", color: "#7A2533", genres: ["Romance", "Historical fiction"], platforms: ["amazon-kdp", "kobo-writing-life"], day: -6, cheers: 143, pages: 368, description: "Bath, 1816. A widow buys up a viscount's debts for reasons of her own, and discovers he has been buying something of hers." }] },
  { handle: "teo", name: "Teodoro Aguinaldo-West", tagline: "Memoir from a family of undertakers.", city: "Manila", country: "Philippines", genres: ["Memoir"], readersOf: ["Joan Didion"], inspiredBy: ["Kazuo Ishiguro"],
    bio: "Fourth son of a funeral home. I write about the living.",
    works: [{ title: "The Good Suit", tagline: "Growing up above the family funeral parlour.", form: "A memoir", color: "#26262C", genres: ["Memoir"], platforms: ["traditional"], day: -5, cheers: 119, pages: 256, notes: ["grief"], description: "Every boy in the Aguinaldo family is given a black suit at twelve. This is the story of the one who kept outgrowing his." }] },
  { handle: "birdie", name: "Birdie Halloran-Vasquez", tagline: "Picture-book author, retired school librarian.", city: "Santa Fe", region: "N.M.", country: "United States", genres: ["Children's"], readersOf: ["Tove Jansson"], inspiredBy: ["Mary Oliver"],
    bio: "Thirty-one years of story time. Now I write the books I couldn't find.",
    works: [{ title: "The Bear Who Returned Everything", tagline: "A bear, a library card and a very late fee.", form: "A picture book", color: "#9A6412", genres: ["Children's"], platforms: ["ingramspark"], day: -4, cheers: 98, pages: 40, description: "Barnaby has had the same library book since before the snow. Returning it turns out to be the easy part." }] },
  { handle: "soren", name: "Søren Achterberg-Nkemelu", tagline: "Translator and novelist. Slow books about fast water.", city: "Bergen", country: "Norway", genres: ["Literary", "Historical fiction"], readersOf: ["Kazuo Ishiguro"], inspiredBy: ["Italo Calvino"],
    bio: "I translate from Norwegian and Igbo and write in whichever language the book asks for.",
    works: [{ title: "Meltwater", tagline: "Three generations on a glacier that is leaving.", form: "A novel", color: "#1F3A5C", genres: ["Literary"], platforms: ["traditional"], day: -3, cheers: 76, pages: 412, description: "A family of glacier guides counts the metres lost each summer, and what goes with them." }] },
];

const COMMENTS: [string, string, string | null][] = [
  // [who, body, replyTo index]
  ["maren", "Hello, and thank you for being here on launch day. I drew flood maps for eight years before I wrote fiction, and this book is what came of wondering who a map belongs to. Ask me anything, including about the ferry.", null],
  ["dev", "Read an early copy. The chapter where the town comes off the map is the best thing I read this year. How did you decide what the atlas was allowed to change?", null],
  ["maren", "One rule: it can only take away what somebody has stopped looking after. That did most of the plotting for me.", "1"],
  ["reader", "Bought it from my local shop this morning on the strength of the Le Guin comparison. Is there a map in the print edition?", null],
  ["ines", "Congratulations, Maren. The cover is wonderful. Who drew the atlas plates?", null],
];

async function clear() {
  const names = ["site_events", "images", "letter_subscribers", "waitlist", "notify_requests", "notification_prefs", "notifications", "moderation_log", "reports", "comps", "subscriptions", "point_events", "collection_items", "collections", "updates", "comment_cheers", "comments", "follows", "cheers", "launches", "works", "authors", "users", "platforms", "reference_authors", "genres"];
  for (const n of names) await db.execute(sql.raw(`delete from "${n}"`));
}

export async function seed() {
  const now = new Date();
  const today = launchDay(now);
  await clear();

  await db.insert(t.genres).values(genreRows());
  await db.insert(t.referenceAuthors).values(REFERENCES.map((name) => ({ slug: slugify(name), name, approved: true })));
  await db.insert(t.platforms).values(platformRows());

  // The accounts /sign-in offers in development.
  const old = new Date(now.getTime() - 200 * 86_400_000);
  await db.insert(t.users).values([
    { id: "dev_admin", email: "owner@authorhunt.test", displayName: "The owner (admin)", createdAt: old },
    { id: "dev_reader", email: "june@authorhunt.test", displayName: "June Bellweather", createdAt: old, adultConfirmedAt: old },
    { id: "dev_new", email: "new@authorhunt.test", displayName: "A new account", createdAt: now },
  ]);
  // Readers whose only job is to have cheered.
  const crowd = Array.from({ length: 230 }, (_, i) => ({ id: `seed_reader_${i}`, email: `reader${i}@authorhunt.test`, displayName: `Reader ${i + 1}`, createdAt: old }));
  for (let i = 0; i < crowd.length; i += 100) await db.insert(t.users).values(crowd.slice(i, i + 100));

  const authorIds = new Map<string, string>();
  const launchOf = new Map<string, string>();
  for (const a of AUTHORS) {
    const userId = a.handle === "maren" ? "dev_author" : `seed_author_${a.handle}`;
    await db.insert(t.users).values({ id: userId, email: `${a.handle}@authorhunt.test`, displayName: a.name, createdAt: old });
    const created = new Date(now.getTime() - 90 * 86_400_000);
    const [author] = await db.insert(t.authors).values({
      userId, kind: a.kind ?? "author", handle: a.handle, name: a.name, tagline: a.tagline, bio: a.bio,
      city: a.city, region: a.region ?? null, country: a.country, citySlug: slugify([a.city, a.region].filter(Boolean).join(" ")),
      website: `https://${a.handle}.example`, links: [{ label: "Newsletter", url: `https://${a.handle}.example/letter` }, { label: "Instagram", url: `https://instagram.com/${a.handle}` }],
      supportUrl: a.member ? `https://ko-fi.com/${a.handle}` : null, siteVerifiedAt: a.member ? created : null,
      genres: a.genres.map(slugify), readersOf: a.readersOf.map(slugify), inspiredBy: a.inspiredBy.map(slugify),
      aiUse: "none", aiDeclaredAt: created, mature: a.mature ?? false, founding: true,
      trialEndsAt: new Date(created.getTime() + 30 * 86_400_000), publishedAt: created, createdAt: created,
    }).returning();
    if (!author) throw new Error("author not made");
    authorIds.set(a.handle, author.id);
    if (a.member) await db.insert(t.comps).values({ userId, reason: "founding" });

    const events: { kind: string; points: number; createdAt: Date }[] = [{ kind: "finish_page", points: 20, createdAt: created }];
    const addLaunch = async (kind: t.LaunchKind, workId: string | null, dayOffset: number, cheerCount: number) => {
      const day = addDays(today, dayOffset);
      const status: t.LaunchStatus = dayOffset > 0 ? "scheduled" : dayOffset === 0 ? "live" : "closed";
      const [launch] = await db.insert(t.launches).values({ kind, authorId: author.id, workId, launchDay: day, status, cheerCount, score: launchScore({ cheerWeightSum: cheerCount, distinctCommenters: 0 }) }).returning();
      if (!launch) throw new Error("launch not made");
      if (cheerCount > 0) {
        const at = new Date(now.getTime() + Math.min(dayOffset, 0) * 86_400_000);
        await db.insert(t.cheers).values(crowd.slice(0, cheerCount).map((u) => ({ userId: u.id, launchId: launch.id, weight: 1, createdAt: at })));
        events.push({ kind: "cheer_received", points: 2 * cheerCount, createdAt: at });
      }
      if (dayOffset <= 0) events.push({ kind: kind === "work" ? "launch_work" : "launch_page", points: kind === "work" ? 50 : 30, createdAt: new Date(now.getTime() + dayOffset * 86_400_000) });
      return launch.id;
    };

    if (a.pageLaunch !== undefined) await addLaunch("author", null, a.pageLaunch, a.handle === "tobias" ? 97 : a.handle === "hollis" ? 43 : 139);
    for (const w of a.works) {
      const [work] = await db.insert(t.works).values({
        authorId: author.id, slug: slugify(w.title), kind: w.kind ?? "book", form: w.form ?? "A book", title: w.title, tagline: w.tagline,
        description: w.description, excerpt: w.excerpt ?? "", coverColor: w.color, pubDate: w.day !== null ? addDays(today, w.day) : null, pages: w.pages ?? null,
        buyLinks: [{ label: "Bookshop.org", url: "https://bookshop.org" }, { label: "Kobo", url: "https://www.kobo.com" }, { label: "Amazon", url: "https://www.amazon.com" }],
        genres: w.genres.map(slugify), platforms: w.platforms, aiUse: "none", mature: w.mature ?? false, contentNotes: w.notes ?? [], contentNoteText: w.noteText ?? "",
      }).returning();
      if (!work) throw new Error("work not made");
      if (w.day !== null) {
        const launchId = await addLaunch("work", work.id, w.day, w.cheers);
        launchOf.set(w.title, launchId);
      }
    }
    await db.insert(t.pointEvents).values(events.map((e) => ({ authorId: author.id, kind: e.kind, points: e.points, createdAt: e.createdAt })));
    await db.update(t.authors).set({ momentum: momentum(events, now) }).where(sql`${t.authors.id} = ${author.id}`);
  }

  // Updates, follows and a thread on the leading launch.
  const maren = authorIds.get("maren") as string;
  await db.insert(t.updates).values([
    { authorId: maren, kind: "progress", body: "Chapter nine of the third book is done. It has a ferry in it, which I swore I'd never write again.", createdAt: new Date(now.getTime() - 3 * 86_400_000) },
    { authorId: maren, kind: "event", body: "Reading at Quail Ridge Books in Raleigh on the 21st, 7pm. I'll bring the original atlas drawings.", createdAt: new Date(now.getTime() - 11 * 86_400_000) },
  ]);
  for (const [handle, n] of [["maren", 120], ["dev", 64], ["ines", 71], ["tobias", 38], ["priya", 55]] as const) {
    const id = authorIds.get(handle) as string;
    await db.insert(t.follows).values(crowd.slice(0, n).map((u) => ({ userId: u.id, authorId: id })));
    await db.update(t.authors).set({ followerCount: n }).where(sql`${t.authors.id} = ${id}`);
  }
  await db.insert(t.follows).values({ userId: "dev_reader", authorId: maren });
  await db.update(t.authors).set({ followerCount: 121 }).where(sql`${t.authors.id} = ${maren}`);

  const salt = launchOf.get("The Salt Road Almanac") as string;
  const who: Record<string, string> = { maren: "dev_author", dev: "seed_author_dev", ines: "seed_author_ines", reader: "dev_reader" };
  const made: string[] = [];
  for (const [i, [by, body, replyTo]] of COMMENTS.entries()) {
    const [c] = await db.insert(t.comments).values({ launchId: salt, userId: who[by] as string, body, parentId: replyTo ? made[Number(replyTo)] : null, pinned: i === 0, cheerCount: [36, 21, 14, 8, 5][i] ?? 0, createdAt: new Date(now.getTime() - (9 - i * 1.5) * 3_600_000) }).returning();
    made.push(c?.id as string);
  }
  await db.update(t.launches).set({ commentCount: COMMENTS.length, score: launchScore({ cheerWeightSum: 128, distinctCommenters: 3 }) }).where(sql`${t.launches.id} = ${salt}`);

  // Readers waiting on the two upcoming launches, a collection, and a notification to look at.
  const knife = launchOf.get("The Understudy's Knife");
  const tide = launchOf.get("Tidewrack");
  if (knife) await db.insert(t.notifyRequests).values(crowd.slice(0, 64).map((u) => ({ launchId: knife, userId: u.id })));
  if (tide) await db.insert(t.notifyRequests).values(crowd.slice(0, 112).map((u) => ({ launchId: tide, userId: u.id })));
  const [saved] = await db.insert(t.collections).values({ userId: "dev_reader", name: "Saved", slug: "saved" }).returning();
  if (saved) await db.insert(t.collectionItems).values({ collectionId: saved.id, authorId: maren });
  await db.insert(t.notifications).values({ userId: "dev_author", kind: "comment", title: "Dev Raghunathan commented on The Salt Road Almanac", href: "/work/the-salt-road-almanac" });

  // Close the past days: give each its final ranks.
  await db.execute(sql`update launches l set rank_day = r.rank from (select id, row_number() over (partition by launch_day order by score desc) as rank from launches where status = 'closed') r where l.id = r.id`);
  return { authors: AUTHORS.length, today };
}

async function main() {
  if (!usingLocalDb && process.env.SEED_OK !== "1") {
    console.error("Refusing to seed: DATABASE_URL is set. Sample data must never reach a real database. Set SEED_OK=1 only for a throwaway one.");
    process.exit(1);
  }
  const res = await seed();
  console.log(`Seeded ${res.authors} sample authors around ${res.today}.`);
  process.exit(0);
}

if (process.argv[1]?.endsWith("seed.ts")) void main();
