import "server-only";
import { storeQueryMain } from "./store-guard";
import { sanityClient } from "./sanity";
import { unreferencedLitter } from "./cleanup-litter";

// Cleanup readiness — what is waiting to be cleared, as it stands.
//
// TASK-003 Task 19; task.md truth 10 and line 154: "the office can tell the owner exactly which assets
// are waiting to be cleared — the system clears nothing itself". This file is that telling, and only
// that. It reads. There is no delete here, no scheduled job, no "purge" path: the owner clears, by his
// own hand, in the office (the write flows are TASK-004's — this layer reports).
//
// The store must be able to answer five things, and this is where they are asked:
//   1. a car the owner deleted — the tombstone (car.deleted_at), with its age and everything that
//      travelled with it (photos, cost lines, the sale if there was one);
//   2. an enquiry recorded at or past its year — the retention clock runs from enquiry.created_at
//      (owner ruling: retention from creation, not from any deletion);
//   3. every stored image or file that belongs to a record, by asset reference — a photo row holds a
//      Sanity asset id and nothing else, so ownership is nameable;
//   4. a row pointing at an asset the store does not hold — the case the whole asset-reference shape
//      exists to make visible;
//   5. the two things the owner settled may be cleared without asking (machine litter only, never a
//      record): an uploaded asset no row references, and a sign-in attempt older than 90 days.

export type DeletedCarWaiting = {
  ref: string;
  name: string;
  deletedAt: string;
  ageDays: number;
  photos: number;
  photoAssets: string[];
  costLines: number;
  sold: boolean;
};

export type EnquiryAtItsYear = {
  id: string;
  /** The `ENQ-####` the office knows it by. The row's UUID is not a name the owner reads. */
  ref: string;
  name: string | null;
  number: string | null;
  askedFor: string | null;
  recordedAt: string;
  ageDays: number;
};

/** A row that holds a third-party address instead of an asset reference — not ours to clear. */
export type RowHoldingAnAddress = {
  rowKind: "car_photo" | "enquiry_pdf";
  rowId: string;
  ref: string | null;
  address: string;
  origin: string | null;
};

/** A row that names an asset the store does not hold — the missing-file case. */
export type RowPointingAtAMissingAsset = {
  rowKind: "car_photo" | "enquiry_pdf";
  rowId: string;
  ref: string | null;
  assetId: string;
};

export type MachineLitter = {
  /**
   * Assets in the store no row references — a half-finished upload, never a record. The daily
   * backup's own retained files are excluded: they match their exact name pattern and are not litter.
   */
  unreferenced: { assetId: string; kind: string; filename: string | null; bytes: number }[];
  /** Sign-in attempts past 90 days. */
  staleAuthAttempts: number;
};

export type WaitingToBeCleared = {
  deletedCars: DeletedCarWaiting[];
  enquiriesAtTheirYear: EnquiryAtItsYear[];
  rowsHoldingAnAddress: RowHoldingAnAddress[];
  rowsPointingAtMissingAssets: RowPointingAtAMissingAsset[];
  machineLitter: MachineLitter;
  assetStore: { readable: boolean; assets: number; note: string | null };
};

type RawDeletedCar = {
  ref: string;
  brand: string | null;
  model: string | null;
  trim: string | null;
  year: number | null;
  deleted_at: string | Date;
  age_days: number;
  photos: number;
  photo_assets: string[] | null;
  cost_lines: number;
  sold: boolean;
};

type RawReferencingRow = {
  row_kind: "car_photo" | "enquiry_pdf";
  row_id: string;
  ref: string | null;
  asset_id: string;
};

type RawAddressRow = {
  row_kind: "car_photo" | "enquiry_pdf";
  row_id: string;
  ref: string | null;
  address: string;
  origin: string | null;
};

type RawAsset = {
  _id: string;
  _type: string;
  originalFilename: string | null;
  size: number | null;
  label: string | null;
};

// The driver hands a `timestamptz` back as a Date; every timestamp leaves this module as an ISO
// string, so callers never have to think about which one they got.
const iso = (v: string | Date): string => (v instanceof Date ? v.toISOString() : v);

