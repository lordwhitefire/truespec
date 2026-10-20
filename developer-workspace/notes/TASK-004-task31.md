# TASK-004 — Task 31 (the flows, exercised in a browser, before and after)

STATUS: **met.** 12/12 flows ran against the signed-in office and moved the store exactly as the
code predicts. The earlier "done" was false and was withdrawn; this is the replacement, with the
store's own counts as the verdict.

Witness: `developer-workspace/scripts/task-004/flows-witness.mjs`
Evidence: `developer-workspace/scripts/task-004/runs/flows/flows-witness-report.txt` (+ `.json`)
Last run: `2026-10-16T10:18:35Z` · session proven `http://127.0.0.1:3210/office/settings — Signed in
as rema6rema6rema6@gmail.com` · **TOTAL: 12/12**.

## The figures before and after

| | counts at the start | counts at the end |
|---|---|---|
| cars | 23 | 25 |
| costs | 102 | 103 |
| photos | 50 | 52 |
| enquiries | 6 | 6 |
| taps | 0 | 0 |
| activity | 23 | 32 |
| drafts | 16 | 21 |
| settings | 3 | 3 |

Per action (the delta is the store's change, so a flow that did not write shows zero):

| flow | Δ cars | Δ costs | Δ photos | Δ activity | Δ drafts | proof |
|---|---|---|---|---|---|---|
| create a car | **+1** | 0 | 0 | **+1** | 0 | toast "Saved TS-1035…"; activity rose |
| edit the car | 0 | 0 | 0 | **+1** | 0 | toast "Saved TS-1035…" |
| change a cost | 0 | **+1** | 0 | **+1** | 0 | toast "Saved TS-1035…" |
| mark sold | 0 | 0 | 0 | **+1** | 0 | toast "Saved TS-1035…" |
| un-mark sold | 0 | 0 | 0 | **+1** | 0 | toast "Saved TS-1035…" |
| upload photos | 0 | 0 | **+1** | **+1** | 0 | one hidden `photos` ref appeared, then saved |
| delete and undo | 0 | 0 | 0 | **+2** | 0 | the car is back in the inventory list |
| template → drafts | **+1** | 0 | **+1** | **+1** | **+1** | upload 201 `cars:2`; an image added by hand (thumbs 0→1); one draft saved, **one left unsaved** |
| import the enquiry PDF | 0 | 0 | 0 | 0 | **+4** | upload 201 `enquiries:4` |
| change a state | 0 | 0 | 0 | 0 | 0 | added then removed (DOM-proof; `car_state` is not in the count set) |
| save a setting | 0 | 0 | 0 | 0 | 0 | changed, saved, **reloaded and read back** (persisted) |
| export | 0 | 0 | 0 | 0 | 0 | a real download, `truespec-export-2026-10-16.zip`, 28,973 bytes |

Two notes against the table, so it is not read as more than it is:
- **change a state** nets zero by design (it adds one and removes it), and it writes `car_state`,
  which the count helper does not count. Its proof is the DOM: the state appeared, then was gone.
- **save a setting** and **export** write no new rows (a setting is an UPDATE; the export reads).
  Their proofs are persistence-after-reload and the downloaded bytes.

## Three faults the first two versions had, and the root cause of each

1. **It signed the owner out.** v1 submitted with `page.locator('button[type="submit"]').first()`.
   The office shell renders its **Sign out** form inside `<aside>` *before* `<main>`
   (`app/office/(shell)/layout.tsx:42-58`), so that locator matched Sign out. Every later page hit
   `/office/sign-in`. Fixed: the witness never uses a bare submit locator — it proves the session
   (`aside.side` + `header.topbar`, no `main.office-door`) and refuses to run without it (exit 3).
2. **It interacted before React hydrated.** A click on `#save` before hydration falls back to a
   **native GET** submit (`/office/car/TS-1030?brand=…&model=Flow2…`), which never reaches the
   Server Action; `setInputFiles` before hydration fires no `onChange`, so the upload fetches
   nothing; `#tagSave` stays `disabled` because its enabled state is React state. Fixed: every
   interaction now waits on a **hydration gate** — React attaches `__reactFiber$`/`__reactProps$`
   to a DOM node only when it hydrates it (`hydrated(page, sel)`); a pre-hydration node has neither.
3. **It read the toast it had already shown.** After clicking `#mkSold`, the page shows "Sold
   chosen…". The witness then waited for *any* `#toast.show`, matched that stale toast, and counted
   before the save landed. Fixed: `waitToast` waits for a toast whose text matches `/Saved/`.

A fourth fault was in the fixture, not the witness: the 1×1 base64 PNG the witness wrote is rejected
by `lib/photos.ts`'s strict chunk walk ("a chunk runs past the end of the file"), so the photo flow
could never pass. Fixed: the fixture is now a real PNG copied from the repo
(`node_modules/playwright-core/.../appIcon.png`). And the template filename is stamped per run
(`car-template-<stamp>.pdf`) so its draft batch is unique and the witness can scope to it.

## Verified independently

- The template fixture reads back through the real reader: `readCarFile` → `ok`, **2 cars**
  (`developer-workspace/scripts/task-004/parse-fixture.ts`).
- The template upload really returns `201 {"ok":true,"kind":"car","cars":2,"refusals":[]}` in the
  browser (`upload-probe.mjs`), and the status reads "2 cars waiting."
- office ↔ showroom **agree on every shared car**: 4/4 paired cells on TS-1001, office
  ₦34,500,000/31,000 km vs showroom ₦34,500,000/31,000 km (task-003 `browser-check.mjs`, run
  2026-10-16T11:21:54Z, all verdicts PASS).
