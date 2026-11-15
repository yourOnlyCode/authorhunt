/**
 * app/api/admin/standing/route.ts
 *
 * Suspend, restore or ban an account (and its page, if it has one), and the
 * one appeal. Admin only, checked here. Every one needs a note, because the
 * note is the record of what the decision rests on (AGENTS.md rule 7).
 */

import { adminForm } from "@/lib/trust/form";
import { decideAppeal, recordAppeal, sanction } from "@/lib/trust/decide";

export async function POST(req: Request) {
  return adminForm(req, async ({ admin, str, back }) => {
    const userId = str("userId");
    const action = str("action");
    if (!userId) return back("That account isn't here.", "error");
    if (action === "suspend" || action === "restore" || action === "ban") return back(await sanction(admin, userId, action, str("note")));
    if (action === "appeal_record") return back(await recordAppeal(admin, userId, str("text")));
    if (action === "appeal_decide") return back(await decideAppeal(admin, userId, str("outcome"), str("note")));
    return back("That isn't an action.", "error");
  });
}
