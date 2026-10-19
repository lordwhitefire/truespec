# TASK-005 · Task 36 — The device draft store

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 2. **Files:** exactly the plan's four.

## What was built

`lib/device-draft.ts` is the device-side store behind the office's promise, “your draft is kept on this
device.” It keeps **unsaved typing** for the car form and the three settings cards, and nothing else:

- keys are `ts-draft:car:<carId|new>` and `ts-draft:settings:<whatsapp|tagline|tank>`; every value is
  versioned (`v: 1`);
- every storage operation is inside `try`/`catch` — a disabled storage, a full quota, malformed JSON,
  or an unserializable value degrades to “no draft” and never breaks the form (the same rule as
  `components/site/store.ts`);
- `readDraft` / `writeDraft` / `removeDraft` take an optional `DraftStorage`, so the failure paths can
  be tested without a browser; `removeDraft` exists for Task 38's erase acts;
- `createDraftWriter` is a debounced, per-key writer: rapid typing replaces the pending value and
  writes only the last one after **400 ms**; `flush` writes now (pagehide/unmount); `cancel` drops a
  pending write (for an erase).

**Car form** (`app/office/(shell)/car/car-client.tsx`): the form's own `FormData` is the draft payload.
`captureFormData` keeps strings only; the photo input is dropped by name and every other non-string
entry (`File`/`Blob`) is dropped, so photo bytes never enter the draft. Repeated names (`photos`,
`secondaryStateIds`) become arrays. The initial blank is captured once as `base`; typing schedules the
draft after each input. A changed primary state or photo set makes no input event, so two effects cover
those; both remember their first value and write only after a change (StrictMode double-effects do not
write a clean form). Photo metadata is `{assetId, url}` — the store's reference plus the server-built
display address, never bytes. `pagehide` and unmount flush the last keystroke.

**Settings cards** (`app/office/(shell)/settings/settings-client.tsx`): the WhatsApp, tagline, and
full-tank inputs schedule `{ v: 1, base: <last saved value>, value }`. No card writes on load; typing is
the only trigger. The same pagehide/unmount flush applies.

**Boundary:** the enquiries board holds no typing, so no draft is kept there. No customer/enquiry key
is written. The store is the browser's `localStorage` only — nothing is posted and no workspace count
changes.

The **400 ms** delay is a choice (no number is on disk); it is short enough that a normal pause keeps
the typing, long enough that a burst is one write.

## AC

- **A draft of unsaved typing is kept on the device:** car form and settings cards, autosaved and
  debounced; live-proven below.
- **Nothing on the enquiries board:** no hook or key there; the store has only car/settings keys.
- **No customer data:** only form values are captured; no enquiry/customer key exists in the key set
  or the payload.
- **Mirrors `components/site/store.ts`:** `ts-` prefix, JSON, `try`/`catch`, never throws.
- **The car draft is captured as `FormData`:** `captureFormData(new FormData(form))`; `photo` File and
  every non-string entry are excluded; a unit test stores a `Blob` with a byte marker and proves the
  marker never reaches storage.

## Live witness — the office, signed in, 2026-10-19

Attach-only Chrome on `:9222` (UA has no Headless), public dev server `:3210`. The drive typed; it
never pressed Save. Test drafts were removed at the end.

| surface | typed | stored | after reload |
|---|---|---|---|
| add car (`/office/car/new`) | `brand = “Task36 draft probe”` | `ts-draft:car:new`, `v=1`, `base.brand = ""`, `data.brand = probe`, `photos = []` | same draft present; **survives**; clean form had no draft before typing |
| settings → General → tagline | `“Task36 draft probe”` | `ts-draft:settings:tagline`, `v=1`, `base = the saved tagline`, `value = probe` | same draft present; **survives** |

- The car payload's keys are the form's own fields (brand/model/…/costs/stateId/arrivalNote/
  privateNote); no `photo`, no `File`/`Blob`/`data:image`/base64, no customer/enquiry key.
- `keysBeforeCar` was **[]**; after the two drafts it was exactly the two keys above; after cleanup
  **[]**.
- **No server action was posted while typing or reloading** (`next-action` count **0**). The only
  POSTs in the window were two external Clerk session/environment refreshes.
- Console errors **0**; HTTP errors **0**; Chrome **6 → 6** (no launch). Typecheck clean; `npm test`
  **309/309** (5 new tests).
- Readings: `developer-workspace/scripts/task-005/runs/task36/task36.json`; drive `task36.mjs`.

## Not yet / flags

- **Task 37 is not built yet:** the draft survives the reload in storage, but the form still shows the
  page's own blank/server values; restoring it and making the recovery line true is Task 37.
- **Task 38 is not built yet:** a save/discard/sign-out does not erase the draft yet; `removeDraft` and
  the writer's `cancel` are present for it. A saved car's draft remains in storage until then.
- The live drive exercised the add-car form and the tagline card. The same capture/store path runs on
  the edit-car form and the other two settings cards; only the add form and one card were driven live.
- Quota/disabled-storage behaviour is unit-tested with a refusing fake; no live browser was put into a
  quota-exhausted state. Photo bytes are unit-proven (Blob), not live-uploaded.
- **Interpretation to carry to Task 40:** the car draft necessarily contains the car's own `note`,
  `privateNote`, and `arrivalNote` because they are car columns — not customer notes. The settings
  draft for the WhatsApp card contains the office's own business number. Task 40's “never a name,
  number or note” must mean **customer/enquiry** data (SD11), consistent with Task 36's “no customer
  data”; the Task 40 test should pin that boundary, not delete the car form's own fields.
- This is the owner's Q11 widening: a new feature, logged against `task.md`'s “adds no feature” line
  in Task 41/final report.

## Verified

Typecheck clean · `npm test` **309/309** · live **PASS, 0 problems** · Chrome **6 → 6** · no server
action · no store write · only the two `ts-draft:` keys while the test ran, removed after. Files:
`lib/device-draft.ts` (new), `lib/device-draft.test.ts` (new),
`app/office/(shell)/car/car-client.tsx`, `app/office/(shell)/settings/settings-client.tsx`.
