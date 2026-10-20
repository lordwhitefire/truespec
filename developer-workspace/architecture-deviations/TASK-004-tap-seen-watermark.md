# Architecture deviation — Task 34: the tap notice becomes a "new since last looked" badge

**Recorded by:** Developer (Big Pickle)
**Date:** 2026-10-16
**Task:** Task 34 (owner checkpoint D — the tap notice: form, placement, all-taps tab, refresh)
**Owner ruling that causes it:** 2026-10-16 — *"the number appears on the icon, the client taps it,
the number disappears leaving only the icon; if new taps happen the number appears and climbs until
it is tapped … if the client opens the enquiry tab that shows taps the number should also disappear."*
**Owner's storage ruling:** 2026-10-16 — *new tiny `tap_seen` table* (not a key in `setting`).

> This file is a **hand-off record**, not a decision. It is written in the Developer's workspace for
> the architecture agent to reconcile. The Developer has **not** edited any architecture artifact
> (`specs/`, `ontology/`, the layer model, truth statements). Where a reconciliation is needed it is
> listed under **"What the Architect must reconcile"** and left open.

---

## 1. The deviation, in one line

The WhatsApp tap notice stops being a **statistic** (an all-time `count(*)`) and becomes a **stateful
notification** (taps newer than the office's own "seen" watermark) — which introduces the system's
first **write triggered by viewing a list**, and a **new table**.

---

## 2. What changes (facts the architecture must absorb)

### 2.1 Data model — a new table `tap_seen` (schema change)

- New migration `migrations/0023_tap_seen.sql`; new table **`tap_seen`**, deliberately **one row,
  ever** (the office is single-owner): `id boolean PRIMARY KEY DEFAULT true CHECK (id)` (a fixed key
  so a plain upsert always hits the same row), `seen_through timestamptz` (the newest tap the office
  has looked at; `NULL` = never looked), `updated_at timestamptz NOT NULL DEFAULT now()`.
- It is **operational read-state**, not customer data and not a setting. It holds no personal data —
  only a timestamp. It is **append-only-safe**: the watermark only ever moves forward.
- **This is a deliberate new table, not a reuse.** The owner ruled the table over a key in the
  existing `setting` row, so `setting` remains exactly the three settings its module documents.

### 2.2 A new write path — writing state when a list is *viewed*

- The badge clears when the owner **views the Taps tab** (`/office/enquiries?tab=taps`). That view is
  a **GET**, and **no GET may change data** in this codebase (`task.md:253`, `layout.tsx:54`).
- The write is therefore a **POST Server Action** (`app/office/actions/tap.ts` →
  `markTapsSeenAction`), fired by a **client component** mounted **only** on the Taps panel
  (`components/office/MarkTapsSeen.tsx`) in a `useEffect` on mount. The GET renders; the client then
  POSTs.
- The action takes the **id of the newest tap actually rendered**, and the store resolves its `at`.
  This is the safe watermark boundary (a tap arriving *after* render stays "new"); the watermark can
  never be set to a time that no `tap` row holds, so a caller cannot fast-forward it.
- After writing, the action calls `revalidatePath("/", "layout")`, so the badge — which lives in the
  shell **layout**, on every office route — clears live.

### 2.3 Read semantics — the figure the badge shows

- **Was:** `getOfficeTapCount()` = `SELECT count(*) FROM tap` (all-time). The notice's accessible name
  said *"N WhatsApp taps recorded"*.
- **Now:** the badge reads **`getNewOfficeTapCount()`** = taps with `at > seen_through` (all taps when
  no watermark exists yet). The name says *"N new WhatsApp taps"*.
- `getOfficeTapCount()` is **kept** (the all-time figure still exists and is still honest); the badge
  simply no longer uses it. The panel/tab still list the same rows.

### 2.4 UI/behaviour (form only — no redesign)

- The **glyph persists at zero**; only the gold circle clears. (Previously the whole notice was
  removed at zero — the owner's `TapBadge`/`TapNotice` early return is dropped.)
- The link is therefore **always present** in both homes (phone topbar, desktop sidebar footer), so
  the taps list has a permanent entry point.
- No popup, alert or sound (unchanged — `dashboard/spec.md`).

---

## 3. What the Architect must reconcile

The Developer does **not** decide these; they are flagged for the reconciliation pass:

1. **Truth 8 / `specs/dashboard/spec.md` "a count badge".** The spec's badge is now *new-since-last-
   looked*, not an all-time count. Truth 8 and the dashboard spec wording may need an amendment, and
   the brief's *"removed entirely at zero"* is superseded by *"glyph persists; circle clears."*
2. **The data-model layer.** `tap_seen` is a new entity with one row and no relations but to `tap`
   (by *time*, not by key). Confirm it belongs where it is put, and whether the ontology needs the
   relation `tap_seen —reads→ tap`.
3. **A new *kind* of state change — "view writes state".** This is the system's first write-on-view.
   It is executed as a POST (rule preserved), but it is worth naming in the model so the rule "no GET
   changes data" is understood as *"reads are effectless; the acknowledgement of a read is a
   write."*
4. **The design record.** `design-workspace/decisions/tap-notice-badge-form-and-placement.md` left
   open question (ii) (*all-time total vs new-since-looked*) and the sub-question (*glyph persists vs
   removed at zero*); both are **answered** by the owner's 2026-10-16 ruling, above.
5. **Naming.** `getOfficeTapCount` (all-time) and `getNewOfficeTapCount` (badge) now coexist — confirm
   the names are the ones the model wants, or rename.

---

## 4. What is deliberately **not** changed

- No GET changes data (the write is a POST).
- `setting` keeps exactly its three keys.
- `tap` is unchanged (still the four columns; the tap row still records nothing about the viewer).
- No popup, alert or sound.
- Existing readers (`getOfficeTaps`, `getAllOfficeTaps`) and the panel/tab are unchanged.

---

## 5. Files this deviation touches (for cross-reference)

- `migrations/0023_tap_seen.sql` (new) — the table.
- `lib/office.ts` — `getNewOfficeTapCount()`, `markTapsSeenThrough(tapId)`.
- `app/office/actions/tap.ts` (new) — `markTapsSeenAction`.
- `components/office/MarkTapsSeen.tsx` (new) — the view-triggered writer.
- `app/office/(shell)/enquiries/page.tsx` — mount the writer on the Taps panel.
- `app/office/(shell)/layout.tsx` — badge reads the new count.
- `components/office/TapBadge.tsx`, `components/office/TapNotice.tsx` — glyph persists; new wording.
