"use client";

/**
 * components/studio/image-field.tsx
 *
 * Choosing a portrait, a cover or a gallery picture. The file goes to
 * /api/uploads, which checks and resizes it, and the form keeps the address
 * it gets back. What happened is said under the picture, not in a pop-up.
 *
 * When a picture is replaced or removed here, the server is asked to delete
 * the old one. It does so only if no saved page or work shows it: one
 * uploaded a moment ago and never saved goes at once, so nothing is left in
 * storage that nobody sees, and one the saved page shows stays until the
 * form is saved without it, so a form closed unsaved loses nothing.
 */

import { useId, useRef, useState } from "react";
import type { Status } from "./send";

type Kind = "portrait" | "cover" | "gallery";
const SHAPE: Record<Kind, string> = { portrait: "portrait", cover: "cover", gallery: "gallery" };
const SAYS: Record<Kind, string> = {
  portrait: "JPEG, PNG or WebP, up to 8 MB. It's cropped to a 4:5 portrait.",
  cover: "JPEG, PNG or WebP, up to 8 MB. A cover keeps its own shape and is never stretched.",
  gallery: "JPEG, PNG or WebP, up to 8 MB.",
};

export function ImageField({ kind, label, value, onChange, alt }: { kind: Kind; label: string; value: string | null; onChange: (url: string | null) => void; alt: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  function forget(url: string | null) {
    if (!url) return;
    void fetch(`/api/uploads?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) { setStatus({ tone: "bad", text: "That file is over 8 MB. Choose a smaller one." }); return; }
    setBusy(true);
    setStatus({ tone: "ok", text: "Uploading…" });
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => null) as { image?: { url: string; width: number; height: number }; error?: string } | null;
      if (!res.ok || !data?.image) { setStatus({ tone: "bad", text: data?.error ?? "That upload didn't work. Try again." }); return; }
      forget(value);
      onChange(data.image.url);
      setStatus({ tone: "ok", text: `Uploaded, ${data.image.width} by ${data.image.height}. It's kept when you save.` });
    } catch {
      setStatus({ tone: "bad", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function remove() {
    forget(value);
    onChange(null);
    setStatus({ tone: "ok", text: "Removed. Save to keep it that way." });
  }

  return (
    <div className="field-row studio-image">
      <label htmlFor={id}>{label}</label>
      <div className="studio-image-row">
        <div className={`studio-image-frame ${SHAPE[kind]}`}>
          {value ? <img src={value} alt={alt} /> : <span aria-hidden="true">None yet</span>}
        </div>
        <div className="studio-image-side">
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <p className="hint">{SAYS[kind]}</p>
          {value && <p><button type="button" className="word" onClick={remove} disabled={busy}>Remove this picture</button></p>}
          <p className={status?.tone === "bad" ? "error-text" : "hint"} role="status" aria-live="polite">{status?.text ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
