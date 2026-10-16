TASK-004 — Report (Task 33) — CORRECTED

STATUS: Tasks 31–33 are NOT complete. An earlier version of this report claimed they were.
That claim was false and has been withdrawn. What follows is the honest record.

## What went wrong (Task 31)

The flows witness (`developer-workspace/scripts/task-004/flows-witness.mjs`, first version)
did not run the flows and did not have a signed-in office session.

Root cause: the office shell renders its **Sign out** form (a `<button type="submit">`) inside
`<aside>` BEFORE `<main>` (`app/office/(shell)/layout.tsx:42-58`). The witness submitted with
`page.locator('button[type="submit"]').first()`, which matched that Sign out button. The first
"submit" therefore signed the owner out; every later navigation landed on `/office/sign-in`.
The tell was in the very first run's error: `navigated to "http://localhost:3210/office/sign-in"`.

The evidence it wrote proved nothing:
- `runs/flows/flows-witness.json` — a timestamp, a carBrand string, and two IDENTICAL count
  blocks (cars 17/17, costs 99/99, photos 49/49, enquiries 6/6, taps 0/0, activity 0/0,
  drafts 0/0, settings 3/3).
- The store never moved. `activity: 0 → 0` is decisive: `lib/car-create.ts:78` writes an
  `activity_event` row on every car create, so a real create would have moved it to at least 1.
  It did not move at all, so no create happened.
- No proof of session state, tab URL, rendered screen, or form response was captured.

Confirmed by `runs/flows/session-probe.txt` (2026-10-16): every attached office tab is sitting on
`/office/sign-in` (`main.office-door`, no `.shell`/`.side`/`.topbar`). No tab is signed in.

## Root cause of the environment break (secondary)

Running `next build` while `next dev` was live replaced `.next/` under the dev server, after which
every `/office/*` route returned 500 (`Cannot find module './vendor-chunks/@clerk.js'`). The dev
server was restarted on :3210; `/` and `/office/sign-in` are back to 200.

## Gates (Task 33) — run, and they genuinely passed

Run in the learned order: leak-check → typecheck → test → build → store-freshness.
- leak-check      PASSED — no cost/currency/profit, no asset/file ref, no customer detail,
                   no office state label on any public route.
- typecheck       PASSES — no app/lib errors (only a stale `.next/types/.../zredirectprobe` file).
- test            278 pass · 0 fail · 0 skipped.
- build           SUCCEEDS.
- store-freshness PASSED — none of 9 store-reading routes prerendered; no DB response cached.

These five are real. They do NOT establish Task 31, 32 or 33: the flows were never executed,
so the state those tasks describe was never produced.

## Task 30 (refusals) — unaffected and real

12/12 refusals proven, each rule named (`runs/refusals/refusals.json`); door is a 200 streamed
client-side redirect with no leak; `refusal-proof.ts` (task 6) is stale and recorded as such.
This stands on its own and was not touched by the waste above.

## What is left

1. A genuinely signed-in office tab in the attach-only Chrome (CDP :9222). The owner signs in.
2. A rewritten witness: DOM-proves the session, scopes every locator (never a bare
   `button[type="submit"]`), and records per-action before/after figures with the store's own
   counts as the verdict.
3. Then Task 32 (state after the flows, demo marker, wipe dry run, export opened) and re-close 33.

## Findings / carried
1. `app/(site)/layout.tsx:88` renders `{num || "+234 800 000 0000"}` — a missing `whatsapp_number`
   setting makes the showroom invent a phone number (latent today). TASK-003 showroom code; wants a
   ruling.
2. `.next/types/app/zredirectprobe/page.ts` is a stale generated probe page; cleared by a clean build.
