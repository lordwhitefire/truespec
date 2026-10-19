# TASK-005 — Witness pass: benchmarks 1–11

**Run 2026-10-19** against the dev build on `:3210`, HEAD `9822731`, attach-only Chrome on CDP
`:9222`. The store is the live store. No source file was changed by this pass.

**What this pass is.** It gathers the evidence for the twelve outcome benchmarks in
`openspec/tasks/TASK-005/task.md:334-354`. It is **not** a fresh re-run of every office benchmark.
Four session-independent, read-only benchmarks were re-driven today; the office session expired
during the pass (Chrome redirected to `/office/sign-in`), so the office-dependent benchmarks stand
on their **already recorded live task runs on this build**, and are marked “carried” below. The
8-second expiry is the one benchmark the plan expressly allows to carry from Task 12. Nothing here
is presented as a fresh run that did not happen.

## Fresh today (read-only, session-independent)

| # | benchmark | what was seen | numbers / words | reading |
|---|---|---|---|---|
| 3 | A car with no photos shows a photo-shaped box, not a missing image | **TS-1029**: no `<img>` at all, no broken icon, no counter, no arrows, no thumbnails; a click does not open a lightbox. | 23/23 cards drawn; **0 broken**; gallery 832 × 499; fallback is a data-URI SVG | `runs/task42/photo-box.json` |
| 4 | A photo that fails to load shows the same box as no photo | **TS-1001** with `*sanity.io*` blocked: gallery `<img>` null, no broken icon, no bad alt; counter **1 / 3**, 2 arrows, 3 thumbnails (the real gallery remains), all fallback thumbs drawn at 200 px | 23/23 cards drawn; **0 broken** | same |
| 6 | A dead car link answers a real not-found and keeps the site around it | `/car/TS-9999` → **404**, title *“Car not found \| TrueSpec Automotive”*; crumbs, *“We could not find that car”*, **Message Umar**, **See all cars**, header/footer/related/mbar/lightbox/toasts all present; URL keeps the typed ref | **404**; live and sold cars still **200**; 10/10 verdicts | `runs/car-404/live.json` |
| 10 | An offline tap stays inside our product (showroom) | At 375 and 1440 the approved line appeared above the content, actions were disabled with the reason attached, the page did not navigate, and the line withdrew on reconnect. | line **“You are offline. Reload to see the site.”** · 38 px · appeared **1 204 ms** (1440) / **1 267 ms** (375) · withdrew **51 ms / 43 ms** · **0** tap requests · gate Continue `disabled` · 1 expected `ERR_FAILED` console, **0 HTTP** | `runs/task34/task34.json` |
| 11 | A slow soft navigation shows a waiting sign | The clicked nav Link’s own pending state said *“Loading…”* (role `status`, spinner) while the old screen stayed visible; the page arrived later. Fast leg showed no sign. | 1440: sign **504 ms**, page **9 099 ms**, fast **2 928 ms** · 375: sign **503 ms**, page **9 329 ms**, fast **3 963 ms** · old screen held through the 0.5–5 s samples · **0** console / **0** HTTP | `runs/task33/task33.json` |

## Carried from the live task runs on this build

The session expired before these could be re-driven today; each was already driven live on
`:3210` and recorded. The code under test has not changed since (only Task 41’s note was added).

| # | benchmark | what the live run saw | numbers / words | origin |
|---|---|---|---|---|
| 1 | Delete offers an eight-second undo that visibly drains and closes | A throwaway demo car was deleted; the offer’s bar started full and drained; the animation’s own end closed it; the car became a tombstone, not a hard erase; “Remove for good” cleared it. | registered **8 000 ms** · clock window **8 536 ms** (Task 12), **8 524 ms** (Task 10), **8 336 ms** (Task 11) · failsafe 12 000 ms never won · net-zero **25 → 25** | Task 12, `runs/undo-expiry/live.json`; Task 10/11 |
| 2 | A save that changed nothing says so; a changed save says it saved | Car **TS-1001** (demo): no-op said **“Nothing changed.”** in the panel and toast; the changed and restored saves said **“Saved as TS-1001. The showroom updates immediately.”**; no red box, URL stayed. Settings: the WhatsApp card typed as `0814 692 7170` said **“Nothing changed.”**, POST 200, audit line unmoved, rows byte-identical. | car version **1 → 3** (two real saves; three no-ops did not move it) · **25** cars before/after · changed/restored copy arm on a throwaway branch restored its tagline | Task 5, `runs/car-save-reports/car-save-reports.json`; Task 6, `runs/settings-save-reports/{noop,all}.json` |
| 5 | A failed read keeps the office chrome and says it failed — never a number or an empty list | Forced page failures on the site and the office at 375/1440; the inner boundaries kept the chrome and the retry; the outer layout failures kept no chrome but still said the same words; retry reset. | **“We couldn’t load this”** / **“We tried a few times but the server didn’t answer. Nothing was lost — please try again.”** / **“Try again”** · `falseCount []` · **0** visible empty blocks · forced status 200 (inner) / 500 (outer layout) · store untouched | Task 31/32, `runs/task31/`, `runs/task32/` |
| 7 | A mistyped office address lands in the office, with a way back | `/office/nonsense` and `/office/car/nonsense-ref` → **404** inside the office shell (sidebar, topbar, signed-in identity), not the showroom. | **“That page isn't in the office”** / **“No office screen matches that address. Nothing was lost.”** / **“Back to the dashboard”** → `/office` · 11/11 verdicts · office routes 200 · `/office/car` 307 → inventory · site 404 not merged | Task 9, `runs/office-404/live.json` |
| 8 | More opens the three destinations and does not take the person away | 375: cell **More** (`aria-expanded=false`, `haspopup=dialog`, `controls=more-sheet`); Enter opened a modal named “More”, focus entered **Drafts**, rows `[Drafts, Activity log, Settings]`; Tab stayed inside; Escape/outside tap/choice closed; choice went to `/office/activity`; the sheet was closed and the cell lit. | 375 / 768: `.bnav` grid, same rows · 1280: `.bnav` **none**, sidebar has the same rows · current row `aria-current="page"` | Task 20, `runs/task20/readings.json` |
| 9 | No number is invented, and with no number saved every chat control is visibly off | With the number cleared: header **“No number saved”**, **0** `wa.me` links on all eight documents; every visible chat control had no `href`, `role="link"`, `aria-disabled="true"`, `tabIndex=-1`, the reason title, grayscale .5. Restored: **37** links across the eight, all `https://wa.me/2348146927170…`, no off state. | store restored exactly: **+2348146927170**, `updated_at 2026-10-16T11:55:53.863Z` · net-zero · no invented `2348000000000` / `+234 800 000 0000` | Task 29/30, Gate G; `runs/gate-g/{cleared,saved}.json` |

