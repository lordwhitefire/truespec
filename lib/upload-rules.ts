// The upload's own rules — the small, testable facts about a file arriving.
//
// Pure: it reads no bytes, opens no store, holds no session. The handler owns the request; this owns
// "what may be uploaded, and what a held file is called".

/**
 * The most we accept for one filled blank.
 *
 * A car blank is plain form fields — twenty cars is some tens of kilobytes — so this is a ceiling
 * against accident and abuse rather than a working limit. A real file is far under it.
 */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** How the ceiling reads to the owner. */
export const UPLOAD_MAX_MB = UPLOAD_MAX_BYTES / (1024 * 1024);

/** Where held car files live in the asset store. */
export const UPLOAD_FOLDER = "car-uploads";

/**
 * The name a held file carries in the asset store.
 *
 * **Randomised on purpose** (specs/media): the store is private by convention, so a held file's
 * address must be discoverable from nothing — not from the owner's filename, not from a page. The
 * original name is kept in the database, where the office can read it; the store never sees it. The
 * caller mints the uuid and passes it in, so this stays a pure, tested fact rather than a hidden
 * source of randomness.
 */
export function heldFilename(uuid: string): string {
  return `${UPLOAD_FOLDER}/${uuid}.pdf`;
}

/**
 * The owner's own name for his file, as the database keeps it: trimmed, never empty, bounded.
 *
 * It is stored, never used as a path — a name arriving from a browser is not a location, whatever it
 * claims to be. An empty one falls back to the template's own name rather than to a blank string.
 */
export function sourceFilename(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (trimmed === "") return "car-template.pdf";
  return trimmed.slice(0, 200);
}

/** Whether the arriving file is within size to be read at all. */
export function checkUploadSize(bytes: number): { ok: true } | { ok: false; reason: string } {
  if (bytes === 0) return { ok: false, reason: "That file is empty." };
  if (bytes > UPLOAD_MAX_BYTES) {
    return { ok: false, reason: `That file is larger than ${UPLOAD_MAX_MB} MB.` };
  }
  return { ok: true };
}
