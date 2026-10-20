TASK-004 — Report (Tasks 31–34)

STATUS: complete for Tasks 31, 32, 33 **and 34** — every gate, witness and refusal is green, and
Task 34 (the owner's checkpoint-D fixes) is built and verified. This report supersedes two earlier
ones: the false "done", and the "CORRECTED / NOT complete" report of 2026-10-16 08:26 that replaced
it. Both were written before the flows had ever really run. What follows is the current record, with
the artefacts it stands on.

Task 34 closed in two passes. The **first** built the badge's form and the tabs; the **second** (this
one) followed two owner rulings of 2026-10-16 — the notice behaves as a **live notification** (the
figure is the taps **since the office last looked**, it **clears when the taps are viewed**, and the
**glyph persists at zero**), and Finding A (**the shell's count read is guarded**, so a store failure
takes only the notice, not the whole office). Both are built; every gate is green on the final tree.

History, kept honestly: an earlier version of this report claimed Tasks 31–33 done. It was false —
the first flows witness had no signed-in session and its `button[type="submit"]` locator matched the
office shell's Sign out button (`app/office/(shell)/layout.tsx:42-58`), so it signed the owner out
and the store never moved (`activity 0 → 0` is decisive — a real car create writes an
`activity_event`). Commit `2584421` withdrew it and rewrote the witness. The owner then signed in,
the rewritten witness ran, and this report is the result.

## The two closure fixes (this session)

**33a — leak-check cost-value match (digit boundary).** `scripts/leak-check.ts` reads each car's
private total cost from the store and asserts it never appears on a public route. It matched with
`body.includes(value)` over the raw kobo digits, so a cost of `5500000` matched **inside** the public
price `4550000000` — a false alarm, no cost on the page. The match moved to `lib/leak-match.ts`
(`mentionsValue`): a digits-only value is a hit only on digit boundaries; a formatted value is
matched verbatim. Witnessed: **four** cars carry a raw total cost of `5500000` (TS-1029/1031/1033/
1035) and `4550000000` is really on `/inventory`, yet `npm run leak-check` **PASSES** (21 routes,
36 cost values) and `mentionsValue` returns **false** for `5500000` and **true** for `4550000000` on
that same page. The check keeps its teeth: `lib/leak-match.test.ts` **7/7** plants a real whole-number
leak (caught) beside the substring collision (not caught).

