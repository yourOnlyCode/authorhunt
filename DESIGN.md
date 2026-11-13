# Author Hunt design standards

> Read this before building any UI. The mock in [docs/mockups/](docs/mockups/)
> is the reference; this file is its rules and their reasons. When review
> corrects a design choice, the rule lands here in the same PR.

## The idea

Lorec's public site is a writing room. The Writers Pass is that room at
night. **Author Hunt is the library's new-arrivals desk in the morning:** the
day's books set out face up, each with its catalogue card, and a date stamp
on the counter.

It belongs to the same family as the Writers Pass (the same paper and night,
Lora and Inter, forest green as the only colour you can press) and differs
in four deliberate ways.

| | Writers Pass | Author Hunt |
|---|---|---|
| Ground | Night first, paper for reading | **Paper first.** Night is the dark theme, not the default. |
| Job | One long page that sells one thing | A board that's scanned daily: lists, ranks, filters |
| Signature | The ring of keys, William Morris ornament | **The date stamp and the catalogue card** |
| Third face | none | **Courier Prime**, for stamps, ranks and catalogue lines only |
| Second colour | Laureate gold, on status cards | **Stamp ink**, an indigo, for ranks and dates only |
| Motion | A scroll loop and a turning ring | Almost none. A cheer stamps; nothing else moves unasked. |

Author Hunt uses none of the Pass's ornament (no Snakeshead, no marbling, no
keys). Those are the Pass's own.

## Tokens

Every colour is a token in `app/globals.css`. No hex values in components.

| Token | Light (paper) | Dark (night) | Use |
|---|---|---|---|
| `--ground` | `#F4EEE3` | `#0E1014` | The page |
| `--ground-2` | `#EBE3D4` | `#14171D` | Bands, the filter bar, hover fills |
| `--card` | `#FBF8F2` | `#171B22` | A catalogue card, a form |
| `--ink` | `#1C1F25` | `#EDE6DA` | Text |
| `--ink-soft` | `#33373F` | `#C9C3B8` | Body text on cards |
| `--muted` | `#575E6A` | `#A3A9B3` | Secondary text |
| `--line` | `#DDD3C1` | `#262A32` | Rules and borders |
| `--forest` | `#2F7450` | `#3A8660` | Filled actions |
| `--forest-text` | `#1F5A3F` | `#74B391` | Links and action words |
| `--stamp` | `#3D3A8C` | `#A9A6F0` | Ranks, dates, the stamp. Never an action. |
| `--error` | `#A6402A` | `#E59878` | Errors |

- **Forest is the only colour that means "press this".** Cheer, Follow,
  Launch, links.
- **Stamp ink is the only colour that means "this is a record".** A rank, a
  launch date, "No. 1 of the day". It is never on a button or a link.
  *Why:* two colours with two jobs, so a reader learns each in one visit.
- Text meets 4.5:1 on its ground in both themes. A link inside a sentence is
  underlined, never told apart by colour alone.
- Paper is the default for signed-out visitors whatever the hour; the theme
  follows the system setting, with a switch in the footer.

## Type

| Role | Face | Use |
|---|---|---|
| Display | Lora 500/600, with its italic | Page titles, author names, book titles. One italic phrase per headline at most. |
| Body | Inter 400/500 | Everything read or pressed |
| Record | Courier Prime 400/700 | Ranks, dates, counts on the stamp, the catalogue line |

- Scale: 13 · 15 · 17 · 21 · 28 · 40 · 56. Body is 17 on reading pages and
  15 on the board, where rows are scanned.
- Headings use `tracking-tight` and `text-wrap: balance`.
- Courier Prime is uppercase with `letter-spacing: 0.06em` and never set
  longer than a line. It isn't for body text, labels on forms, or buttons.
- Digits that line up use `tabular-nums`.

## Shape and layout

- **One column of rows, not a grid of cards, for anything ranked.** A rank
  is an order; a grid hides it. Grids are for the directory and shelves,
  where there's no order to read.
