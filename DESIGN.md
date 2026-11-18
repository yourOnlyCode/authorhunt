# Author Hunt design standards

> Read this before building any UI. The mocks in [docs/mockups/](docs/mockups/)
> are the reference. When review corrects a design choice, the rule lands
> here in the same PR, with its reason.

**Status, November 2026.** Third round. The first mock borrowed too much
from Lorec. The second (three Victorian directions) was too static, its
masthead too formal, its header too crowded. The current mock keeps that
round's rules (white page, ink, serif, square corners) and adds life. The
section "The three directions" below is history; "The current direction"
is what to build from, pending the owner's word.

## Fonts are open; everything else in the current direction stands

The owner's call, November 2026: the layout, colour, cheer, tags, ornament
and motion in `docs/mockups/author-hunt.html` are liked. Only the fonts
read as "AI made this", and the owner is choosing new ones. The mock's two
faces are two CSS variables, `--display` and `--text`, at the top of its
styles. Three wider studies were tried and set aside as more change than
was wanted; they are kept in `docs/mockups/type-studies.html`.

**Fonts tried, November 2026 (the owner's pick):** Averia Serif Libre
Light for large headings and the wordmark; Cormorant Garamond for medium
headings (capitals, lightly spaced) and for text. Cormorant runs small and
light, so text is 20px at weight 500, small text no less than 17px, and
counts are bold. Not final until the owner says so.

**The mark is a cat in round glasses,** one red line (the owner's call,
replacing the thrush). Product Hunt's mascot is also a cat, so the drawing
stays unlike theirs: face-on, reading glasses, no body. Have it looked at
with the name before launch (docs/launch.md).

## The current direction

- **Structure is Product Hunt's** (docs/product-structure.md): a numbered
  daily list beside a rail, then a launch page with a thread.
- **Type:** Instrument Serif for headings and the wordmark, Newsreader for
  text. Instrument Serif is sharp and narrow without Bodoni's fashion-
  magazine hairlines. The wordmark is its italic, in sentence case, after a
  small red triangle: friendly, not grand.
- **Three sources of life, and no others:**
  1. *Covers lift.* On hover a row's cover shifts up and left onto a hard
     black shadow and turns a degree and a half. Buttons do the same.
  2. *The cheer is red.* A square-cornered outline at the right of every
     row, an upward triangle over the count. Hovering nudges the triangle
     up; cheering fills it red and it hops once.
  3. *A reader's highlighter.* A flat yellow stroke under a few words a
     page: the leading launch, the current place in the header, the
     letter. Never more than two or three in view.
- **Colour:** ink, white, madder and indigo, and a highlighter (see
  "Colour is indigo and madder" below). Covers bring the rest.
- **The header** has a mark, a search line, three places and two actions.
- **The mark is the cat in glasses** (above). The up arrow belongs to the
  cheer only.
- **Ornament, in small doses:** William Morris's *Marigold* (1875), from
  the Art Institute of Chicago's open-access collection (artwork 39143,
  public domain), cut to one colour, the brand red
  (`docs/mockups/assets/marigold.webp`). It appears as a backdrop at about
  an eighth of its strength behind small sections (the Sunday letter band,
  the author card) and at full strength as a 16px trim above the footer.
  Never behind running text at more than that, never on the board itself,
  never animated. The footer credits it. *Why:* the owner liked the floral
  wallpaper on pass.lorec.io; the pass uses Morris's Snakeshead in full
  colour, so Author Hunt takes a different design in a single colour.
- **Tags on a row are in fixed places:** line one is the genre in small
  capitals, then the place after a small diamond; line two is "For readers
  of" or "Inspired by" in italic. Mature is a small red-outlined label
  beside the title, not among the tags. Kinds of work are tabs above the
  list. *Why:* the owner found the first run of bulleted tags untidy.
- **Still refused:** radius, gradients, soft shadows, sans-serif, and any
  ornament but the one above.

## The idea

A white page set like a nineteenth-century novel. The typography of that
book does the work: a sharp serif with strong contrast, italics, small
capitals, old-style figures, Roman numerals, and ruled lines. Nothing is
decorated. *Why:* the owner's direction, November 2026: literary, high
contrast, sharp, Victorian in its characteristics and never a costume.

