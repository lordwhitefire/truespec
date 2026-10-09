# TASK-001 — testing task

**Handed to a separate session that did not do the building.** You are checking the work against `task.md` and this file. Every check below is observable: you either see the expected outcome or you do not. Pass = every in-scope check behaves as stated. Fail = name the check, what you did, and what happened instead.

Do not fix anything. Report.

---

## What was supposed to exist (scope reminder)

The public showroom (home, inventory, car pages) plus its foundation: app, schema, seed, one money module, one allow-list serializer, and an automated leak check. **The office, auth, tap recording, and jobs belong to later tasks — their absence here is expected and is not a failure.** See "Do not test these yet" at the end.

## Before you start

- Ask the Builder (or read the repo's README/notes) for: how to run the app locally, which environment keys it needs, and where the leak-check command lives. If the leak check does not exist, that alone is a failure of benchmark 9 — record it and continue with the rest.
- Have the reference screens `test-truespec-v2` open read-only for visual comparison.

---

## 1. Foundation checks

**1.1 Loud configuration failure**
- Do: start the app with one required key missing or wrong (e.g. blank the session secret or Sanity project id in `.env`).
- Pass: startup stops with a clear configuration error naming what's missing.
- Fail: the app starts anyway, or renders a page with broken/missing behaviour.

**1.2 Seed idempotence**
- Do: run the seed twice in a row against a fresh database.
- Pass: the second run leaves the same rows as the first — no duplicated states, no doubled demo cars.
- Fail: row counts grow on the second run, or the run errors on duplicates.

**1.3 Schema shape**
- Do: inspect the tables. Check the money columns and timestamps.
- Pass: the tables listed in `task.md` §What-must-be-true item 3 exist; every money column is an integer; every timestamp is `timestamptz`.
- Fail: any money column is float/decimal with a scale, or any timestamp is plain `timestamp`/text.

**1.4 No global rate**
- Do: look for any settings key, column, or UI field holding a single FX rate.
- Pass: none exists anywhere (ruling R3). Seed dollar amounts carry their rate on their own cost lines.
- Fail: a rate field exists in settings, or seed dollar costs convert through one shared rate.

**1.5 One totals function**
- Do: search the code for where total cost and profit are computed.
- Pass: one implementation; rounding appears in that function only.
- Fail: rounding or total-cost arithmetic appears in more than one place.

**1.6 Neon binding hygiene**
- Do: check the repository contents — is `.neon` committed? Is any `.env` file (or a `DATABASE_URL` value) committed? Does a `neon.ts` file exist at the project root?
- Pass: `.neon` and env files are absent from git (gitignored), no connection string appears in any committed file, and `neon.ts` is present and committed.
- Fail: the Neon context, an env file, or a connection string is tracked by git — or `neon.ts` is missing entirely.

---

## 2. Showroom walkthrough (do this on a phone-sized viewport, a tablet, and a laptop)

**2.1 Home page**
- Pass: brand, tagline, a prominent WhatsApp path, and three section previews are present; preview numbers equal the inventory page's numbers.

**2.2 Exactly three sections**
- Do: open the inventory page; also try (through the office if it exists yet, otherwise through the database) to confirm no configuration could add a fourth top-level section.
- Pass: tabs are Available, On Order, Landed — Landed rendered inside Available, not beside it.

**2.3 Counting rule**
- Do: find a car marked as a new arrival.
- Pass: it shows under both Landed and Available; each count includes it exactly once; the "of which N new arrivals" note is present.

**2.4 Car page completeness**
- Pass: swipeable gallery (arrows also on laptop); brand, model, trim, year, colours, mileage, **full naira price** (₦96,500,000, not ₦96.5M — the hero badge is the one allowed exception), features all visible without login or extra clicks.

**2.5 WhatsApp button**
- Do: tap/click it.
- Pass: a WhatsApp chat opens with the message already naming that car.
- Note: whether the tap is *recorded* is TASK-004's — do not fail its absence here; just note whether a message pre-filled.

**2.6 Responsive split**
- Do: phone viewport → cards, full-screen filter sheet; laptop → table, dropdown in the bar.
- Pass: behaviour matches the width table; content identical at all widths — same facts, same prices.

**2.7 Theme persistence**
- Do: switch the theme, navigate to another page, reload.
- Pass: the visitor's choice persists; the device setting is not consulted.

**2.8 Listing gate**
- Do: with a car missing price OR photo (remove one via the database if the office doesn't exist yet), look for it on every public page, every count, and try its direct link.
- Pass: it appears nowhere, and counts exclude it. Restore the price/photo → it appears immediately.
- Also: confirm no public page renders an unset price as a number (e.g. "₦0" or blank numeral).

**2.9 Sold / deleted links**
- Do: open the direct link of a sold car, then of a deleted car.
- Pass: graceful outcome each time — no crash, no stack trace, no stale "available" presentation.

---

## 3. The boundary — the check that matters most

**3.1 Automated leak check**
- Do: run the project's leak-check command against every public route.
- Pass: it exits green, output retained. Report the output.
- Fail: it does not exist, does not cover every public route, or reports any hit.

**3.2 Manual sweep (do not skip, even if 3.1 passes)**
- Do: for the home page, the inventory page, and at least three car pages — view page source and open the browser's network panel. Search the full response bodies for: `purchase`, `shipping`, `clearing`, `trucking`, `tank`, `cost`, `profit`, `rate`. Do **not** search for `kobo`: public prices legitimately travel as integer kobo (`priceKobo`, `wasPriceKobo`) under `specs/money`, so a `kobo` hit on a price is not a leak.
- Pass: none of these appear with any value in HTML, JSON payloads, or count endpoints. (Words like "cost" appearing inside public *feature text* typed by the seller are fine — you are looking for the business's cost *data*: numbers tied to those fields.)
- Fail: any cost, rate, or profit value anywhere in a public response.

**3.3 No credentials in the browser**
- Do: check the network tab and any client-side configuration.
- Pass: no database connection string or writable database credential reaches the browser (the only auth material in the browser is Clerk's public publishable key). `CLERK_SECRET_KEY`, `SESSION_SECRET`, and `DATABASE_URL` must not appear in any client bundle or client-side configuration.

**3.4 Error responses**
- Do: submit something invalid to a public route (e.g. a malformed parameter).
- Pass: the error does not echo submitted values back, and reveals no internal data.

---

## 4. Consistency spot-check

- **4.1** The same count shown on the home page and the inventory page agrees at the same moment.
- **4.2** Any figure in a benchmark of `task.md` that you can observe matches it exactly.

---

## Do not test these yet (later tasks)

Office screens and login (TASK-002/004) · sessions, delay/IP abuse control (TASK-004) · live profit while typing (TASK-003) · WhatsApp tap recording and the privacy notice (TASK-004) · PDF import (TASK-004) · toasts/undo/empty states (TASK-005) · daily jobs, pruning, monitoring (TASK-007) · retention sweeps (TASK-007/008).

If you noticed something wrong in those areas anyway, list it as an **observation**, not a failure.

---

## How to report

1. **Verdict:** PASS or FAIL.
2. **Check table:** each numbered check → pass / fail / not-testable (with one line why).
3. **Failures:** what you did, what happened, what was expected — enough for someone who did not watch you to reproduce it.
4. **Observations:** anything out of scope that looked wrong, and the conflict/stale-doc notes you noticed (e.g. `seed-content.md` rate line).
5. **Evidence:** leak-check output, and page-source/network screenshots for 3.2.
