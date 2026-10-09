# Plan — outside chore: load the template page, then write a client proposal

**Status: STEPS 1–2 DONE. STOP POINT 2 REACHED — awaiting the owner's go for step 3 (the proposal).**
**Date:** 2026-10-06 · **Last update:** 2026-10-07
**Owner's framing:** this is not product-management work — it is an outside chore, not my job, but I am the most suitable person available right now. Treated as an owner-granted exception.

> **Companion artifact: `cryptopilot-constraints.md`** — all hard constraints, evidence, decisions, and tooling gotchas live there so they survive compaction. Read it before resuming this work.

---

## What I was asked to produce

1. **Load** the ThemeForest preview page for *Cryptopilot AI — crypto investing/trading dashboard HTML template*, in the Google Chrome window that runs on CDP — using the owner's established method (`novel_reader.py`, lines 60–199), **then stop.** The owner checks whether the real page loaded and whether he needs to click anything.
2. **Wait for the owner's word**, then **inspect** what is actually in the template — pages, dashboards, components, features, what is front-end only versus what needs real building.
3. **Draft a proposal** for the owner's client carrying **several price options** rather than one, because the client wants a price up front and the work may turn out heavy.

## What I will produce

| Step | Output |
|---|---|
| 1 | One status line only — loaded URL, page title, whether a challenge/CAPTCHA is present. **No analysis, no extraction. Then I stop.** |
| 2 | An inventory of the template: what pages and features it contains, and which parts are cheap (already in the template) versus expensive (must be built). |
| 3 | A draft proposal with clearly bounded tiers, each stating what is excluded. **The owner sets every number.** |

---

## Method and constraints — fixed, not negotiable

- **Google Chrome**, never Chromium. **The owner's Chromium is not touched at all.**
- Profile: `~/.config/google-chrome-automation` (443 MB, CAPTCHA trust already earned). **Never create a new profile.**
- CDP on `127.0.0.1:9222`, Playwright `connect_over_cdp`, reuse the already-open window, **detach — never close the browser.**
- **No headless.** The owner clicks whatever the site asks; the script waits indefinitely for real content to appear.
- Read-only against the site: **no purchase, no account, no form submission, no download.**

## Out of scope

- Buying or licensing the template.
- Setting prices — effort reasoning only, the figures are the owner's.
- Any edit to `ui-plan.md`, `ux-plan.md`, or any other TrueSpec workspace file. **Exception (amended 2026-10-07, owner-directed):** this plan may write its own companion artifacts — `cryptopilot-constraints.md` and, if approved, `cryptopilot-proposal.md` — inside `product-management/`.
- Launching anything on the owner's normal browser session.

## Stop points

1. **After step 1** — owner confirms the page really loaded. I do not proceed without his word. ✅ **Passed** 2026-10-07 ("it has loaded").
2. **After step 2** — owner confirms the inventory before a proposal is drafted. ⏸ **Reached** 2026-10-07; inventory delivered, proposal not started.

---

## Change log

| Date | What |
|---|---|
| 2026-10-06 | Plan written before any work, per the plan-first rule. Status: awaiting go. |
| 2026-10-07 | Step 1 executed after the owner's "go". First run attached to opencode's **headless** browser squatting 9222 — wrong browser. Headless killed, real Google Chrome launched, **User-Agent verified free of `HeadlessChrome`** before navigating. Stop point 1 passed. |
| 2026-10-07 | Step 2 inventory delivered: 48 screens, 8 pages sampled, stack identified (HTML + Tailwind 4 + vanilla JS + ApexCharts, no framework). Owner ruled: **replicate, don't buy**; **41 screens** (AI layer cut); **one data source only** (my 6-source list = scope creep, rejected); **no recurring bills** (client has not paid). |
| 2026-10-07 | Evidence: `api.binance.com` and `api.bybit.com` return **HTTP 000 from this machine** — Nigeria blocks both (owner must VPN locally); Render additionally cannot reach Bybit (shared datacentre IP). `api.coingecko.com` → 200 with `access-control-allow-origin: *`. |
| 2026-10-07 | Companion artifact `cryptopilot-constraints.md` created at the owner's direction ("write important stuff in artifact so you don't forget after compaction"). Scope amended to permit it. |
