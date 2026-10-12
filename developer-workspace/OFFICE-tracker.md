# Office Pages Tracker — runtime-divergence driven

This tracks the conversion of all office/reference pages from `test-truespec-v2/*.html` to the Next.js app. Workflow per page: **recon** → **ref rules** → **model** → **build** → **compare**. Reference runtime is `:3211` (python3 http.server in test-truespec-v2), build runtime `:3210` (Next.js start), CDP `:9222`. cwd = project root for all Playwright calls.

## Status summary
- Screen 1 (dashboard): done (committed)
- Screen 2 (inventory): done (committed)
- Screen 3 (car form): done (committed) — add-mode compare: pending re-run (open item)
- Screen 4 (enquiries): done (committed)
- Screen 5 (activity): done (committed)
- Screen 6 (settings): done (committed, 22/23 clean — toggle-theme timing race accepted)
  - **settings add-on (RECON-001 state editors + sub-menu): done, verified, uncommitted.** New left sub-menu (General / Car states / Customer states / Account, in-place, URL unchanged) and the two state editors. UI-only, in memory. Report: `developer-workspace/reports/RECON-001-state-editors-report.md`; plan+tracker: `developer-workspace/plans/RECON-001-state-editors.md`. Live-verified 3 widths × 2 modes, no page overflow; typecheck clean.
- Screen 7 (login): done (committed, 21/21 clean)
- Screen 8 (404 public): done
- Screen 9 (Privacy public): done

## Open items (from prior notes)
- Run car-form add-mode compare (7 states) — still pending

## Details

1. **Dashboard (/office/dashboard)** — Status: done (committed). Recon + model + build + compare complete. Commit: includes built page + CSS + artifacts. (Ref: `office-dashboard.html`)

2. **Inventory (/office/inventory)** — Status: done (committed).

3. **Car form (/office/car)** — Status: done (committed). Build + compare done; add-mode compare (7 states) pending per tracker.

4. **Enquiries (/office/enquiries)** — Status: done (committed). Full pipeline complete.

5. **Activity (/office/activity)** — Status: done (committed). Full pipeline complete.

6. **Settings (/office/settings)** — Status: done (committed). States: 23. Clean: 22/23. Accepted: toggle-theme timing race (measurement artifact). Artifacts: `developer-workspace/scripts/office-diff/settings/`

7. **Login (/office/login)** — Status: done (committed). States: 21. Clean: 21/21. Approved `.demo`/control divergences (deleted `.demo` per rule). Artifacts: `developer-workspace/scripts/office-diff/login/`

8. **404 (public /404, /not-found)** — Status: done. Recon + built pages (`app/(site)/not-found/page.tsx`, `app/not-found.tsx`). Build OK, routes return 200. Compare not required per scope (public pages match reference structure; built under Next layout). Checklist: `developer-workspace/scripts/public-diff/404/checklist/404-001.md`. Built + routed correctly.

9. **Privacy (public /privacy)** — Status: done. Recon + built page under `(site)` layout (`app/(site)/privacy/page.tsx`). Build OK, route returns 200. Content/structure matches reference. Checklist: `developer-workspace/scripts/public-diff/privacy/checklist/privacy-001.md`.

## Notes
- Global font fix: `app/office/layout.tsx` and `app/layout.tsx` load `Oswald:wght@500;600;700` (office pages use 600). Corrects weight-600 width alignment vs reference.
- Transition timing (theme toggle) treated as timing artifact (verified by re-capture).
- `not-available.html` in reference is effectively empty/inline state; not a standalone page to build.