## Settled

- **Not Lorec.** Author Hunt shares none of Lorec's look: no Lora, no Inter,
  no forest green, no paper or night grounds, no rounded-square portraits,
  no raised key. A reader should not be able to tell the two are related
  from the page alone.
- **A white page and black ink.** `--page` is white, `--ink` is near black.
  Body text is ink, secondary text is a dark grey that still meets 7:1.
  At most one other colour, used for one job (see the directions).
- **No radius. Anywhere.** Buttons, inputs, covers, portraits and frames
  have square corners. `border-radius: 0` is set globally and nothing
  overrides it.
- **Serif throughout.** Headings and body are both serif. There is no
  sans-serif in the product. Numbers are the text face's own figures,
  old-style where the face has them. No monospace, no typewriter face.
- **Lines, not boxes.** Structure comes from hairlines, a thick-thin rule,
  and space. A filled box is for the one primary button in a view. No
  shadows, no gradients, no tinted cards.
- **The cheer sits at the right of a row, with an up arrow** (the owner's
  call, November 2026, after a round where it was only type). See the
  current direction.
- **Light first.** Mocks and the first build are light. A dark mode can
  follow as ink and page swapped, once the light page is right.
- **Permitted devices,** each used sparingly and only where it's true to
  the content: Roman numerals for rank; small capitals for labels; italic
  for bylines and asides; a drop capital on one opening paragraph a page;
  dot leaders where a title meets a number; a swelled rule to close a
  heading; a double-ruled frame around one picture.
- **Refused devices:** fleurons and ornaments as decoration, blackletter,
  aged-paper textures, sepia, engraved illustration, flourished borders,
  mock-archaic spelling or phrasing ("ye", "esq.", "being an account of").
  The page is modern and plainly spoken; only its typesetting is old.
- **A portrait is a 4:5 rectangle** with a hairline border. A cover is 2:3
  with a hairline border. A book with no cover shows its title set in the
  display face.
- **Colour is indigo and madder** (the owner's pick, November 18, 2026):
  indigo `#2B3F8C` (`--blue`) and madder `#B23A2E` (`--red`; text on white
  uses `--red-text` `#9C2F25`), with a highlighter `#FFD84D` (`--mark`).
  They are the dyes Morris printed with, and both are a similar depth, so
  neither shouts. *Why:* the first pair (a web link blue against an
  orange-red) fought each other and went pastel when lightened. The
  marigold is drawn as a CSS mask in `--red`, never as a picture, so it
  prints in madder everywhere and can take a side's colour.

### Motion

- **Motion shows the reader something, once, and then rests** (the owner's
  call, November 18, 2026; before this, motion was hover and press only).
  - Hover and press stay under 200ms.
  - A larger moment may play once, when it comes into view: words rising
    into place, a highlighter stroke drawing itself, the example launch.
    It never loops. Most end within five seconds; one that needs longer
    (the example launch takes about ten) has a Play button and Pause
    beside it and stages the reader can press. *Why:* a loop pulls the
    eye for as long as it's on screen (a ticking countdown was removed
    for this), and anything that plays for more than five seconds must be
    pausable.
  - One thing moves at a time, and nothing moves beside a form someone is
    filling in.
  - The page scrolls the way the reader's device scrolls. No scroll
    hijacking, pinning, parallax or smooth-scroll library.
  - Everything is readable with no animation at all: content starts
    visible, and reduced motion shows the finished state.
  - Only transform, opacity, clip-path and background-size move. No
    animation library where CSS and the browser's own animation API do.
- **Show it before you tell it.** Where a page would explain the product
  in a paragraph, it draws a small piece of the app instead (a board row,
  a cheer, a date, the filters) with a heading and one short line. *Why:*
  the owner found the written version too wordy, and a visitor should see
  what they will get.

### The splash page

The white page, in indigo and madder. `docs/mockups/splash-motion.html` is
the reference for everything below; the live splash (`components/splash/`)
is the reference for what it already does, and none of that is dropped:
the opening date with the visitor's own time, the headline's per-letter
dissolve, the countdown that simply changes, the privacy link, the
junk-folder line, confetti on joining, the repeat-address emails, the
Morris credit and the full FAQ.

