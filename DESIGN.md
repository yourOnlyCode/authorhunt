# Author Hunt design standards

> Read this before building any UI. The mocks in [docs/mockups/](docs/mockups/)
> are the reference. When review corrects a design choice, the rule lands
> here in the same PR, with its reason.

**Status, November 2026.** The first mock borrowed too much from Lorec and
was set aside. Three new directions are in the mock (A. Title page,
B. Contents, C. Plates). The rules under "Settled" hold for all three. The
section "The three directions" is replaced by the chosen one's tokens once
the owner picks.

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
- **The cheer is type, not a tile.** A number and the word Cheer, with a
  rule or a small drawn triangle. Never a square card. Cheered is shown by
  weight, a heavier rule or the accent, and the word changes to Cheered.
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
- **Motion:** none that isn't a response. A press may change weight or
  colour at once. No scroll effects.

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
- A number carries what it counts.
- Prices are in US dollars and said once: "Thirty days free, then $5 a
  month or $40 a year."
- Money given to an author is "Support" and a "gift". It is never called a
  donation, and the page says what the author receives.

## Before you build UI

1. Find the nearest thing in the mock and match it.
2. Square corners, serif type, ink on white. If you reached for a box, try
   a rule.
3. Check a 390px phone.
4. Tab through it. Every control has a visible focus outline and a name.
