# TASK-005 · Task 38 — A draft is erased only by an act

**Date:** 2026-10-19 · **Outcome:** done. **Deps:** 36. **Files:** exactly the plan's four —
`lib/device-draft.ts`, `app/office/sign-out/page.tsx`, the car client, the settings client.

## What was built

**The store has one prefix-only erase.** `clearDrafts()` takes a snapshot of the storage's key list,
removes every key beginning `ts-draft:` and nothing else; the theme and any other key stay. A storage
that cannot list keys, or refuses, is a no-op; a draft is never a condition of the work. It is
unit-tested alongside the store.

**The car draft is erased by Save or Cancel (discard), and only there.** `clearCarDraft()` cancels
the pending debounced write **first** (so a trailing write cannot put the draft back), removes the
key, clears the presence marker, and takes the recovery line down. It is called when a save returns
`ok` — including “Nothing changed.”, because the person pressed Save and the store accepted — and
from the Cancel link. A validation refusal or a failed save leaves the draft. A reload, a client
navigation, or simply leaving the form does **not** erase it.

**A settings card's draft is erased by its successful Save.** Each save path calls
`clearSettingDraft(field)` only after `result.ok`; the writer is cancelled first. Another card's
draft keeps the recovery marker/line alive. The settings screen has no discard control; the car
form's Cancel is the discard act.

**Sign-out erases every draft.** The sign-out client calls `clearDrafts()` before Clerk clears the
provider session. The page is shared by the sign-out button and by a session whose own limits ended
(`requireOfficeSession` redirects to it), so this is the session-end act — not a draft-age clock:
there is no timer, no day count, and no other erase path. Only `ts-draft:` keys are touched.

## AC

- **Save erases:** a successful settings save removed its draft, cancelled the pending write,
  cleared the marker, and took the recovery line down.
- **Discard erases:** the car form's Cancel removed its draft; no server action was posted.
- **Sign-out erases:** a sessionless incognito context with two fake `ts-draft:` keys, `ts-theme`
  and a non-draft key, visited `/office/sign-out`; every draft was gone, the theme and non-draft key
  stayed.
- **In no other case:** a reload left the car draft and restored its typing; leaving to another
  office page left both test drafts in storage. No clock or day count exists.
- **Pending writes cannot undo an act:** `writer.cancel(key)` runs before every erase.

## Live witness — discard, reload, save, sign-out

Attach-only Chrome on `:9222`, public dev server `:3210`, signed in (main context), 1440 × 900.
Test drafts removed; the one demo write is the full-tank default, saved to a probe and saved back.

| act | probe | result |
|---|---|---|
| **discard** — car add, Cancel | brand “Task38 discard probe” | `/office/inventory`; `ts-draft:car:new` **gone**; marker false; **0** actions |
| **no erase** — car add, reload | brand “Task38 kept probe” | brand restored after reload; key **still present**; marker true; no recovery line; then Cancel removed it; **0** actions |
| **save** — settings → Cost default (`#tank`) | saved `0` → probe `5000` | recovery line shown (2 ms after reconnect); Save cleared the draft and hid the line; a second save put `0` back; final reload read **0**; exactly **2** actions, both saves |
| **sign-out** — sessionless incognito context | `ts-draft:car:new`, `ts-draft:settings:tank`, `ts-theme`, `not-a-draft` | `/office/sign-out`; **all drafts gone**; `ts-theme`, `not-a-draft` and site keys stayed; the owner’s main context was never signed out |

- **Store:** the full-tank default was `0` before and after the demo; the probe `5000` was not left
  behind. The final settings reload read `0`.
- **Network:** exactly **2** `next-action` posts, both after the two Save clicks; **0** on discard,
  reload, offline, reconnect or leaving. 10 non-GETs total; the other 8 were external with no
  `next-action`. **0** console / **0** page / **0** HTTP errors.
- **Cleanup:** `[]` `ts-draft:` keys on the main context. Chrome **6 → 6** (the incognito context is
  not a new browser process and was closed).
- **Typecheck clean · `npm test` 310/310** (`clearDrafts` test added).

Readings: `developer-workspace/scripts/task-005/runs/task38/task38.json`; drive `task38.mjs`.

## Files-line notes

- **`lib/device-draft.ts`:** `clearDrafts` is prefix-only and snapshot-first; `DraftStorage` gained
  optional `key`/`length` (real `localStorage` has them) so a test fake can implement or omit them.
  `clearDrafts` lives here, not in the sign-out page, so it is testable and the sign-out page stays
  the act, not the store.
- **`app/office/sign-out/page.tsx`:** clears before `signOut`; the face is unchanged. The page is
  also the session-expiry landing, so the session-end clears drafts; that is the same sign-out act,
  not a draft retention clock.
- **Car:** the successful-save clear uses `res.ok`, including “Nothing changed.”; the Cancel link
  calls the same erase. The `pagehide`/unmount flush is harmless because the pending write was
  cancelled.
- **Settings:** no discard control exists; Save is the act. The per-card erase leaves another
  card’s draft/marker alone.
- No extra files.

## Flags / not verified

- **The car success-save erase was not live-driven:** saving a car would create/update a real car.
  The settings save path is live, and both call the same erase/take-down pattern; the car
  discard/reload paths are live.
- **The sign-out page was exercised in a separate sessionless context** so the owner’s session was
  not destroyed; the page’s real client code ran, but the owner’s actual button-to-sign-out flow was
  not re-authenticated. The sign-out page is also reached on session expiry; that path was not
  live-driven.
- **No clock was added and no timer drives an erase**; the “no other case” evidence is the live
  reload/leave plus the code. A multi-day wait is not a test.
- The settings screen has no discard button; the AC’s discard act is the car form’s Cancel. The
  WhatsApp/tagline drafts use the same per-card save erase; only the tank card was clicked live.
- No screen-reader pass was run.

## Verified

Typecheck clean · `npm test` **310/310** · drive **PASS, 0 problems** · Chrome **6 → 6** · demo
full-tank restored · only the two intended saves · test drafts removed.