- **The join form is always in reach.** While the join box is on screen it
  is the only form; when it scrolls out of view the same form docks to the
  top of the page (one state: side, address, joined). The bar has no close
  button, never pulses, sits above everything, and never leaves while its
  field has focus. *Why:* the owner's requirement.
- **Each side has a colour:** indigo for a reader, madder for an author.
  The headline's coloured words take it, and it washes through the
  marigold inside the join box from the top, where the switch is. That is
  the page's one colour move, and it happens inside the box that asks for
  the address. The box is white, papered with the marigold, on a hard ink
  shadow.
- **Each side gets its own case:** "Why read here" for a reader, "Why
  launch here" for an author, six tiles each, drawn from the app's own
  parts. Then the example launch, framed as "How you discover" or "What a
  launch is". Why comes before how. "Written by people" is a line of a
  draft with a writer's corrections on it.
- **The example launch** is one day on the board in three named stages
  (Morning, All day, Midnight) that lead it, fill as they play and can be
  pressed. Its Play button sits above it; "Example launch. The titles are
  samples." sits beside the button, outside the board. First of the day
  gets confetti. On a wide screen (860px and up) it may sit in the first
  view beside the form, and then it waits for the headline to finish.
- **One closing panel in indigo** says when the first board opens, with a
  yellow Join button. It is the only full-width colour on the page.
  *Why:* three colour panels were tried and cut because they repeated the
  tiles.
- **Bands and the foot** are the marigold in madder on white, solid. The
  foot's words sit on a white plate with an ink rule and a hard shadow.
- **Every size:** nothing wider than a 320px screen, the join form in the
  first view from 390px up, and every tap target at least 44px tall.
- **Tried and undone, so they aren't tried again** (all November 18, 2026):
  a wash of colour across the whole page, the page keeping a side's tint,
  the marigold as the page's wallpaper, a see-through foot, and paper
  grain. The owner found the changing background was not a gain, and a
  white page reads best.

## The three directions

| | A. Title page | B. Contents | C. Plates |
|---|---|---|---|
| Setting | Centred, like a title page | Left-set, like a table of contents | Picture-led, like a book's plates |
| Display | Bodoni Moda | Libre Caslon Display | Old Standard TT, bold |
| Text | Newsreader | Libre Caslon Text | Old Standard TT |
| Colour | Oxblood `#7A1F1F`, only on what the reader has done (Cheered, current tab) | None. Ink only. | Prussian blue `#1D3557`, on numbers and the drop capital |
| Board | Rows with a small cover, rank in italic numerals | Text only: title, dot leaders, cheer count where the page number would be | The first launch as a frontispiece, the rest as a grid of covers |
| Cheer | The count over a rule over CHEER | A drawn triangle and the count; filled and underlined once cheered | A sentence: "Cheer · 128" |
| Best at | Looking like nothing else on the web | Speed of reading, and the least to build | Showing off covers to readers |
| Risk | Bodoni's hairlines thin out below about 22px | No pictures at all on the board | The grid hides rank order past the first |

They can be mixed. The likeliest blend: A's masthead and cheer, B's dot
leaders on the board, C's frontispiece for the day's first.

## Voice

Calm, plain and specific.

- Say what a thing is: "Launching Thursday", "128 readers cheered this",
  "For readers of Shirley Jackson".
- No exclamation marks, no emoji, no growth-speak. The words people read
  are in [docs/ontology.md](docs/ontology.md); use those and no others.
- **Author Hunt is for writing of every size, and the copy says so.** Say
  "writing" or "work", not only "books": flash fiction, a poem, an essay, a
  short story, a magazine article, a journal piece, fan fiction, a novella and a novel
  all launch here, and the small ones are welcomed by name. Keep it to a
  short list of two or three examples in any one sentence. *Why:* the
  owner's direction on the brand, November 2026.
- A number carries what it counts.
- Prices are in US dollars and said once: "Free to launch. $3.99 a
  month or $32 a year for the member tools."
- Money given to an author is "Support" and a "gift". It is never called a
  donation, and the page says what the author receives.

## Before you build UI

1. Find the nearest thing in the mock and match it.
2. Square corners, serif type, ink on white. If you reached for a box, try
   a rule.
3. Check a 390px phone.
4. Tab through it. Every control has a visible focus outline and a name.
