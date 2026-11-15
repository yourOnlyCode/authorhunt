/**
 * lib/trust/form.ts
 *
 * The admin pages are plain HTML forms that post to route handlers and are
 * sent back (303) to the page they came from, with what happened in the
 * address. This is the one gate those handlers share: the viewer is an admin,
 * checked on the server, or the answer is a 404 like any missing page. A link
 * shown or hidden in the UI is never the gate.
 */

import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "../auth";
import { ActionError } from "../actions/cheer";

export type AdminForm = { admin: Viewer; str: (name: string) => string; back: (message: string, kind?: "done" | "error") => NextResponse };

const notFound = () => new NextResponse("Not found", { status: 404 });

/** A form post is only honoured from this site's own pages: the session is a cookie, and a cookie rides along from anywhere. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function adminForm(req: Request, handle: (f: AdminForm) => Promise<NextResponse>): Promise<NextResponse> {
  const admin = await getViewer();
  if (!admin?.isAdmin) return notFound();
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  let form: FormData;
  try { form = await req.formData(); } catch { return new NextResponse("Bad request", { status: 400 }); }
  const str = (name: string) => { const v = form.get(name); return typeof v === "string" ? v.trim() : ""; };
  const raw = str("back");
  const path = raw.startsWith("/admin") && !raw.includes("//") ? raw : "/admin";
  const back = (message: string, kind: "done" | "error" = "done") => {
    const url = new URL(path, req.url);
    url.searchParams.delete("done"); url.searchParams.delete("error");
    url.searchParams.set(kind, message);
    return NextResponse.redirect(url, 303);
  };
  try {
    return await handle({ admin, str, back });
  } catch (e) {
    if (e instanceof ActionError) return back(e.message, "error");
    throw e;
  }
}
