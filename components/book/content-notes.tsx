"use client";

/**
 * components/book/content-notes.tsx
 *
 * Content notes are shown only when asked for, because a note can itself
 * spoil or distress (docs/product-structure.md, section 5). A reader who has
 * chosen "always show" in their settings sees them open.
 */

import { useState } from "react";

export function ContentNotes({ text, startOpen }: { text: string; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="notes">
      <b>Content notes</b>
      <span id="content-notes-text" hidden={!open}>{text}</span>
      <button className="word" type="button" aria-expanded={open} aria-controls="content-notes-text" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button>
      {!open && <span className="it fine">Shown only if you ask.</span>}
    </div>
  );
}
