/**
 * app/api/admin/cases/route.ts
 *
 * Where the forms on a case page post: dismiss, remove, pull, mark, and the
 * steps of the undeclared-AI process. Admin only, checked here (adminForm),
 * and each is one person's decision, logged with their note.
 */

import { adminForm } from "@/lib/trust/form";
import { caseAction } from "@/lib/trust/decide";
import { isTargetKind } from "@/lib/trust/reasons";

export async function POST(req: Request) {
  return adminForm(req, async ({ admin, str, back }) => {
    const kind = str("targetKind");
    if (!isTargetKind(kind)) return back("That isn't something that can be reported.", "error");
    return back(await caseAction(admin, kind, str("targetId"), str("action"), str));
  });
}
