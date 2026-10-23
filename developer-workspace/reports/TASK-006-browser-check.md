# TASK-006 — runtime browser check

Date: 23 October 2026  
Build: `http://127.0.0.1:3210` (throwaway Neon branch `task006-throwaway`)  
Reference: `http://127.0.0.1:3211` (`test-truespec-v2`, static)  
Automation Chrome: visible, CDP `:9222`, Chrome 149; **no screenshots**  
Tabs: **2 before, 2 after** (build + reference); no tab was opened during the check.

## How it ran

- Attached to the existing visible automation Chrome; the UA had no `Headless` marker.
- The harness refuses to run unless exactly two tabs are already open, and reuses them.
- The automation Chrome count with `--remote-debugging-port=9222` was **1 before, 1 after**.
- Build was branch-backed. No destructive action ran against the configured live store.
- The office was already signed in; the Clerk sign-in page did not appear.

## Build cell matrix — 38 cells

Office widths `1440 / 820 / 560 / 390`, public widths `560 / 820 / 1100`; dark and light at each
width. Every cell returned `200`, the expected heading, theme, and no horizontal overflow after the
fix below.

| Surface | Widths | Themes | Cells | Result |
|---|---|---:|---:|---|
| Enquiries | 1440, 820, 560, 390 | 2 | 8 | PASS — heading and `ENQ-####` rows |
| Add a car | 1440, 820, 560, 390 | 2 | 8 | PASS — heading, form, exactly one `submissionId` |
| Activity log | 1440, 820, 560, 390 | 2 | 8 | PASS — 118 actor labels, email visible |
| Settings / Account | 1440, 820, 560, 390 | 2 | 8 | PASS — System + three notices + cleanup card |
| Privacy | 560, 820, 1100 | 2 | 6 | PASS — rights copy, WhatsApp, no email |

Total: **38 build cells, 0 failures**.

### Manual probes on the build

- **Enquiry delete / Cancel:** opened `ENQ-0004` → `Delete` → confirmation copy names the enquiry,
  the imported-sheet outcome and the taps that stay → `Cancel` → `ENQ-0004` remained on the board.
  No delete fired.
- **Add a car:** saved on the branch with the form's minted `submissionId`
  `608409fc-1dc0-452b-8e5c-f7feffa5ca18`; the browser landed on `/office/car/TS-1072`. The branch
  row has `id = 608409fc-1dc0-452b-8e5c-f7feffa5ca18` and `ref = TS-1072`, so the id is the
  form-session id as intended. The browser save was done once; the duplicate-save witness is the
  server-side branch check, not a second browser save.
- **Activity email:** the actor email is visible at 1440/820/560/390; it is not clipped or hidden.
  The Deleted filter on this branch had 51 car-deletion rows with the email, but no
  `enquiry.deleted` row at this point, so the specific Deleted-filter enquiry row was not exercised
  in the browser (the branch witness covers the event payload).
- **Settings:** the Account tab shows the database, photos/files and backup lines and the
  “Waiting to be cleared” card with deleted cars, aged enquiries, unreadable-address rows, missing
  assets and machine litter. The card has no delete controls. Its numbers are branch data; they are
  not a reading of the live store.
- **Privacy:** the rights copy names WhatsApp and the saved number; links resolve to
  `https://wa.me/2348146927170`; `mailto:` links: 0; `@` characters in the page body: 0.
- **Dashboard:** the recent-activity row shows the actor email.

## Reference vs build — changed existing surfaces

Reference cells: 3 (one width, light), because the reference is the old static implementation.

| Surface | Reference | Build | Classification |
|---|---|---|---|
| Privacy | `PRIVACY NOTICE`, generic “message us on the number below”, 2 WhatsApp links, no mailto | explicit saved WhatsApp number and the imported-sheet / tap-record consequences, 6 WhatsApp links, no mailto, no email | **Intended** — Q11 / T17 |
| Activity log | 12 rows, **0** visible actor labels, no email | 118 visible actor labels, owner email shown | **Intended** — Q9 / T14 |
| Add a car | Add mode, 18 fields, **0** `submissionId`, static demo save | 18 fields plus one minted `submissionId`; Save lands on `/office/car/<ref>` | **Intended** — Q10 / T13 |

New surfaces have no reference counterpart and were checked build-only: the enquiry delete
confirmation, the System card and the cleanup card.

## Unintended divergence found and fixed

At `390px`, Settings overflowed horizontally by **24px**. The cause was the cleanup card’s
machine-litter filenames: the `<b>` filename did not shrink or wrap. Changed
`app/office/(shell)/settings/settings.css` so the name shrinks and wraps
(`flex: 0 1 auto; min-width: 0; max-width: 100%; overflow-wrap: anywhere`). Rebuilt, restarted on
the branch and reran the full matrix: **0 overflow at every cell**.

No other unintended divergence appeared.

## Not checked

- No destructive enquiry deletion, final PDF file deletion, or cleanup in the browser. Those were
  exercised by the branch witness only.
- No second browser Save; duplicate-save idempotency is the branch witness `car-double-save-check`.
- No Clerk sign-in or lockout flow; the owner session was already valid.
- No Vercel WAF, Clerk console settings, or Vercel Production environment values.
- No backup route UI (there is no UI); the route and restore were benchmarked server-side.
- Reference was compared at one width in light theme only; the full cell matrix is build-only.
- Touch hardware was not used; narrow widths were emulated.
- Sanity asset deletion and PDF upload were not exercised from the browser.

## Artifacts

- `developer-workspace/scripts/task-006/runs/summary.json`
- `developer-workspace/scripts/task-006/runs/browser-check.txt`
- `developer-workspace/scripts/task-006/runs/{enquiries,add,activity,settings,privacy}/surface-probe.{json,txt}`
- `developer-workspace/scripts/task-006/runs/reference/surface-probe.{json,txt}`
- `developer-workspace/scripts/task-006/runs/manual/enquiry-cancel-dashboard.txt`
- `developer-workspace/scripts/task-006/runs/manual/privacy-saved-number.txt`
