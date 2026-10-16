# TASK-004 · Task 30 — The refusals witness

**Date:** 2026-10-16 · **Status:** done. One script `refusals.mjs` proves the ten refusals; 12/12 refused, each with the right rule named.

## The claim

Task 30 asks for: _every refusal proved with what was asked and what came back: an office URL with no session; a signed-out tab; a state deleted while occupied; a malformed WhatsApp number; a malformed amount; a file that is not the expected template; a GET that would have changed data; a request carrying its own `content_hash`; a request trying to change an identity; an unauthenticated export._ And the witness: `developer-workspace/scripts/task-004/refusals.mjs`.

## How it was done

- **`developer-workspace/scripts/task-004/refusals.mjs`** — four worlds, one report: (a) HTTP (no cookie) — A, G, J; (b) browser (attach-only CDP) — B; (c) pure rules — D, E, F, H-reader; (d) scratch DB — C, H-store, I (whole migration chain + seed on a scratch database; nothing runs against the owner's store). 
- **Judged on:** refused · the right rule refused it (the rule named) · nothing changed. The HTTP battery proved nothing changed by a read-only live-store row-count fingerprint (before/after). The scratch battery rolled back every savepoint.
- **Right rules named:** `requireOfficeSession()` → `SIGN_IN_PATH` (door); the POST-only handlers (405, so GET cannot reach the write); the export route's auth → 401 with an empty body; `normaliseNigerianMobile()` and `parseCostAmount()` / `readCarInput()`; `readCarFile()`/`readEnquiryFile()` returning their own constants (NOT_A_PDF/NOT_OUR_TEMPLATE/NOT_AN_ENQUIRY_SHEET); `readCarInput()` excludes `content_hash` and `carChangeCheck()` does not carry it; `car.content_hash` is `NOT NULL` so it cannot be dropped; the pinned-primary trigger (23514) + the FK RESTRICTs (23001) for occupied states (including `car_secondary_state_state_id_fkey`); the identity lock trigger (23514, `identity is final`).

## What was verified — run, not assumed

- **12/12 refused** (A, B, G, J, D, E, F, H, C, H-store, I, HTTP-fingerprint). Report: `runs/refusals/refusals.json`.
- **A — office URL with no session:** `/office`, `/office/inventory`, `/office/drafts` all → 200 but carry `/office/sign-in` in the payload and **no office markers**; landed at `/office/sign-in` in a browser tab.
- **B — signed-out tab:** the browser leg (attach-only Chrome) confirmed no office data and the door target.
- **G — GET cannot change data:** `GET /api/tap → 405`, `GET /api/upload → 405`.
- **J — unauthenticated export:** `GET /api/export → 401, 0 byte(s)`.
- **D — malformed WhatsApp:** letters, foreign number, incomplete all refused by `normaliseNigerianMobile()` with the rule's reasons.
- **E — malformed amount:** `parseCostAmount("twelve thousand")` refused, and `readCarInput()` refused it at `cost.purchase_price`.
- **F — not the expected template:** non-PDF, a PDF with no car form, and a PDF that is not the enquiry sheet all refused with the module's own constants.
- **H — the caller's `content_hash` is not honoured:** `readCarInput()` kept 14 columns and did not carry it; `carChangeCheck()` never carries a caller-supplied hash; the store refuses setting `content_hash = NULL`.
- **C — state deleted while occupied:** secondary (`car_secondary_state_state_id_fkey`, 23001), enquiry (`enquiry_enquiry_state_id_fkey`, 23001), and the **pinned primary** (`car_state_primaries_are_final`, 23514) — all refused, parents survived.
- **I — identity change refused:** `car.ref`, `car.id`, `enquiry.id` updates all refused with `identity is final` (23514).
- **Nothing changed:** live-store row counts identical before/after the HTTP battery (17/99/49/6/3/0/0). Scratch store rolled back entirely.

## Findings

- **The door's refusal is now a streamed client-side redirect, not a 3xx.** A + B both show 200 with the redirect in the payload (client follows), **no office data leaks**. This is a behavioural change from when `refusal-proof.ts` (task 6) asserted 3xx. `refusal-proof.ts` also expected 401 for GETs to POST-only routes and listed `/office/drafts` as unbuilt — it is now **stale** (fails 19/38 today). Do **not** edit it blindly; surface the finding. The *substantive* refusal is correct; the status is the deviation.
- **The "state deleted while occupied" case** (0020) now has the pinned-primary trigger refusing a primary-state delete before any FK can fire — that is the *right*, stronger rule; the witness proves both the FK and the pinned-primary rule.
- **`refusals.mjs`** runs cleanly (dev on :3210, CDP on :9222), reports JSON to `runs/refusals/refusals.json`. 

## Next

Task 31 requires the owner's signed-in office session (flows witness: create car, edit, change cost, mark/un-mark sold, delete+undo, upload photos, upload template and save drafts, import enquiry PDF, change state, save setting, export). Task 32 needs flows for "store state after flows". Gates+report in Task 33.
