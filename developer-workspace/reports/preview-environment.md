# Preview environment — setup and verification (2026-10-28)

Goal: a preview deployment must never read the production database or the production Sanity asset
store.

## What changed

- **Sanity**: dataset `preview` in project `c2lc8g8n`, public-read. All 63 production assets
  (50 images, 13 files) copied with their original asset ids, so the demo database's existing
  `sanity_asset_id` references resolve. The export tarball's **original** bytes are required:
  uploading the CDN-served (re-encoded) file produces a new asset id and breaks the references.
- **Vercel** project `truespec-k4y6`, Preview only:
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DEMO_DATABASE_URL` → demo Neon branch
    (`ep-rough-smoke-b2d1vf9j`, branch `br-cold-firefly-b2gzi24t`).
  - `SANITY_DATASET=preview`.
  - `NEON_BRANCH=demo`.
  - Production targets are separate records and were not changed.
- Preview deployment `truespec-k4y6-79hsjuy6n-lordwhitefires-projects.vercel.app` built from
  `main` at `36b1d9b`.

## Verified

- `/`, `/inventory`, `/terms`, `/privacy` and `/office/sign-in` render on the preview deployment.
  The HTML image URLs use `cdn.sanity.io/images/c2lc8g8n/preview/` (85 on home, 68 on inventory).
- All 56 asset ids referenced by the demo database exist in `preview`; a sample image and a sample
  enquiry PDF return HTTP 200 from the preview dataset.
- Controlled demo-database probe: set the demo branch's `setting.whatsapp_number` to
  `+2348000000000`; the preview home page showed it. Reverted to `+2348146927170`; the preview
  showed the original again. Production still served the original number throughout.
- Production home page still uses `cdn.sanity.io/images/c2lc8g8n/production/` (85 URLs).

## Not verified / notes

- Office sign-in end-to-end on the preview domain: the page renders, but Clerk's origin allowlist
  was not exercised. The owner should try one sign-in on the preview URL.
- Preview deployments are protected by Vercel SSO. `vercel curl <url>` bypasses it for CLI checks;
  the owner views previews while signed in to Vercel.
- Git deployments remain disabled on `truespec-k4y6`. Create previews with `vercel deploy`
  (without `--prod`), or re-enable Git deployments.
- `vercel env pull` shows `[SENSITIVE]` for Secret variables; the values cannot be read back. The
  deployment behaviour above is the verification.
- The demo Neon branch occasionally drops a direct `psql` connection with an SSL EOF; the app's
  retry handles it. Re-running the query succeeds.
- To reproduce the asset copy: `sanity datasets export production <file> -p c2lc8g8n`, extract it,
  then run `developer-workspace/scripts/import-sanity-assets.mjs <extracted-export-dir>`.
