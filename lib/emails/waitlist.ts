import { appUrl } from "../env";
import { layout, sendEmail } from "./send";

/** The one email a waitlist sign-up gets: confirm the address. The link opens a page, and the page confirms by POST, so a mail scanner that follows the link confirms nothing. */
export async function sendWaitlistConfirm(input: { email: string; token: string; reminder?: boolean }) {
  const url = `${appUrl}/confirm?t=${input.token}`;
  const mail = layout({
    heading: input.reminder ? "Still want a place on the list?" : "Confirm your place on the list",
    paragraphs: [
      "Thanks for joining Author Hunt's list. Confirm this address and we'll write once more: on Friday, January 8, 2027, at noon Eastern, when the first board opens.",
      "If this wasn't you, do nothing and the address is dropped.",
      "If this landed in your junk folder, marking it \"not junk\" will bring the opening-day email to your inbox.",
    ],
    action: { label: "Confirm my address", url },
    footer: "Author Hunt, authorhunt.com. You're getting this because this address was entered on our waiting list.",
  });
  return sendEmail({ to: input.email, subject: input.reminder ? "A reminder to confirm your place" : "Confirm your place on Author Hunt's list", ...mail });
}
