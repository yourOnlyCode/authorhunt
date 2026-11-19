/**
 * lib/work-words.ts
 *
 * The words on a launch page's main button, the one that leaves for wherever
 * the author publishes or sells. They follow what the work is: something
 * short is read, a book or an issue is viewed where it is sold. It never says
 * "get" or "buy" (the owner's call, November 2026: "Get the work" read
 * strangely, and Author Hunt sells nothing itself).
 */

import type { WorkKind } from "@/lib/db/schema";

export const GO_WORDS: Record<WorkKind, string> = {
  book: "View the book",
  short: "Read it",
  serial: "Read the serial",
  issue: "View the issue",
};
