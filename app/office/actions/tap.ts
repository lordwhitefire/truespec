"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { markTapsSeenThrough } from "@/lib/office";

/**
 * Mark the taps seen, up to the tap the office has just looked at — the write behind the badge
 * clearing (owner ruling, 2026-10-16).
 *
 * A Server Action is a public endpoint, so the argument is not trusted: it must be a non-empty
 * string, and the store only honours an id that a `tap` row actually holds — it resolves that row's
 * own time, so the watermark can never be fast-forwarded past real taps and any tap that arrived
 * after the list was drawn stays "new".
 *
 * It is a **POST**, never a GET, so "no GET changes data" (`task.md:253`) holds. The badge lives in
 * the shell **layout**, on every office route, so the layout is what is revalidated — that is what
 * makes the number clear on screen.
 */
export async function markTapsSeenAction(tapId: string): Promise<void> {
  await requireOfficeSession();
  if (typeof tapId !== "string" || tapId.length === 0) return;
  try {
    await markTapsSeenThrough(tapId);
  } catch (error) {
    // A failed watermark write is not thrown out of this action (D32): the caller fires it and
    // forgets it (`void markTapsSeenAction(…)`), so a rejection would only become an unhandled one.
    // Swallowing it hides nothing — the badge goes on showing the same taps, which is exactly true,
    // because they were not marked seen. The revalidate is skipped too, so the layout keeps the
    // number it already had rather than redrawing a mark that was never made.
    //
    // The tap a buyer makes is a different write (`lib/tap.ts`, `storeQueryOnce`, no retry by
    // design): it lives on its own route, which already answers 503 rather than throwing.
    console.error("[store] write failed — the taps could not be marked seen", error);
    return;
  }
  revalidatePath("/", "layout");
}
