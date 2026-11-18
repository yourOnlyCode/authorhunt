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
- **Colour:** ink, white, red `#D9361E` (text on white uses `#B92C16`),
  highlighter `#FFE14D`. Covers bring the rest. One blue, `#2F6FE8`, is
  used on the splash page only, for the two headline words that change
  with the reader / author switch: large text only, never body text.
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
- **The splash page has moments of its own** (the owner's calls,
  November 2026), and they stay on the splash page: the chosen side of the
  reader / author switch glows blue once each time it becomes the chosen
  one; the headline's first words dissolve and resolve; and joining the
  list throws a handful of square paper confetti in the brand's colours
  while the message resolves in. Each is skipped under reduced motion, and
  none moves anything else on the page. The app's splash
  (`components/splash/`) is now ahead of `docs/mockups/splash.html` for
  these; the code is the reference.
- **Motion shows the reader something, once, and then rests** (the
  owner's call, November 18, 2026; before this, motion was hover and press
  only and nothing moved unasked). The rules:
  - Hover and press stay under 200ms.
  - A larger moment may play **once, when it comes into view**: words
    rising into place, a highlighter stroke drawing itself, the sample day
    on the splash. It ends within five seconds, never loops, and offers
    "Play again" as a word if it's worth seeing twice. *Why:* a loop pulls
    the eye for as long as it's on screen (the ticking countdown was
    removed for this), and anything that plays longer needs a pause control.
  - One thing moves at a time, and nothing moves beside a form someone is
    filling in.
  - The page scrolls the way the reader's device scrolls. No scroll
    hijacking, pinning, parallax or smooth-scroll library.
  - Everything is readable with no animation at all: content starts
    visible, and reduced motion shows the finished state.
  - Only transform, opacity and clip-path move. No animation library where
    CSS and the browser's own animation API will do
    (docs/mockups/splash-motion.html has the vocabulary).
- **The join form is always in reach on the splash.** While the join box
  is on screen it is the only form; when it scrolls out of view the same
  form docks to the top of the page (one state: side, address, joined).
  The bar has no close button, never pulses, sits above every animated
  layer, and never swaps while its field has focus. *Why:* the owner's
  requirement, November 18, 2026: the form is available whatever is
  playing.
- **Colour fields belong to the splash's scroll only.** Below the first
  view, a promise may take a full-width panel in one brand colour (red,
  highlighter yellow, blue), one sentence each. The first view, and every
  page of the app, stay a white page.

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