## B10’s return leg

The showroom leg above is fresh. The office return leg was driven live later the same day:
Task 37’s car and settings drafts restored, and the approved recovery line showed **21 ms**
(car) / **10 ms** (settings) after reconnect; Task 38’s save leg showed it at **3 ms**. The line
was **“You're back online. Your draft is still here — press Save.”**, and the draft survived.
Checkpoint C re-drove the same behaviour with the banner’s 1200 ms appearance check. This is the
approved behavior after Task 37, and it is why the old Task 35 drive’s “banner must withdraw”
assertions now fail (see below).

## The numbers

- **8 000 ms** is the registered bar window and is true: **8 536 ms** clock in Task 12, 8 524 ms
  in Task 10, 8 336 ms in Task 11; the animation end, not the 12 s failsafe, closed the offer.
  This is the one number the plan expressly allows to carry from Task 12.
- **215 ms row departure / 1 227 ms offer arrival** are recorded in
  `findings/05-runtime-observations.md` **§R2.3 §6** (lines 278–279), not §R2.2. `testing.md`’s
  pointer to §R2.2 is wrong. This pass did **not** reproduce those two pre-bar timings: Task 11’s
  current bar run read click **1 661** → offer **3 988** (2 327 ms), with the automation tab’s
  frame cadence at **1 017 ms**, and the row departure was not separately instrumented. The
  8-second claim is verified; the two older timings are not claimed as re-measured.

## Checks that failed, and why they are not product failures

- **Task 35’s old drive exited 1** with `the banner never withdrew`, `the banner did not withdraw`,
  `the banner is still visible`, `the withdrawn banner still has text`. That drive was written
  before Task 37. After a draft exists, the correct post-reconnect screen is the approved recovery
  line; the old assertions expected the pre-Task-37 blank/withdrawn banner. Task 37/38 and
  checkpoint C drove the actual behaviour and passed. The stale assertion is recorded; it is not a
  regression.
- **Office re-runs of `office-404.mjs` and `more-sheet.mjs` exited 1** with a timeout while waiting
  for office chrome. The attached Chrome had lost its Clerk session and was on
  **“Owner sign in | TrueSpec Automotive”**; both are therefore carried from their successful
  Task 9 / Task 20 runs. The sign-in screen is not a product failure.

## Integrity

- Chrome instances **6 → 6** on every drive; no Chrome launched.
- Fresh drives were **read-only**: photo/car-404/offline/slow-nav changed no store row.
- No `ts-draft:` keys were left by the fresh drives; no service worker (`0`), no caches (`[]`).
- No source change in this pass.

## Not run / not established

- **Benchmark 12** — a first-time visitor walk answering the five `testing.md` questions — is
  person-only and was **not run**. It remains in `testing.md` Group 17.
- The **19-group testing handover** in `testing.md` is untouched; this is witness evidence, not a
  group run.
- The **office-dependent benchmarks were not freshly re-driven today** because the Clerk session
  expired; their earlier live runs are the evidence. The final testing handover must sign in first.
- The **rendered office reconciliation** (`scripts/reconcile.ts`) cannot run signed out; the
  store-side net-zero check is in `notes/TASK-005-gates.md`.

## Verdict

Benchmarks **1–11 all have live evidence on this build** and match the claims, with the two
qualifications above: B1's 8 s is carried as the plan allows, and the 215/1 227 ms pre-bar timings
are not re-measured. Benchmark 3/4/6/10/11 were re-driven today; 1/2/5/7/8/9 are carried from their
live task runs. Benchmark 12 remains person-only.
