# Artifact — initial prompt given to the former car-states agent

- **Session:** `ses_ed95ace84ffe65BanLhw0Nn4te` (general, "Build car-sold + car-not-found states")
- **Created:** 2026-10-10 16:28:42 (UTC)
- **Status of that session:** the agent ran long and was terminated (it appeared to loop). It did real work before termination; this prompt is the exact text it started with, pulled verbatim from the opencode session DB.
- **Successor:** a fresh general session continues from where this agent stopped; see `CAR-sold-and-notfound-agent-prompt-v2-continue.md`.

## The prompt (verbatim)

---

You are building two missing states of the car page in a Next.js build, and proving them against the reference at RUNTIME using the `runtime-divergence` skill. Goal: at least 80% parity with the model built from the reference runtime. Read-only reference; do not edit it.

## Roots
- BUILD (edit here): /home/lordwhitefire/current-project/truespec
- REFERENCE (READ-ONLY, never edit): /home/lordwhitefire/current-project/test-truespec-v2

## Read these first (authority — do this before writing anything)
- /home/lordwhitefire/.agents/skills/runtime-divergence/SKILL.md — the whole method. Pay attention to §"The rules", §"How to run it", and §"The bundled code".
- /home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs, extract.mjs, run.mjs, normalize.mjs, model.mjs, compare.mjs — these ARE the tooling; reuse them, do not reinvent.
- /home/lordwhitefire/current-project/truespec/developer-workspace/plans/UI-LAYER-complete-screens-plan.md — the project plan (run → find → fix the RULE not the name → re-run; smallest change; stop at ~80%).
- /home/lordwhitefire/current-project/truespec/developer-workspace/plans/RECON-001-ui-layer-plan.md §5–§7 — browser guardrails.
- Existing project helpers to reuse: /home/lordwhitefire/current-project/truespec/developer-workspace/scripts/ (car-run.mjs, car-probe.mjs, car-compare.mjs, screen-compare.mjs, screen-probe.mjs).

## THE BROWSER METHOD — how we actually check (this is mandatory; do NOT deviate)
This is a RUNTIME comparison. We never judge from source and never from a screenshot.
1. ONE persistent, VISIBLE Chrome, attached over CDP on `:9222`. Never headless, never a second instance, never a process swarm.
2. If no Chrome is up, start it EXACTLY like this (then reuse it; it stays open so the owner can watch and click):
   ```
   /usr/bin/google-chrome \
     --user-data-dir="$HOME/.config/google-chrome-automation" \
     --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 \
     --no-first-run --no-default-browser-check --no-sandbox \
     --disable-blink-features=AutomationControlled --start-maximized &
   ```
   `browser.mjs::ensureChrome()` does this for you and attaches with `connectOverCDP`; on exit it only DETACHES (the window stays open). Use it.
3. Open TWO tabs: **A = reference**, **B = target (build)**.
4. Serve the two sides: reference read-only static at `http://localhost:3211`, build at `http://localhost:3210`.
5. Drive a state checklist identically on both tabs with `run.mjs` — it writes one folder per state (`ref.json`, `build.json`, `meta.json`). Capture JSON is tolerant: a missing control or failed action is a FINDING, not a crash.
6. Build the model from the REFERENCE side: `node <skill>/scripts/model.mjs <captures> <model>`.
7. Compare the TARGET capture against that model: `node <skill>/scripts/compare.mjs <model> <captures> > report.md`.
8. Extract EVERYTHING (whole DOM tree, computed style, tokens, stylesheets, a11y tree, control inventory, hidden layers) — no shortlists. Same actions on both sides; compare only like-for-like (ambient↔ambient, conditional↔conditional). If the target never reached a state, that compare is INVALID — fix the drive and re-capture.
   Commands (from the skill):
   ```
   node <skill>/scripts/run.mjs     checklist.json   ./captures
   node <skill>/scripts/model.mjs   ./captures       ./model
   node <skill>/scripts/compare.mjs ./model          ./captures   > report.md
   ```
