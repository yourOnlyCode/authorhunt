/**
 * lib/og-fonts.ts
 *
 * The heading face for images drawn on the server (share cards, stickers),
 * which can't use the site's web fonts. If the files can't be read the image
 * is still drawn, in the built-in face: a card that renders beats one that
 * fails.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

type OgFont = { name: string; data: Buffer; weight: 300; style: "normal" | "italic" };
let held: Promise<OgFont[]> | null = null;

export const OG_FONT_FAMILY = '"Averia Serif Libre", Georgia, serif';

export function ogFonts(): Promise<OgFont[]> {
  held ??= (async () => {
    try {
      const dir = join(process.cwd(), "assets", "fonts");
      const [regular, italic] = await Promise.all([readFile(join(dir, "AveriaSerifLibre-Light.ttf")), readFile(join(dir, "AveriaSerifLibre-LightItalic.ttf"))]);
      return [
        { name: "Averia Serif Libre", data: regular, weight: 300 as const, style: "normal" as const },
        { name: "Averia Serif Libre", data: italic, weight: 300 as const, style: "italic" as const },
      ];
    } catch { return []; }
  })();
  return held;
}
