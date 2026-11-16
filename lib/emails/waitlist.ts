import { appUrl } from "../env";
import { layout, sendEmail } from "./send";

const FOOTER = "Author Hunt, authorhunt.com. You're getting this because this address was entered on our waiting list.";
const JUNK = "If this landed in your junk folder, marking it \"not junk\" will bring the opening-day email to your inbox.";

/**
 * The email that asks a waitlist address to confirm. The link opens a page, and the page confirms by POST,
 * so a mail scanner that follows the link confirms nothing. `again` is for someone who entered their address
 * a second time without having confirmed; `reminder` is the one nudge the daily job sends.
 */
export async function sendWaitlistConfirm(input: { email: string; token: string; reminder?: boolean; again?: boolean }) {
  const url = `${appUrl}/confirm?t=${input.token}`;
  const heading = input.again ? "Here's your confirmation link again" : input.reminder ? "Still want a place on the list?" : "Confirm your place on the list";
  const subject = input.again ? "Your Author Hunt confirmation link, again" : input.reminder ? "A reminder to confirm your place" : "Confirm your place on Author Hunt's list";
  const mail = layout({
    heading,
    paragraphs: [
      input.again
        ? "This address was entered on Author Hunt's list again, and it hasn't been confirmed yet. Confirm it and we'll write once more: on Friday, January 8, 2027, at noon Eastern, when the first board opens."
        : "Thanks for joining Author Hunt's list. Confirm this address and we'll write once more: on Friday, January 8, 2027, at noon Eastern, when the first board opens.",
      "If this wasn't you, do nothing and the address is dropped.",
      JUNK,
    ],
    action: { label: "Confirm my address", url },
    footer: FOOTER,
  });
  return sendEmail({ to: input.email, subject, ...mail });
}

/** For an address that is already confirmed and was entered again: it's told so here, never on the page. */
export async function sendWaitlistAlready(input: { email: string }) {
  const mail = layout({
    heading: "You're already on the list",
    paragraphs: [
      "This address was entered on Author Hunt's list again. It was already there and already confirmed, so there's nothing more to do.",
      "We'll write on Friday, January 8, 2027, at noon Eastern, when the first board opens.",
      "If you didn't enter it, you can ignore this: nothing has changed.",
    ],
    footer: FOOTER,
  });
  return sendEmail({ to: input.email, subject: "You're already on Author Hunt's list", ...mail });
}
