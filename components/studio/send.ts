/**
 * components/studio/send.ts
 *
 * One way for the studio's forms to call their routes and get back either
 * the answer or the sentence to show beside the form. Feedback is always
 * inline, next to what it's about.
 */

export type Sent<T> = { ok: true; data: T } | { ok: false; error: string; data: Partial<T> | null };

export async function send<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<Sent<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: data as T };
    return { ok: false, error: (data as { error?: string } | null)?.error ?? "That didn't work. Try again in a moment.", data };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your connection and try again.", data: null };
  }
}

export type Status = { tone: "ok" | "bad"; text: string } | null;
