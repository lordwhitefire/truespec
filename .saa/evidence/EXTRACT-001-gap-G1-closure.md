# EXTRACT-001 — Gap G1 closure (build-side verification)

**Date:** 2026-10-11
**Methodology:** runtime-divergence (differential runtime comparison)
**Status:** G1 CLOSED — build inventory independently verified on a stable production build

## What the gap was

The six reference checks all PASS. The one outstanding item was **G1**: the *build*
inventory (`build.json`, 196 elements / 2960 rules) could not be independently
verified, because it had been captured from `next dev` — and the dev CSSOM is not
stable. Across reloads the dev page changed: element count 194/196/197, an extra
dev-overlay shadow host, an inline `<style>` sheet of ~380 rules, and version-stamped
CSS URLs (`*?v=...`) that changed on every reload. A comparison against a moving
target proves nothing.

## What we did

1. `npm run build` — Next.js 15.5.27 production build (`✓ Compiled successfully`). Build log: `prod-build.log`.
2. `npm run start -- -p 3212` — production server (no HMR, no dev overlay). Server log: `prod-server.log`.
3. Confirmed the production page is **stable**: three cold loads byte-identical (`sha1 = e3f1c8ab3637`, 25024 bytes); CSS is content-hashed (`914ddc1397b5235e.css`, `bb1208c7758a01ea.css`) with no version query.
4. Re-ran the **independent** census against the production page, twice cold: `verify-build-prod.mjs` → `build-prod-census.json`, `independent-rules-build-prod.json`.
5. Ran the extractor against the **same** production page: `extract-rules.mjs .saa/evidence/extract001-prod.config.json .saa/evidence/extract001-prod/` → `extract001-prod/build.json`.
6. Compared them: `compare-prod.mjs` → `build-prod-check.json`.

## Result — build-side checks PASS

| Check | Extractor | Independent | Verdict |
|---|---|---|---|
| Element count | 177 | 177 | PASS |
| Rule total | 2582 | 2582 | PASS |
| by-kind | style 2430 / at-block 16 / keyframes 23 / keyframe 62 / font-face 51 | identical | PASS |
| per-sheet | 914d…css 350, bb12…css 187, Google Fonts 41, Font Awesome 2004 | identical | PASS |
| Style-selector set | 2384 distinct | 2384 distinct | PASS (0 differences either way) |

Stability: two cold loads → identical element count, identical rule total, identical rule sets. Verdict **STABLE**.

## Why the saved dev inventory differed (and why that is not an error)

The original `build.json` (dev) recorded 196 elements / 2960 rules. The production page
has 177 / 2582. The delta is entirely dev-vs-prod, not a census disagreement:

- The dev run had an **inline `<style>` sheet of 384 rules** (Next dev runtime/overlay) that does not exist in production.
- Dev served per-route sheets with version stamps (`app/(site)/layout.css?v=…` 349, `app/(site)/car/[ref]/page.css?v=…` 182); production bundles them into two content-hashed sheets (350 + 187).
- Dev rendered ~19 extra elements and 2 extra shadow hosts (the Next dev overlay / error-indicator).

None of these are present once the app is built for production, which is precisely why
the production page can be verified and the dev snapshot could not.

## Verdict

**G1 is closed.** The extractor's build inventory is complete and independently
confirmed on a stable production build: exact agreement on element count, rule total,
kind breakdown, per-sheet counts, and the full style-selector set (both directions).

## Reproduction

```bash
npm run build
npm run start -- -p 3212 &
node .saa/evidence/verify-build-prod.mjs
node developer-workspace/scripts/extract-rules.mjs \
  .saa/evidence/extract001-prod.config.json .saa/evidence/extract001-prod/
node .saa/evidence/compare-prod.mjs
```

## Artefacts

- `build-prod-census.json` — independent production census (two cold loads, stability verdict)
- `independent-rules-build-prod.json` — independent production rule list
- `extract001-prod/build.json` — extractor production inventory
- `build-prod-check.json` — the set comparison
- `prod-build.log`, `prod-server.log` — build and server output
- `extract001-prod.config.json` — the derived config pointing the extractor at `:3212`
