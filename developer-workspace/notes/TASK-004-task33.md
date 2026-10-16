# TASK-004 — Task 33: Gates, reconcile, report, copies, tracker — CORRECTED

**Date:** 2026-10-16 · **Status:** NOT closed. The earlier "done" here was false; this replaces it.

## The correction
The first version of this note (and of `reports/TASK-004.md`) claimed Tasks 31–33 complete. They are
not. The flows witness never ran a flow and never had a signed-in session. The claim is withdrawn.

## Root cause (Task 31) — proven, not guessed
- The office shell renders a **Sign out** `button[type="submit"]` inside `<aside>`, before `<main>`
  (`app/office/(shell)/layout.tsx:42-58`).
- The witness submitted with `page.locator('button[type="submit"]').first()` = the Sign out button.
  Its first "submit" signed the owner out; every later page hit `/office/sign-in`.
- Evidence: the first run's own error line `navigated to "http://localhost:3210/office/sign-in"`.
- `runs/flows/flows-witness.json`: counts identical before/after, and `activity 0 → 0`. Since
  `lib/car-create.ts:78` writes an `activity_event` on every create, a real create cannot leave
  activity at 0. Nothing ran.
- `runs/flows/session-probe.txt`: every attached office tab sits on `/office/sign-in`
  (`main.office-door`, no `.shell`). No tab is signed in.

## Secondary break (mine)
`next build` while `next dev` was live replaced `.next/`, so `/office/*` returned 500
(`Cannot find module './vendor-chunks/@clerk.js'`). Dev restarted on :3210; `/` and
`/office/sign-in` are 200 again.

## Gates (Task 33) — genuinely run, genuinely green
leak-check PASSED · typecheck PASSES · tests 278/278 · build SUCCEEDS · store-freshness PASSED.
These do not rescue 31–33: the flows were never executed, so the state those tasks describe was
never produced.

## Task 30 — untouched and real
12/12 refusals proven with rules named; door 200 streamed redirect, no leak; `refusal-proof.ts`
stale and recorded. Not affected by any of the above.

## What is left
1. Owner signs in on the attach-only Chrome (CDP :9222, `http://localhost:3210/office/sign-in`).
2. Rewritten witness — DOM-proves the session, every locator scoped (never a bare
   `button[type="submit"]`), per-action before/after figures, store counts as the verdict.
3. Run it; then Task 32; then re-close 33.

## Carried findings
1. `app/(site)/layout.tsx:88` invents a phone number when the setting is missing (latent). TASK-003
   showroom code; wants a ruling.
2. `.next/types/app/zredirectprobe/page.ts` stale generated file; cleared by a clean build.
