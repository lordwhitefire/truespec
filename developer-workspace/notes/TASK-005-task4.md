# TASK-005 · Task 4 — the refusal reaches the screen the person is in

**Asked (plan :148-151).** A refused write arrives in that action's own words, in the screen the person
is in — the car form in its result panel (`role="alert"`), inventory/others in their own toast — the
office chrome is **not** replaced, the store-unreachable page is **not** shown, and "nothing was lost"
is said only where that has actually been established. Verify by forcing a write failure on the car form,
on an inventory delete and on a settings save, on `:3210`, signed in.

## Outcome

**No source was changed, and none was needed.** Task 3 turned a store failure into a returned refusal
instead of a throw, so nothing is rejected, no page boundary is reached, and these screens — which
already render `res.errors[0].message` in their own surface — report it in place. The work of this task
is the **proof**, not an edit. Each of the four files the plan names was read at its refusal surface
and either driven or accounted for.

## The refusal surfaces (change points read, with lines)

| screen | where a refusal is reported | the role it carries |
|---|---|---|
| car form | `car-client.tsx:1044` result panel — `:1054` `<b>Could not save.</b>` + one `<li>` per message | `alert` |
| inventory | `inventory-client.tsx:199` `showToast(res.errors[0]?.message ?? "That car could not be deleted.", true, 6000)`; the toast element at `:460` | `alert` when `toastErr`, else `status` |
| settings | `settings-client.tsx:148,172,194` `showToast(result.error)`; plus the card's own inline `:354-357` `p.err on` + `{tagErr}` | the toast is `alert`; the inline error is a paragraph |
| enquiries | `enquiries-client.tsx:129` `setError(result.errors[0]?.message ?? "The store refused that change")`; rendered inline at `:322-325` `p.err on` | `alert` (inline); the toast at `:347` carries `msg` (success) only, hence `status` |

## What was driven, and what it read

All three readings are in `notes/TASK-005-witnesses.md`; raw JSON under
`scripts/task-005/runs/refusal-in-place/`.

1. **The car form, on the live store** — a Mileage of `9999999999`: all digits, so the app's own reader
   accepts it, but the column is a Postgres `int`, so the store refuses the statement and it rolls back.
   The refusal arrived in the form's `role="alert"` panel as *"That car could not be saved — the store
   refused that change."*; the action's own POST answered **200**; the url, the chrome and even the typed
   form were unchanged; 25 cars before and after. `refusal-in-place.mjs`.
2. **A settings save** and **3. an inventory delete** — forced on a store that refuses **only the write**:
   a throwaway branch `task-005-witness` (`br-rapid-king-b287u6zy`, branched from `production`) carrying
   a `BEFORE INSERT OR UPDATE OR DELETE` trigger on `car` and `setting`, with reads and the
   `session`/`office_user` tables untouched; the dev server was pointed at it, then restarted on the live
   store and the branch deleted. The settings refusal landed in the card's inline error **and** the toast;
   the delete's in its toast with `role="alert"`, the optimistically-removed row returning to 25. Both
   left the url and the chrome untouched. `refusal-in-place-2.mjs`, `delete-in-place.mjs`.

   The stores were then checked **directly, not only on screen**: `production` 25 cars / **0 tombstoned**,
   its `setting` rows unchanged with no stray key; the branch 25 / 0. The live store was never reachable
   from the witness server.

**Established.** In all three places a store failure arrives as the action's own words in the screen the
person is in — car form's `role="alert"` panel, settings card's inline error, inventory's `role="alert"`
toast — with the chrome intact and the store-unreachable page never shown. The research-plan §5 defect
(a rejected Server Action inside `useTransition` replacing the whole office shell) does not happen. DR25
holds: none of the messages claims "nothing was lost", and the unit test at
`lib/store-refusal-rules.test.ts:59` keeps it that way.

## Findings to report

1. **Enquiries reports its refusal inline, not in a toast** (`:322-325`), while the AC's wording is
   "inventory/others in their own toast". It is in place, in its own words, announced (`role="alert"`)
   and the chrome stays — so the substance of the AC holds — but the surface differs from the literal
   wording. Left as it is: changing a surface the Architect chose is not this task's call. **Ruling
   wanted.**
2. **`components/retryable.tsx:24` says "Nothing was lost".** That is the store-unreachable page, which
   this task's AC requires **not** to appear for a failed write — and it does not. DR25 governs failed
   *writes*, so this read-failure page is outside it; but it is still a claim of safety printed on a page
   that can follow a failed read, so whichever task owns that page's honesty should look at it.
3. **Two Task 3 findings are still open** and still need rulings: `app/office/actions/state.ts:114,138,203`
   still throwing, and `lib/car-create.ts:60-61` `ON CONFLICT (id) DO NOTHING RETURNING` (a retried create
   can still end with an empty row). See `notes/TASK-005-task3.md` §Findings.

## New files (this task's tooling)

- `scripts/task-005/refusal-in-place.mjs` — the car-form witness (live store).
- `scripts/task-005/refusal-in-place-2.mjs` — the settings witness.
- `scripts/task-005/delete-in-place.mjs` — the inventory witness, waiting on the toast's **text**.
- `scripts/task-005/branch-sql.mjs` — one statement against the throwaway witness branch, nothing more.
- `scripts/task-005/_lib.mjs`, `load-signin.mjs`, `session-check.mjs` — the attach-only harness and the
  signed-in checks built on top of TASK-004's `_office-browser.mjs`.
- `scripts/task-005/runs/refusal-in-place/*.json` — the raw readings.

## Verification run (this task)

- `npm run typecheck` — clean (no source changed).
- `npm test` — **292/292** pass.
- Three live drives on `:3210`, signed in, against the live store and then against a store that refuses
  only the write; plus direct store reads on `production` and on the branch.
- After the drives: the witness branch deleted, the dev server restarted on the live store, and the
  session re-checked (`session-check.mjs` → `signedIn: true`, sidebar + topbar present, not the door).
