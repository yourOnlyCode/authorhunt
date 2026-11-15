"use client";

import { useState } from "react";

/** One press, and the answer in the same place. */
export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "missing" | "error">("idle");
  async function go() {
    setState("sending");
    try {
      const res = await fetch("/api/letter/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await res.json();
      setState(res.ok ? (data.ok ? "done" : "missing") : "error");
    } catch { setState("error"); }
  }
  if (state === "done") return <><p className="done" role="status">Unsubscribed.</p><p>The Sunday letter won&apos;t come to this address again. You can subscribe again from the front page whenever you like.</p></>;
  if (state === "missing") return <p role="status">That link isn&apos;t one we recognise. Open the one at the foot of the latest letter.</p>;
  return (
    <div className="last" style={{ paddingBlock: 0 }}>
      <button type="button" className="btn solid" onClick={go} disabled={state === "sending"}>Unsubscribe</button>
      {state === "error" && <p className="error-text" role="alert" style={{ marginTop: 12 }}>That didn&apos;t go through. Press it once more.</p>}
    </div>
  );
}