- Page width caps at 1120px with a 20px gutter. The board is a 2:1 split
  (the day's list, then a rail) that stacks on a phone.
- Radius: 10px for cards and covers' frames, 8px for buttons and inputs,
  4px for a cover itself. Nothing is a circle except a status dot.
- **A portrait is a rounded square**, as in Lorec (`AuthorAvatar`). One
  shape for a person everywhere, and the same one a Lorec writer already
  has.
- **A cover is 2:3**, with a 4px radius and a thin shade on its left edge
  for the spine. A book with no cover gets its title set in Lora on
  `--ground-2`, never a grey box.
- Rules are 1px `--line`. Shadows are for the cheer stamp and a raised
  button only.

## Components

### The cheer stamp

The one control that is Author Hunt's own. A 56px square with a caret and a
count in Courier Prime.

- Resting: `--card` fill, `--line` border, `--ink` count.
- Cheered: `--forest` fill, light count. It stays that way; pressing again
  takes the cheer back.
- On press it drops 2px and returns (120ms, ease-out), like a stamp. Under
  reduced motion it changes colour only.
- Its accessible name is "Cheer for <title>, 128 cheers" and it is a
  `<button aria-pressed>`.
- During the day's first four hours it shows the caret and no count.

### A board row

Rank (Courier Prime, stamp ink) · cover or portrait · title in Lora with the
author beneath · one line of tagline · the catalogue line (genre, city, "for
readers of …") in Courier Prime, muted · the cheer stamp at the right edge.
The whole row is a link to the page; the stamp is its own target. Rows are
separated by a rule, not boxed.

### The date stamp

Each board opens with its date as a stamp: Courier Prime bold in stamp ink
inside a 2px stamp-ink border, turned two degrees. It appears once a page.
It's the only thing on the site set at an angle.

### The catalogue card

An author's or book's facts set as a library card: a `--card` sheet with a
ruled header, then label and value pairs in Courier Prime (GENRE, CITY, FOR
READERS OF, INSPIRED BY, WRITING SINCE). Each value is a link to its filter
page. This is where the filters are taught: a reader presses "Raleigh, NC"
on a card and lands on the city's authors.

### Buttons and words

- A primary action is the raised forest key from the Pass (gradient forest
  to forest-shade, a light inner top edge). One per view.
- Everything else is a word in `--forest-text`: Follow, Shelve, Share,
  Report. No pills, no chips, no toasts. Feedback is said inline, next to
  what it's about.
- **Exception to "no chips": filters in use.** An applied filter shows as a
  removable token in the filter bar, because a reader needs to see and undo
  what's narrowing the list.

### Empty and waiting states

A sentence in the product's voice and one action. No illustration, no
emoji. A list loads as rows of the right height in `--ground-2`, shown only
on a first visit.

## Motion

Ease out, under 200ms, transform and opacity only, with a `motion-reduce`
fallback. The cheer stamp and a row's hover fill are the whole list for
launch. Rank changes aren't animated: the board updates on load, never
under the reader's eyes.

## Voice

Calm, plain and specific, as on the Pass page.

- Say what a thing is: "Launching Thursday", "128 readers cheered this",
  "For readers of Shirley Jackson".
- No exclamation marks, no "🚀", no "crush your launch", no "hunt" as a
  verb. Authors are authors or writers, never creators or makers.
- The words: **Launch**, **Cheer**, **Follow**, **Shelf**, **Momentum**.
- A number carries what it counts. "128" alone means nothing; "128 cheers"
  does.
- Prices are in US dollars and said once: "$5 a month or $40 a year. Thirty
  days free, no card."

## Before you build UI

1. Find the nearest thing in the mock and match it.
2. Tokens only. Forest for actions, stamp ink for records.
3. Check both themes and a 390px phone.
4. Tab through it. Every control has a visible focus ring and a name.