9. Unit is the RULE (structure / style / behaviour), never a name/tag/id, never a percentage score. Judge the divergence rule-by-rule from compare.mjs output.
Hard guardrails: NO screenshots (the `visual_inspect` tool is broken — do not use it). One Chrome, serial. A fresh browser context per check, closed after. Hard cap 10 chromium processes. Browser closed in a `finally`. Build is on `:3210` (NOT 3000); reference on `:3211`.

## The two states to build (reference behaviour, from test-truespec-v2/car.html)
Reference implements these as states of `car.html?car=<slug>`:
1. **car-sold** — slug IS in the reference `SOLD` array (car.html:455–460; the 4 slugs: `2021-honda-civic-ex`, `2020-toyota-rav4-xle`, `2019-nissan-altima-sv`, `2021-hyundai-tucson-sel`). Renders `soldPage()` (car.html:630–650): title `Sold | TrueSpec Automotive`; breadcrumb Home › Inventory › Sold; car image; "U" avatar; h1 "That one found a new owner"; line "{title} went in {month}. Good car — it moved quickly. Here's what I can put you in instead:"; buttons "Message Umar" (WhatsApp) + "See the full inventory"; then a "On the lot right now" row of up to 4 same-body AVAILABLE cars, or the fallback line if none. No old price is shown.
2. **car-not-found** — slug is NOT a real car and NOT sold. Renders `notFound()` (car.html:651–663): title `Car not found | TrueSpec Automotive`; breadcrumb Home › Not found; h1 "We could not find that car"; line "That car may have sold, or the link is old. Tell me what you were after and I'll find one like it — or browse what's on the lot now."; buttons "Message Umar" (WhatsApp) + "See all cars".

Read the reference source ONLY to enumerate the states to drive — the source never enters the compare. These two are DISTINCT from the generic site 404 (`test-truespec-v2/404.html`, "We couldn't find that page"): do NOT touch the build's `app/not-found.tsx`; it stays the generic page.

## The build today (change points)
- Route: `app/car/[ref]/page.tsx` (server component, `export const dynamic = "force-dynamic"`). Line 85: `if (!car) notFound();` — unknown AND sold both fall through to the shared `app/not-found.tsx`. This conflation is what you fix.
- Data: `lib/public-cars.ts`. `getPublicCar(ref)` returns null when `!isListed(row)`; `isListed` (`lib/serialize.ts:102–105`) rejects `row.sold`. The SELECT already computes `(sale.id IS NOT NULL) AS sold` (`lib/public-cars.ts:14`). The `PublicCar` type (`serialize.ts:8–26`) has no `sold` field.

## What to build (smallest coherent change — approach A)
- Expose the existing `sold` flag so the car route can tell **sold** apart from **unknown**: e.g. a new `getPublicCarForView(ref)` (or similar) that returns the car even when sold, plus its `sold` flag; keep `getPublicCars()`/`getPublicCar()` behaviour unchanged for lists.
- `app/car/[ref]/page.tsx`: car exists but sold → render the **sold state**; no car and not sold → render the **car-not-found state**; else the normal car page (unchanged). Small presentational components for the two blocks, mirroring the reference copy and structure. UI-layer only; do not redesign architecture beyond exposing the flag that already exists.
- The build must be able to REACH both states at runtime. If the DB has no sold car, use one of the 4 reference slugs / seed a sold car as needed so `/car/<sold-slug>` and `/car/<unknown-slug>` are reachable; report exactly how you made them reachable.

## Deliverable / report back
Write a report to `/home/lordwhitefire/current-project/truespec/developer-workspace/reports/CAR-sold-and-notfound-runtime.md` with: files changed (and the sold-flag exposure); how each state was made reachable; the exact capture/model/compare commands run; the divergence found; what you fixed; the final rule-by-rule parity for each of the two states (honest "not checked" where applicable); anything left undone.
Do not commit. Capture runs land under `developer-workspace/scripts/runtime-ui-diff/runs/` (gitignored).

Return a concise summary: the two states, the files changed, whether each reached ≥80% vs the model, and any blocker.