# 05 — Backup and storage on the free tiers

**Checked:** 2026-10-20, against the current Neon, Sanity and Vercel documentation.
**Tracker items:** 7 and 8.

## The free-tier numbers

**Neon Free**

- **1 GB Postgres storage per project** (raised from 0.5 GB on 2026-10-02), up to 20 GB across all
  projects.
- At 1 GB, inserts/updates/deletes that increase storage **fail** until space is freed or the plan
  is upgraded. There is no overage billing, and Neon does not delete data.
- 100 projects, 100 CU-hours per project per month, 5 GB egress.

**Sanity Free**

- **100 GB of assets**, 100 GB bandwidth per month, 10,000 documents.
- **2 datasets, public only. Private datasets are not included on Free** — they arrive with Growth
  ($15/seat/month). The asset quota is hard: uploads fail at 100 GB; existing assets keep serving.
- The plan's own alerts fire at 80% and 100% of a quota.

**Vercel** is the job runner, not the storage target.

## What this changes

### Q4 — where the encrypted dump goes

The owner's rule is right: a dump with customer names and numbers must never be readable by the
public. On the Free plan a **private dataset cannot be created**. So the free-tier path is:

- **Encrypt the dump** with AES-256-GCM and a 32-byte key held only in Vercel's environment, then
  upload the ciphertext as a file asset to the existing dataset. Anyone can download the file;
  without the key it is noise.
- The alternative is upgrading Sanity to Growth for a private dataset.
- The key is a secret like any other: Vercel env (and `.env.local` for local runs), never the repo.
  Losing it makes the backups unreadable; the owner should keep a copy in a password manager.
- The filename must not leak content: `backup-YYYY-MM-DD.json.gz.enc`.

*(If the Sanity project is already on a paid or trial plan, check Manage → Plan first: a private
dataset may be available. On the documented Free plan it is not.)*

### Q10 — the storage warning

A single combined **4 GiB** figure does not fit the free tiers:

- Neon dies at **1 GB** — a 4 GB combined warning would never speak before the database stops
  accepting writes.
- Sanity allows **100 GB** of assets — a 4 GB combined warning would be dominated by photos and say
  nothing useful about the database.

The honest shape is **two lines in the System card**:

| Line | Used figure | Warning |
|---|---|---|
| **Database** | `pg_database_size(current_database())` | **800 MB** — 80% of Neon's 1 GB |
| **Photos and files** | sum of `sanity.imageAsset.size` + `sanity.fileAsset.size` (includes the encrypted backups) | **4 GB** (the spec's early warning) or **80 GB** (80% of Sanity's 100 GB cap) |

The existing `storage_used_bytes` / `storage_warning_bytes` pair cannot carry both. The task adds a
second pair (or a small named-measurement table) and the card shows two lines. This is a settings
change to record in the task, not a redesign.

### Q5 and Q6 — scope and retention

- **Scope: database only.** The photos already live in Sanity; copying them again doubles space and
  gains nothing for the demo. (Recommended.)
- **Retention: the last 7 dumps.** Deleting an old dump is the system clearing **its own copies**,
  not client data. At the demo's size, seven encrypted dumps are a rounding error against 100 GB.
  (Recommended.)

## Dump mechanics (for the task, not built now)

- No `pg_dump` binary runs in a Vercel Function. The job reads the public schema's tables plus the
  `ts_ref_seq` sequence over the server-only connection and writes a JSON archive (gzip).
- Encrypt (AES-256-GCM, random IV, auth tag), upload with `@sanity/client`
  `assets.upload("file", ...)`, and write `last_backup_at` **only after** the upload returns an
  asset id.
- The dump covers every table the app owns (the exact list comes from the migrations at task time)
  and the sequence values.
- **Idempotent:** the date is in the filename; a second invocation on the same day notices the
  existing asset and does not create a second copy or a second heartbeat.
- **Restore:** a separate script decrypts, verifies, and loads into an empty database or a Neon
  branch in foreign-key order, then restores the sequences. The testing pass includes a drill on a
  branch.

## Dataset visibility — what "private" does and does not do

- Making a dataset private is a **Growth-plan** feature; the Free plan is public-only. The command is
  `npx sanity@latest datasets visibility set <dataset> private` (or Manage → dataset → visibility).
  Unauthenticated queries then return an empty result, not a `401`.
- Sanity's own docs are explicit: **assets in a dataset are always public on the asset CDN, even
  when the dataset is private.** A private dataset stops people *listing* the files; anyone who has
  a file's URL can still fetch it. So a private dataset is **not** a substitute for encrypting the
  backup.
- The current **project/Studio** is private, but the **dataset is public-read** so the showroom can
  read photos without a token; the project id appears in the image URLs. Car photos are public by
  design. **Enquiry PDFs in the same dataset are listable** by anyone who queries it. A private
  dataset would stop the listing, not URL access; truly private PDFs need Media Library signed URLs
  or a private store.
- Changing visibility needs no showroom code change: it only builds image URLs (assets stay public),
  and the office already uses `SANITY_TOKEN` for its API reads. It does cost the Growth plan.

## Answered (findings/07)

- **Q4:** encrypt with a new AES-256-GCM key; upload with the existing `SANITY_TOKEN` to the current
  dataset. **No private dataset, no permissions work.**
- **Q5:** database only.
- **Q6:** keep the last 7 dumps.
- **Q10:** two lines — database **800 MB**; photos and files **4 GiB**.
