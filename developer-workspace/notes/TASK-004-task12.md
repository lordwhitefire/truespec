# TASK-004 Task 12 — car update write path (and per-ref edit UI)

Status: **built** (write path + route + form wiring). Gates green. Witness passed.

## What changed

### Server (store)
- `lib/car-update.ts`: the one `carUpdateStatement({id, columns, costs, secondaries, contentHash, hashVersion, actorId})`.
  - Computes `changed`: (content_hash differs) OR (cost set differs) OR (secondary set differs). When false, UPDATE + child writes do nothing; the trailing `UNION ALL SELECT ref FROM car WHERE id=$1 AND deleted_at IS NULL` still returns the ref.
  - Never names `id` or `ref` in SET. `id` is only the `WHERE` key.
  - Replaces cost lines: INSERT … ON CONFLICT (car_id,kind) DO UPDATE; DELETE where kind no longer present.
  - Replaces secondary states: INSERT … ON CONFLICT DO NOTHING; DELETE missing.
  - Logs `activity_event` kind `car.updated` when the row actually changed.
  - The store's `car_identity_is_final` trigger (migration 0018) refuses any write that would change identity.

### Actions
- `app/office/actions/car.ts`: added `updateCar(form)` (reads `carId`, re-validates, computes hash, writes). Shared `readCarForm`/`revalidateCarPaths`. Added `UpdateCarResult` type. `toCarForm` now reads `note` (carried by edit form as a hidden field).
- `lib/car-input.ts` + `lib/money.ts` unchanged.

### UI (office)
- `lib/office.ts`: added `getOfficeCarForEdit(ref)` returning the full car (columns, cost lines, secondaries, section via the one rule, created_at/updated_at). Also added helpers for the edit-read.
- `app/office/(shell)/car/[ref]/page.tsx`: new edit route (per-car). Maps store row → `CarFormData` (including `carId`, `secondaryStateIds`, costs from stored kinds, features from JSON array text, dates formatted, note carried).
- `app/office/(shell)/car/page.tsx`: bare `/office/car` → `redirect("/office/inventory")` (no single demo car).
- `app/office/(shell)/car/car-client.tsx`: added `carId?` and `secondaryStateIds?` to `CarFormData`. In `onSubmit`, branches to `updateCar` in edit mode. Renders hidden `carId` and hidden `note` in edit mode (preserves public note). Secondary checkboxes default-check against `secondaryStateIds` in edit mode. Imports `updateCar` and `UpdateCarResult`.

### Links
- `app/office/(shell)/inventory/inventory-client.tsx`: per-row links → `/office/car/${ref}` (Edit and "Costs incomplete"); `moneyCell` accepts the row.
- `app/office/(shell)/inventory/page.tsx`, `app/office/(shell)/page.tsx`: "Add a car" → `/office/car/new`.
- `components/office/OfficeNav.tsx`, `components/office/OfficeBottomNav.tsx`: car nav → `/office/car/new` with `match=/office/car` so edit pages highlight.
- `app/office/(shell)/activity/activity-client.tsx`: ref link → `/office/car/${r}`.

## Proof
- Unit: `lib/car-update.test.ts` — 5 tests, all pass.
  - writes all 14 columns; recomputes content_hash; never writes id/ref; params present; `changed` false → no UPDATE/children triggered by guard.
- Witness: `developer-workspace/scripts/task-004/update-car-check.ts` — PASSED 22/22 (rolled back).
  - edit changes values + recomputes hash; retry advances no version, writes no duplicate costs/events; no-op save moves nothing; identity changes refused by `car_identity_is_final`.

## Gates
- `npm run typecheck` — clean.
- `npm test` — 100/100.
- `npm run leak-check` — 18/18 public.
- `npm run build` — clean; `/office/car`, `/office/car/[ref]`, `/office/car/new` present.
- `npm run store-freshness` — passed.

## Notes
- The public `note` is not a visible form field. In edit mode it's carried as a hidden `name="note"` so it's preserved (and consistent with the change-check). The reference has only the private notes textarea.
- The office routes are behind Clerk; browser E2E of the edit flow wasn't run (no session). The gate discipline (leak-check/typecheck/test/build/store-freshness) remains green.

## Related
- `developer-workspace/scripts/task-004/create-car-check.ts` — create witness (prior).
- `openspec/tasks/TASK-004/task.md`, `developer-workspace/plans/TASK-004-plan.md`.
