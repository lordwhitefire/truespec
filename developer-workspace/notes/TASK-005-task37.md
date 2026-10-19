# TASK-005 · Task 37 — The draft comes back, and the recovery line is true

**Date:** 2026-10-19 · **Outcome:** done (restore + recovery line). **Deps:** 35, 36.
**Files:** exactly the plan's three — `app/office/(shell)/car/car-client.tsx`,
`app/office/(shell)/settings/settings-client.tsx`, `components/office/OfflineBanner.tsx`.

## What was built

**The car form puts its draft back.** On mount it captures the page's own blank as the draft's
`base` (the existing Task 36 snapshot), reads `ts-draft:car:<id|new>`, and restores only when the
draft's `base` still equals the page in front of the person and the draft actually differs from that
base. Then it puts the text fields back into their own controls, restores the primary state and the
photo references (state, not bytes), and fills the sale fields after the state renders. Restoring
does **not** schedule a write: the state/photo “seen” refs move with the restored values, and the
input handler is not fired by setting a value. A draft for a car whose stored form has moved on is
left alone rather than written over newer store data.

**The three settings cards put theirs back too.** Each card's draft is restored only when its `base`
is still the saved value the store holds and the value is an actual change. The card is left dirty
(Save available) and its character count/preview are set. No card writes a draft on load.

**The recovery line is the approved words, verbatim:** “You're back online. Your draft is still
here — press Save.” It shares the Task 35 banner (sticky, full width, `role=status`,
`aria-live=polite`) and replaces the offline line only when **both** are true: an offline line
actually showed (not a blip) and the form has announced a present draft. It withdraws on a save or
discard, or when the form leaves (Task 38 wires save/discard; leaving is live here). It never queues
or sends anything; Save remains the person's act. The shell's side/topbar offset uses a
`data-ts-office-recovered` marker, and the Save annotations are removed on reconnect.

The form/banner contract is the `data-ts-office-draft` attribute plus one
`ts-office-draft-presence` event: the client sets the marker when it restores or writes a draft; the
banner reads it at recovery and takes the line down on `{present:false}`. A plain online reload
restores the draft but shows no “back online” line — there was no reconnect to announce.

## AC

- **Reload restores the draft:** car brand and chosen primary state came back; settings tagline came
  back and its Save was available; the drafts survived.
- **Reconnect shows the approved line:** exact text at 1440; after a shown offline line (1226 ms /
  1256 ms); line at once on reconnect (21 ms / 10 ms); draft still in the form and in storage.
- **The line is true when shown:** the form is restored, the draft key is present, no server action
  is posted, and nothing is auto-sent.
- **Nothing auto-queues/sends:** 0 server actions; the test never pressed Save.

## Live witness — both forms, reload, offline, recovery

Attach-only Chrome on `:9222` (UA has no Headless), public dev server `:3210`, signed in, 1440 × 900.
Typed, never saved. Test drafts removed at the end.

| surface | restored after reload | offline line | recovery line | evidence |
|---|---|---|---|---|
| add car `/office/car/new` | brand **“Task37 draft probe”**; state **Landed** (id `ae4ae7ce…`) | **1226 ms** | **21 ms**; exact text; sticky top 0, side at 38 px | draft survived; `data-ts-office-draft`; recovery marker true; offline marker false; Save had no `aria-disabled`/offline class; line still up after **1400 ms** |
| settings → tagline | **“Task37 tagline probe”** (base **“Cars you can trust, prices you can see”**) | **1256 ms** | **10 ms**; exact text | draft survived; `#tagSave` enabled (`disabled=false`); recovery marker true; no action |

- **Leaving the form:** navigating to `/office` took the recovery line down and cleared the draft
  marker, while **both** `ts-draft:` keys were still there — leaving is not an erase. (Erasing on
  save/discard/sign-out is Task 38.)
- **Cleanup:** both test keys removed; `[]` `ts-draft:` keys left.
- **Network:** **0** server actions (`next-action`); the 5 non-GETs were external and had no
  `next-action` header. **0** console errors, **0** page errors, **0** HTTP errors. Chrome **6 → 6**.
- **Typecheck clean · `npm test` 309/309.**

Readings: `developer-workspace/scripts/task-005/runs/task37/task37.json`; drive `task37.mjs`.

## Flags / not verified

- **The plan's Task 37 Verify includes “save → the draft is gone”.** Save erase is Task 38 by the
  plan's own task boundary; this task does not press Save. The live run proves restore and the line;
  Task 38's drive proves save, discard and sign-out erase.
- **Photos were not live-restored** (the run uploaded none); the code restores the Task 36 photo
  references into state, never bytes. The sale-field second pass is implemented but not live (add
  mode cannot choose Sold).
- **The base-mismatch path is implemented but not live-driven:** a draft whose base no longer
  matches the store is not restored; it is left in storage (no clock, no other erase).
- **The recovery line on a fetch-failure recovery was not separately driven.** The live reconnect
  uses `navigator.onLine`; the fetch-failure leg shares the same banner transition (Task 35 proved
  the failure signal).
- **Plain reload shows no recovery line by design** — the line says “back online”; the restore is
  silent there. The AC requires the draft to come back, which it does.
- The line stays until an act or leaving; there is no timer and no dismiss control. Save/discard
  hiding is Task 38; the leaving case is live-proven.
- No screen-reader pass was run; the line is a polite status region, as in Task 35.

## Verified

Typecheck clean · `npm test` **309/309** · drive **PASS, 0 problems** · Chrome **6 → 6** · 0 server
actions · no store write · test drafts removed.
