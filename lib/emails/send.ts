/**
 * lib/emails/send.ts
 *
 * Every email leaves through here. With RESEND_API_KEY it goes out through
 * Resend; without it the message is printed to the server log, so the flows
 * can be followed in development.
 */

import { Resend } from "resend";
import { resendEnabled } from "../env";

export type Email = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

const FROM = process.env.EMAIL_FROM ?? "Author Hunt <hello@authorhunt.com>";

export async function sendEmail(mail: Email): Promise<{ ok: boolean }> {
  if (!resendEnabled) {
    console.log(`\n[email, not sent: no RESEND_API_KEY]\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return { ok: true };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, headers: mail.headers });
  if (error) console.error("[email] failed", mail.subject, error);
  return { ok: !error };
}

/** The headers mailbox providers expect on bulk mail, so "unsubscribe" works from the inbox itself. */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One plain layout for every message: a serif column, a rule, a footer. */
export function layout(input: { heading: string; paragraphs: string[]; action?: { label: string; url: string }; footer?: string }): { html: string; text: string } {
  const body = input.paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("");
  const action = input.action ? `<p style="margin:22px 0"><a href="${esc(input.action.url)}" style="display:inline-block;background:#111;color:#fff;padding:11px 20px;text-decoration:none">${esc(input.action.label)}</a></p>` : "";
  const footer = input.footer ?? "Author Hunt, authorhunt.com";
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#111;max-width:520px;margin:0 auto;padding:28px 20px"><p style="font-size:22px;font-style:italic;margin:0 0 20px;color:#B92C16">Author Hunt</p><h1 style="font-size:26px;font-weight:normal;line-height:1.15;margin:0 0 16px">${esc(input.heading)}</h1>${body}${action}<p style="border-top:1px solid #111;margin:26px 0 0;padding-top:12px;font-size:13px;color:#5C5C5C">${esc(footer)}</p></div>`;
  const text = [input.heading, "", ...input.paragraphs, ...(input.action ? ["", `${input.action.label}: ${input.action.url}`] : []), "", footer].join("\n");
  return { html, text };
}
