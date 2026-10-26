"use server";

import {
  checkDemoAssetCap,
  uploadLabelForSpace,
  verifyUploadMark,
} from "@/lib/demo-assets";
import { requireOfficeSession } from "@/lib/session";
import { deleteAsset, imageUrl, listStoredAssets, uploadImage } from "@/lib/sanity";
import { preparePhoto } from "@/lib/photos";
import { checkPhotoSize } from "@/lib/photo-rules";
import type { FieldError } from "@/lib/car-input";

/**
 * The office's one upload — the write boundary truth 7 names (build step 5, Task 18).
 *
 * "Assets upload to Sanity independently of the car; the rows link on save, so a car is never saved
 * pointing at bytes that were never uploaded." So this action does exactly one thing: it turns bytes
 * into an asset id and hands it back. It writes **nothing** to the database — no row exists yet — and
 * it makes no reference to any car, so a photo can be added to a form that is never saved without
 * leaving a record behind. If the form is abandoned, the asset it uploaded is an uploaded asset no
 * row references, which is the litter the owner's own cleanup reports and clears (TASK-003 Task 19;
 * truth 10 — nothing is deleted on his behalf, so nothing here deletes it either).
 *
 * The order of the checks is the order of the cost:
 *
 *   1. the session (always first — a Server Action is a public endpoint);
 *   2. the declared size, before a byte is read (`File.size`, the same 15 MB rule);
 *   3. the bytes: `preparePhoto` re-measures them, refuses a shape it cannot read, and **strips the
 *      EXIF** — the metadata goes before the bytes leave this process, so what Sanity holds was never
 *      carrying the photographer's afternoon;
 *   4. the store.
 *
 * `prepared.bytes`, not the browser's bytes, is what is uploaded. That is the whole point of doing the
 * strip here rather than in the browser: a browser can be told to send anything.
 */

export type UploadCarPhotoResult =
  | { ok: true; assetId: string; url: string }
  | { ok: false; errors: FieldError[] };

/** A filename fit to store: no directory parts, nothing but ordinary characters, never blank. */
function storeName(name: string): string {
  const base = name.split("/").pop() ?? name.split("\\").pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ]+/g, "_").trim().slice(0, 120);
  return cleaned || "photo";
}

export async function uploadCarPhoto(form: FormData): Promise<UploadCarPhotoResult> {
  const session = await requireOfficeSession();

  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: [{ field: "photos", message: "Choose a photo to add" }] };
  }

  // The cap, before the bytes are read. `preparePhoto` asks the same rule again of the bytes
  // themselves — this first ask is only so an oversized file is refused without being read.
  const size = checkPhotoSize(file.size);
  if (!size.ok) return { ok: false, errors: [{ field: "photos", message: size.reason }] };

  const type = file.type;
  const bytes = Buffer.from(await file.arrayBuffer());
  const prepared = preparePhoto(bytes, type);
  if (!prepared.ok) return { ok: false, errors: [{ field: "photos", message: prepared.reason }] };

  // The demo total cap is checked on the bytes that would actually be uploaded, after the EXIF
  // strip. Main uploads do not list the asset store.
  if (session.space === "demo") {
    const cap = await checkDemoAssetCap(prepared.bytes.length, { listStoredAssets });
    if (!cap.ok) {
      return { ok: false, errors: [{ field: "photos", message: cap.reason }] };
    }
  }

  const requestedLabel = uploadLabelForSpace(session.space);

  let asset: { assetId: string; label: string | null };
  try {
    asset = await uploadImage(prepared.bytes, {
      filename: storeName(file.name),
      contentType: type,
      label: requestedLabel,
    });
  } catch {
    return {
      ok: false,
      errors: [
        {
          field: "photos",
          message: "The picture store could not be reached, so the photo was not uploaded. Try again.",
        },
      ],
    };
  }

  const mark = await verifyUploadMark(asset, requestedLabel, { deleteAsset });
  if (!mark.ok) {
    return { ok: false, errors: [{ field: "photos", message: mark.reason }] };
  }

  // The id is what the store keeps; the address is derived from it by the one derivation
  // (`lib/sanity.ts`), never stored (truth 7: the asset-reference column never holds a web address).
  return { ok: true, assetId: asset.assetId, url: imageUrl(asset.assetId) };
}