**33b — office reconcile through the browser.** `scripts/reconcile.ts` read the rendered office with
a server-side `fetch` and no credentials. The office is behind the Clerk door and the session cookie
lives **only in the browser**, so the fetch read the sign-in page and every figure came back `?`
(exit 1) — see the captured `runs/task32/reconcile.log` (all `office ?`, `rows rendered 0`). The
office side is now read through the standing browser procedure: the new harness
`developer-workspace/scripts/task-004/_office-browser.mjs` (`readOfficePages`) attaches to the Chrome
on CDP `:9222` (never launches, never headless, ≤10 chromium, reuses the signed-in tab, detaches),
and `reconcile.ts` feeds its `page.content()` into the unchanged parsers. The default host moved to
`127.0.0.1:3210` because cookies are host-scoped and the owner signed in there. Result: reconcile
**VERDICT — every figure the office shows is the shared rule's output over the one car table**, exit 0.
(The 7-day lifetime is Clerk's own session cookie, stated by Clerk — not a rule the owner set.)

## Task 34 — the tap notice, the taps tab, refresh on focus (owner checkpoint D)

Checkpoint C closed with the owner confirming the tap path works and raising four things — the badge's
**form**, its **placement**, that the **full tap list has no home**, and the dashboard spec's unbuilt
**refresh-on-focus**. They became **Task 34**. The first pass at it — a labelled "WhatsApp taps" row at
the foot of the sidebar nav — was **rejected by the owner** (*"you putting it in the nav bar is
complicating matters"*) and reverted. The form, the two homes and the tabs were then **put to the
Designer**, which ruled all six open questions in
`design-workspace/decisions/tap-notice-badge-form-and-placement.md`; the build follows that ruling.

**What shipped.** The notice is a **notification badge**: the WhatsApp glyph with the count on a gold
circle at its top-right (the cart-icon pattern) — `components/office/TapBadge.tsx` — capped `99+` and
**the glyph persists at zero: only the circle clears** (owner ruling, 2026-10-16 — supersedes the
first pass's "absent entirely at zero"). The accessible name lives on the **link** that carries it,
`components/office/TapNotice.tsx` — named **"N new WhatsApp taps"** (singular at one), and just
**"WhatsApp taps"** when there is nothing new — so the figure is announced once, never twice. That
link sits in **two homes**, both fed by one count read in the shell (`layout.tsx`): the phone
**topbar** (rightmost icon, every office route) and the desktop **sidebar account footer** (last in
`.srow`), and it opens `/office/enquiries?tab=taps`.

The figure is no longer an all-time total: it is the taps **since the office last looked** (owner
ruling, 2026-10-16 — supersedes open question (ii)). A new one-row **`tap_seen`** table
(`migrations/0023_tap_seen.sql`) holds the **watermark** — the `at` of the newest tap **actually
rendered**, resolved by the store itself so it can never be fast-forwarded and in-flight taps stay
new. The count is `tap.at > seen_through`; the watermark only moves forward (`GREATEST`); no row means
every tap is new. Viewing the **Taps tab** writes it — a **POST Server Action** fired on mount by
`components/office/MarkTapsSeen.tsx` (`app/office/actions/tap.ts`), which revalidates the shell so the
badge clears live (the read/write split the spec requires: **no GET changes data**, `task.md:253`).
`getOfficeTapCount()` (all-time) is kept; the badge reads the new `getNewOfficeTapCount()`. The
architecture change (new table, write-on-view, semantics) is recorded for the architecture agent in
`developer-workspace/architecture-deviations/TASK-004-tap-seen-watermark.md`.

The full tap list now has a home: **a tab inside the Enquiries page**, not a new route.
`app/office/(shell)/enquiries/page.tsx` carries an Enquiries · Taps tab row and chooses the panel **on
the server** from `?tab`, so the notice and the list come from one read with no client flash. The
dashboard panel's link — which used to read "All enquiries" and landed on a page of **customer
enquiries, not taps** — now reads **"All taps"** and opens the tab; the first pass's count chip
(`.ph2t`) is gone.

The list is read **uncapped**. `getOfficeTaps()` stays bounded by `TAP_LIMIT = 200` — it is the
*panel's* read, and `lib/export.ts` already states the rule ("an export is not a panel"). A new
`getAllOfficeTaps()` is `getOfficeTaps(null)`: the same table, the same join, the same one query, cap
lifted — because a list a person asked for must not be quietly short.

Refresh-on-focus (`openspec/.../specs/dashboard/spec.md:35-40`) was built in the first pass and
**kept**: `components/office/FocusRefresh.tsx` listens for `visibilitychange`/`focus`, gated on the tab
really being visible and a 3s cooldown, and calls `router.refresh()` — a refresh, not a reload. There
is no manual Refresh control anywhere.

## Gates — the learned order, on this tree

- **leak-check** — PASSED: no cost/currency/profit value, no asset/file reference, no customer
  detail, no office state label on any of 21 public routes.
- **typecheck** — clean (`tsc --noEmit`).
- **test** — **285 pass · 0 fail** (278 existing + 7 new in `lib/leak-match.test.ts`).
- **build** — succeeds (all office routes dynamic; middleware 92.3 kB).
- **store-freshness** — PASSED: none of 9 store-reading routes prerendered; no DB response cached.
- **Re-run for Task 34, first pass (2026-10-16):** all five green on the Task 34 tree — leak-check
  **PASSED** (21 public routes), typecheck clean, **285/285**, build succeeds, store-freshness PASSED.
  (The first Task 34 gate run hit a `.next` corruption — a `next build` beside the running `next dev`
  left the dev server without its vendor chunks and `/car/TS-1025` answered 500. Cleared with
  `rm -rf .next` and a dev restart; every route then 200 and the log carried no errors. This is the
  plan's own learned rule — leak-check *before* build, and restart dev after any build.)
- **Re-run for the badge-semantics pass (2026-10-16, final):** all five green again on the final tree —
  leak-check **PASSED** (21 public routes), typecheck **clean** (it covers `developer-workspace`, and
  caught a stray type argument in the new `taps-seen-check.ts`; fixed), **285/285**, build succeeds,
  store-freshness PASSED. Dev restarted after the build.

## Witnesses, with numbers

- **Flows witness (Task 31)** — `runs/flows/flows-witness-report.txt`, ts `2026-10-16T10:18:35Z`
  (this tree's harness). Session DOM-proven, signed in as `rema6rema6rema6@gmail.com`. Store before
  `cars 23 · costs 102 · photos 50 · activity 23 · drafts 16` → after `cars 25 · costs 103 ·
  photos 52 · activity 32 · drafts 21`. **TOTAL: 12/12 steps produced the expected store change** —
  create (+1 car, +1 activity), edit (+1 activity), change a cost (+1 cost, +1 activity), mark sold
  (+1 activity), un-mark (+1 activity), upload photos (+1 photo, +1 activity), delete+undo (+2
  activity), template→drafts (+1 car, +1 photo, +1 draft, +1 activity), import the enquiry PDF
  (+4 drafts), change a state (add-then-remove, DOM-proven `addedThenRemoved`), save a setting
  (read-back persisted), export (real download, 28,973 bytes).
- **Store state, demo marker, wipe, export (Task 32)** — `runs/task32/task32-report.txt`, re-run
  this session, exit 0. **5/5 verdicts PASS**, incl. *the office and the showroom agree on the same
  car (TS-1001) at every shared cell — 4/4 paired cells, office ₦34,500,000 / 31,000 km vs showroom
  ₦34,500,000 / 31,000 km*. **25/25 cars, 21/21 drafts, 6/6 enquiries carry `is_demo`**; the
  demonstration created 8 cars and 21 drafts; child rows off a non-demo car = **0/0/0**. Wipe **dry
  run: true (nothing changed)**; `ids lost that were not the demo's: none`. Export opened: 9 entries
  (`README.txt`, `master.json`, `cars.csv`, `costs.csv`, `photos.csv`, `enquiries.csv`, `taps.csv`,
  `activity.csv`, `settings.csv`), `master.json` counts match the store.
- **Office reconcile (Task 33)** — exit 0, all figures reproduced: 24 cars in stock, 18 available,
  6 on order, money tied up **₦741,140,000**, projected profit ₦220,360,000 (14 of 24), real profit
  ₦7,840,000, sold car 2021 Civic EX.
- **Task 34 — the notice's picture, pure (no session needed)** — `tap-badge-check.ts` **17/17**,
  rendering the real components. At zero (and at a negative) it **draws the glyph and no circle** — the
  glyph persists, only the circle clears; one and seven draw their figure; the WhatsApp glyph is there;
  the count sits on a circle at the glyph's top-right; the whole picture is decorative (`aria-hidden`,
  no `role`, no `aria-label`); the circle is `var(--gold)` with the `--dk` ring; `99+` past 99; and the
  **link** persists at zero, named **"WhatsApp taps"** there and **"1 new WhatsApp tap"** in the
  singular, opens `?tab=taps`, keeps the figure announced once, and states the **true** count past the
  `99+` cap.
- **Task 34 — the notice and the tabs, live** — `tap-notice-check.mjs` **24/24**, attach-only CDP
  :9222 against the signed-in office, driving the real routes (raw log:
  `runs/task34/tap-notice-check.out`). The notice is in **both** homes (topbar and `.sfoot .srow`), the
  last icon in the topbar and the last thing in the account row, and its glyph is present with the
  store reset to "unseen": named **"2 new WhatsApp taps"**, opening `?tab=taps`; its circle's **live
  computed** style is gold `rgb(200, 162, 74)` with the `--dk` ring `rgb(33, 37, 41)`, and it appears
  **only when there is a new count**; the dashboard panel's link reads **"All taps"**; there is **no
  manual Refresh control**; a real `focus` event makes the router re-fetch the route (**an RSC
  request**), the page's own JS state survives (**not a reload**), the tab was visible; the tabs are
  **Enquiries · Taps** with Taps selected (`aria-current`), one `h1` "Enquiries", the board not drawn
  on Taps, and the Taps list holds the tap record; and **viewing the Taps tab clears the badge** — the
  name becomes just "WhatsApp taps" and the circle is gone (`{cleared:true, label:"WhatsApp taps",
  circle:null}`). No Chrome launched (6 → 6).
- **Task 34 — the seen-watermark, against the store** — `taps-seen-check.ts` **9/9**. Drives the real
  `getNewOfficeTapCount()` / `markTapsSeenThrough()`: `tap_seen` holds only `id · seen_through ·
  updated_at`; with no watermark every tap is new (the count equals the rows); marking through the
  newest clears it to 0; a stale caller naming an **older** tap cannot re-expose newer ones
  (**forward-only**, 0); an id no row holds writes nothing; a tap arriving **after** the mark is new
  again (the count climbs, 1); the all-time figure still counts every row; and the store is
  **restored** (its own rows gone, the watermark as it was found).
- **Task 34 — the panel capped, the list not** — `taps-tab-check.ts` **7/7**. Puts `TAP_LIMIT + 5` taps
  of its own in, reads both ways, and removes exactly what it added: the panel read is **exactly 200**,
  the full read is **207**, and the row **one past the cap** is in the list and **not** in the panel —
  the row a person would have found at the foot of "All taps" and the panel would have silently hidden.
  Store back to **2 = 2**.
- **`dashboard-feeds-check.ts` re-run (Task 34)** — **19/19** still, including *"the read is bounded by
  TAP_LIMIT"*: lifting the cap for the list did not lift it for the panel.
- **Refusals (Task 30)** — 12/12, each rule named (`runs/refusals/refusals.json`). The ten refusals,
  each asked and returned: (1) an office route with no session → `requireOfficeSession()` →
  `SIGN_IN_PATH`, refused before it reads anything; (2) the door itself, checked again client-side;
  (3) `POST`-only API routes answer `405` to a `GET`, so a GET cannot reach a write; (4) `/api/export`
  with no session → `401`, empty body; (5) a malformed WhatsApp number →
  `normaliseNigerianMobile()` refuses with its reason; (6) a bad amount → `parseCostAmount()` +
  `readCarInput()` at the field; (7) a file that is not our template/sheet → `readCarFile()` /
  `readEnquiryFile()` refuse with their own constants; (8) a caller-supplied `content_hash` is not a
  field the reader keeps, so it cannot reach the store; (9) deleting an occupied state →
  `ON DELETE RESTRICT` (**23001**), and a primary state since `0020` by
  `car_state_primaries_are_final` (**23514**); (10) an identity change → `refuse_identity_change()`
  (**23514**, the trigger names itself); plus `car.content_hash NOT NULL`. A refused request writes
  nothing — the counts show it. The door is a **200 streamed, client-side redirect** with no leak.

## Not done / not verified

- The **signed-in happy path in a real reader** for the car-template download and the enquiry
  import (Task 20/23) — the flows witness drives uploads through the browser, but a *human* filling
  the blank in Acrobat is not run.
- The **idle-path revoke** (push a session's `last_seen_at` 13 h back) is reasoned, not executed.
- **No restore script** for the store; the scratch rebuild is the recovery, and it re-seeds.
- The refusals' `503` store-down paths are not re-run here.
- **The guarded count read's failure path (34e) is verified structurally, not live.** Typecheck proves
  the `try/catch` compiles; the store-failure branch (read throws → `tapCount = 0` → notice absent →
  shell alive) was **not** induced against a running server, because a broken store also breaks the
  page's own reads and there is no clean way to fail *only* the layout's count query without mock
  wiring. The fallback is `try/catch` around one `await`, and the zero case is already witnessed
  (`tap-badge-check` — nothing draws at zero). Honest status: not live-witnessed.

## Findings / carried

1. **Task 34 — the shell's count read is now guarded (fixed as 34e, 2026-10-16).** `app/office/(shell)/layout.tsx`
   awaited `getOfficeTapCount()` for the notice; a store failure threw in the **layout**, taking the
   whole shell — every office route — down instead of the notice simply being absent. The required
   error state is "**notice absent, shell alive**". **Built:** the read is wrapped; on failure `tapCount`
   stays `0` (the notice draws nothing at zero), the shell renders, and the failure is
   `console.error`-logged (never silently swallowed). Verified **structurally** (typecheck clean);
   the induced-failure path is **not** witnessed live (see "Not done / not verified").
2. **Task 34 — the badge semantics the owner wants (the seen-mark; now BUILT).** The owner
   (2026-10-16) redefined the notice as a **live notification**: the number appears on the glyph; the
   owner **taps it (or opens the Enquiries Taps tab) and the number clears, leaving only the glyph**;
   new taps make it **reappear and climb** until checked again. This **supersedes** open question (ii)
   (the all-time total) and **answers** (i): the **glyph persists — only the circle clears.** **Built:**
   the one-row **`tap_seen`** watermark table (`0023`), `getNewOfficeTapCount()` /
   `markTapsSeenThrough()`, the **POST** Server Action `markTapsSeenAction` and the on-mount writer
   `MarkTapsSeen.tsx`, and the badge/notice reading the new count — no GET writes the mark. Witnessed:
   `taps-seen-check.ts` **9/9** (store) + `tap-notice-check.mjs` **24/24** (live clear). The
   architecture change (new table, write-on-view, semantics) is recorded for the architecture agent in
   `developer-workspace/architecture-deviations/TASK-004-tap-seen-watermark.md`; pattern research in
   `notes/TASK-004-badge-seen-state-research.md`.
3. `app/(site)/layout.tsx:88` renders `{num || "+234 800 000 0000"}` — a missing `whatsapp_number`
   setting makes the showroom invent a phone number (latent). TASK-003 showroom code; wants a ruling.
4. The stale `refusal-proof.ts` (Task 6) still expects 3xx and lists `/office/drafts` as unbuilt;
   `refusals.mjs` (Task 30) supersedes it. Recorded, not deleted.
5. `pdf-lib@1.17.1` is unmaintained (2021); every use is inside two files, so the maintained fork
   `@cantoo/pdf-lib` is an import change — flagged, not decided silently.

## Gaps this layer hands over (named, not hidden)

- **TASK-005:** the wording of the retryable state; the per-width interaction split (incl. the
  genuinely-open tablet nav); toast/confirm presentation; the 8-second undo's presentation.
- **TASK-006:** the daily job — the drift report, the retention notice, the `last_backup_at`
  heartbeat, the `auth_attempt` 90-day trim, and clearance of assets no draft and no record
  referenced.
- **Architecture:** the pending rewrite of the specs' **"section"** vocabulary to **"primary
  state"** (D15 d) — built to D15's semantics, logged rather than silently rewritten.
- **Carried from TASK-003:** the seed's child-row id churn; `components/CarCard.tsx:31`'s dead `mi`;
  `lib/serialize.ts:153`'s `mileage`→`mileageKm` alias (name only).

## Evidence index

- Gates: `runs/TASK-004-baseline-gates.txt` (baseline) + this run's console output.
- Flows: `developer-workspace/scripts/task-004/runs/flows/flows-witness-report.txt`.
- State/wipe/export: `developer-workspace/scripts/task-004/runs/task32/task32-report.txt`.
- Refusals: `developer-workspace/scripts/task-004/runs/refusals/refusals.json`.
- Reconcile (before): `developer-workspace/scripts/task-004/runs/task32/reconcile.log`.
- Browser procedure: `developer-workspace/procedures/browser-check.md`.
- Notes: `notes/TASK-004-task30.md`, `notes/TASK-004-task31.md`, `notes/TASK-004-task33.md`,
  `notes/TASK-004-badge-seen-state-research.md` (the unread-badge pattern, for the 34e follow-on).
- Task 34 witnesses: `developer-workspace/scripts/task-004/tap-badge-check.ts` (pure, 17/17),
  `tap-notice-check.mjs` (live, 24/24; raw log `runs/task34/tap-notice-check.out`),
  `taps-seen-check.ts` (store, 9/9), `taps-tab-check.ts` (store, 7/7).
- Task 34 ruling: `design-workspace/decisions/tap-notice-badge-form-and-placement.md` (supersedes
  `tap-notice-placement-and-form.md`); the owner's rulings of 2026-10-16 (glyph persists;
  new-since-looked) supersede its open questions (i) and (ii).
- Task 34 architecture deviation:
  `developer-workspace/architecture-deviations/TASK-004-tap-seen-watermark.md`.
