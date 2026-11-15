"use client";

/**
 * components/discover/collection-controls.tsx
 *
 * What a reader does to their own collections: make one, rename it, share it
 * or keep it private, take something out, delete it. Each control says what
 * happened next to itself (no toasts), then asks the server for the page
 * again so the list is what is really stored.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: {} };
  }
}
const errorOf = (data: Record<string, unknown>) => (typeof data.error === "string" ? data.error : "That didn't go through.");

export function NewCollectionForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setError(null);
    const res = await send("/api/collections", "POST", { name: new FormData(form).get("name") });
    setBusy(false);
    if (!res.ok) { setError(errorOf(res.data)); return; }
    form.reset();
    router.push(`/collection/${String(res.data.id)}`);
  }
  return (
    <form className="stack new-collection" onSubmit={submit}>
      <div className="field-row">
        <label htmlFor="collection-name">New collection</label>
        <div className="inline-field">
          <input className="input" id="collection-name" name="name" required maxLength={60} placeholder="Fantasy to read, Local authors" />
          <button className="btn solid" type="submit" disabled={busy}>Make it</button>
        </div>
        <span className="hint">Private until you share it.</span>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </form>
  );
}

type OwnerProps = { id: string; name: string; isPublic: boolean; fixed: boolean };

/** Rename, share and delete, for the collection's owner. "Saved" keeps its name and can't be deleted. */
export function CollectionOwnerControls({ id, name, isPublic, fixed }: OwnerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function patch(body: { name?: string; isPublic?: boolean }, done: string) {
    setBusy(true); setError(null); setSaid(null);
    const res = await send(`/api/collections/${id}`, "PATCH", body);
    setBusy(false);
    if (!res.ok) { setError(errorOf(res.data)); return; }
    setSaid(done);
    router.refresh();
  }
  async function remove() {
    setBusy(true); setError(null);
    const res = await send(`/api/collections/${id}`, "DELETE");
    setBusy(false);
    if (!res.ok) { setError(errorOf(res.data)); setConfirming(false); return; }
    router.push("/collections");
    router.refresh();
  }

  return (
    <div className="notice stack owner-controls">
      <p>
        {isPublic ? "Shared: anyone with the link can see this collection." : "Private: only you can see this collection."}{" "}
        <button className="word" type="button" disabled={busy} onClick={() => patch({ isPublic: !isPublic }, isPublic ? "Now private." : "Now shared.")}>{isPublic ? "Make it private" : "Share it"}</button>
      </p>
      {!fixed && (
        <form className="field-row" onSubmit={(e) => { e.preventDefault(); void patch({ name: String(new FormData(e.currentTarget).get("name") ?? "") }, "Renamed."); }}>
          <label htmlFor="rename">Name</label>
          <div className="inline-field">
            <input className="input" id="rename" name="name" defaultValue={name} required maxLength={60} />
            <button className="btn" type="submit" disabled={busy}>Rename</button>
          </div>
        </form>
      )}
      {said && <p role="status" className="it">{said}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {!fixed && (confirming
        ? <p>Delete this collection? The authors and books in it aren&apos;t affected. <button className="word" type="button" disabled={busy} onClick={remove}>Yes, delete it</button> <button className="word" type="button" onClick={() => setConfirming(false)}>Keep it</button></p>
        : <p><button className="word" type="button" onClick={() => setConfirming(true)}>Delete this collection</button></p>)}
    </div>
  );
}

export function RemoveItemButton({ collectionId, itemId, label }: { collectionId: string; itemId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function press() {
    setBusy(true); setFailed(false);
    const res = await send(`/api/collections/${collectionId}/items`, "DELETE", { itemId });
    setBusy(false);
    if (!res.ok) { setFailed(true); return; }
    router.refresh();
  }
  return <button className="word" type="button" onClick={press} disabled={busy} aria-label={`Remove ${label} from this collection`}>{failed ? "Try again" : "Remove"}</button>;
}