export async function listWaitingToBeCleared(): Promise<WaitingToBeCleared> {
  // 1. The owner's tombstones, and everything that travelled with each one.
  const deletedRows = (await storeQueryMain(
    `SELECT c.ref, c.brand, c.model, c.trim, c.year, c.deleted_at,
            (now()::date - c.deleted_at::date) AS age_days,
            (SELECT count(*)::int FROM car_photo p WHERE p.car_id = c.id) AS photos,
            COALESCE((SELECT json_agg(p.sanity_asset_id ORDER BY p.position)
                        FROM car_photo p WHERE p.car_id = c.id), '[]') AS photo_assets,
            (SELECT count(*)::int FROM cost_line cl WHERE cl.car_id = c.id) AS cost_lines,
            EXISTS (SELECT 1 FROM sale WHERE sale.car_id = c.id) AS sold
       FROM car c
      WHERE c.deleted_at IS NOT NULL
      ORDER BY c.deleted_at`,
  )) as RawDeletedCar[];

  // 2. Enquiries at their year. The clock is the row's own created_at.
  const enquiryRows = (await storeQueryMain(
    `SELECT id, ref, name, number, asked_for, created_at,
            (now()::date - created_at::date) AS age_days
       FROM enquiry
      WHERE created_at <= now() - interval '1 year'
      ORDER BY created_at`,
  )) as {
    id: string;
    ref: string;
    name: string | null;
    number: string | null;
    asked_for: string | null;
    created_at: string | Date;
    age_days: number;
  }[];

  // 3 + 4. Every referencing row, in one pass: the ones that name an asset, and the ones that still
  // hold a stranger's address.
  const referencingRows = (await storeQueryMain(
    `SELECT 'car_photo' AS row_kind, cp.id AS row_id, c.ref, cp.sanity_asset_id AS asset_id
       FROM car_photo cp JOIN car c ON c.id = cp.car_id
      WHERE cp.sanity_asset_id !~* '^https?://'
     UNION ALL
     SELECT 'enquiry_pdf', ep.id, NULL, ep.sanity_asset_id
       FROM enquiry_pdf ep
      WHERE ep.sanity_asset_id !~* '^https?://'
      ORDER BY 1, 3`,
  )) as RawReferencingRow[];

  const addressRows = (await storeQueryMain(
    `SELECT 'car_photo' AS row_kind, cp.id AS row_id, c.ref, cp.sanity_asset_id AS address, cp.origin
       FROM car_photo cp JOIN car c ON c.id = cp.car_id
      WHERE cp.sanity_asset_id ~* '^https?://'
     UNION ALL
     SELECT 'enquiry_pdf', ep.id, NULL, ep.sanity_asset_id, NULL
       FROM enquiry_pdf ep
      WHERE ep.sanity_asset_id ~* '^https?://'
      ORDER BY 1, 3, 4`,
  )) as RawAddressRow[];

  // 5. The two exceptions — the machine's own litter. Nothing here is a record.
  const authRows = (await storeQueryMain(
    `SELECT count(*)::int AS stale FROM auth_attempt WHERE at < now() - interval '90 days'`,
  )) as { stale: number }[];

  // The asset store is a second read, and it can fail (network, token). A failed read is reported as
  // such — never guessed at, and never reported as "nothing missing".
  let assets: RawAsset[] = [];
  let readable = false;
  let note: string | null = null;
  try {
    assets = (await sanityClient().fetch(
      `*[_type in ["sanity.imageAsset", "sanity.fileAsset"]]{_id, _type, originalFilename, size, label}`,
    )) as RawAsset[];
    readable = true;
  } catch (err) {
    note = err instanceof Error ? err.message : String(err);
  }

  const held = new Set(assets.map((a) => a._id));
  const referenced = new Set(referencingRows.map((r) => r.asset_id));
  const missing = readable ? referencingRows.filter((r) => !held.has(r.asset_id)) : [];

  return {
    deletedCars: deletedRows.map((r) => ({
      ref: r.ref,
      name: [r.year, r.model, r.trim].filter(Boolean).join(" "),
      deletedAt: iso(r.deleted_at),
      ageDays: r.age_days,
      photos: r.photos,
      photoAssets: r.photo_assets ?? [],
      costLines: r.cost_lines,
      sold: r.sold,
    })),
    enquiriesAtTheirYear: enquiryRows.map((r) => ({
      id: r.id,
      ref: r.ref,
      name: r.name,
      number: r.number,
      askedFor: r.asked_for,
      recordedAt: iso(r.created_at),
      ageDays: r.age_days,
    })),
    rowsHoldingAnAddress: addressRows.map((r) => ({
      rowKind: r.row_kind,
      rowId: r.row_id,
      ref: r.ref,
      address: r.address,
      origin: r.origin,
    })),
    rowsPointingAtMissingAssets: missing.map((r) => ({
      rowKind: r.row_kind,
      rowId: r.row_id,
      ref: r.ref,
      assetId: r.asset_id,
    })),
    machineLitter: {
      // A retained backup, the fixed seed and demo uploads are system-owned, not litter. Their exact
      // names/labels are excluded by the pure rule; without it they would sit in the owner's cleanup
      // list and invite him to clear something the system still needs.
      unreferenced: unreferencedLitter(
        assets.map((a) => ({
          assetId: a._id,
          kind: a._type,
          filename: a.originalFilename,
          bytes: a.size ?? 0,
          label: a.label,
        })),
        referenced,
      ),
      staleAuthAttempts: authRows[0]?.stale ?? 0,
    },
    assetStore: {
      readable,
      assets: assets.length,
      note: readable ? null : `the asset store could not be read: ${note}`,
    },
  };
}
