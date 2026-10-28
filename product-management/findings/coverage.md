# Coverage — what the code does and does not wire

The specs in `openspec/changes/truespec-architecture/specs/` are the definition of correct. This file asks one question of each area: is the rule *wired*, or does it exist only on paper (or only in a module nothing calls)?

## Area by area

| Spec area | Wired? | Notes |
|---|---|---|
| **showroom** — public pages, counts, sections, taps | mostly | Reads through the allow-list serializer. Gaps: FN-001 (unlisted car renders at ₦0), UI-005 (newest order), UX-001 (fabricated social proof). |
| **inventory** — add/edit car, delete/undo/tombstone, clear-out | yes | Create, update, soft delete, 8 s undo, tombstone and "remove for good" all present. FN-009 (double-save) and UI-005 are the visible defects. |
| **media** — upload, EXIF, cover, delete | mostly | 15 MB, JPEG/PNG/WebP, EXIF stripped, cover = position 0, assets cleared on hard delete. **Imported PDFs are never linked or deletable** — DATA-001. |
| **enquiries** — board, states, taps, retention, deletion | **partly** | Board, states, taps and the enquiry form are present. **No deletion, no retention queue, no PDF link** — DATA-002, DATA-003, COV-001. |
| **office-access** — session, lockout, one owner | **partly** | Session rule and Clerk delegation are implemented. **Lockout is not** (SYS-001); **single-owner is not enforced** (SYS-002). |
| **drafts** — upload → draft → record | yes | Upload, batch, per-row review, state choice, photos, save-as-record and delete all wired. Warning persistence is UI-008. |
| **export** — one action → one ZIP | yes | Session-gated GET; `master.json`, CSVs, README. Device behaviour of `download` to be checked. |
| **settings** — WhatsApp, tagline, states, account | yes | Five state writes, WhatsApp validation, device drafts, audit lines. Reorder is not touch-operable (UI-006); delete has no confirm (UI-007). |
| **system** — backup, storage, reconcile, notices | **no** | The reads exist; nothing writes the figures and no job runs (SYS-006). |
| **privacy** — notice, deletion, retention | **no** | The notice is public and promises deletion; the product cannot delete (DATA-002). The notice itself still carries a demo note (UX-002). |

## Coverage gaps (the code never wires it)

## COV-001 — Enquiry lifecycle ends at "recorded"
**Severity:** blocker · **Status:** open
The spec has a full lifecycle: recorded → state changes → **due at 12 months → owner decides → deletion removes the enquiry and its PDF, leaves taps and the car, logs to activity**. Only the first two exist. Missing: the due notification, the decision surface, the delete action, the PDF link, the deletion activity event. `lib/cleanup.ts` can name the due rows but nothing calls it. This merges DATA-001, DATA-002 and DATA-003.

## COV-002 — No daily job
**Severity:** major · **Status:** open
No backup heartbeat, no storage measurement, no reconcile of unreferenced assets or missing files. The System card reads keys nothing writes; the clear-out panel lists tombstones only. If TASK-006 is deployed elsewhere, this is an external dependency to verify, not a code defect — but the repository cannot tell you which.

## COV-003 — No lockout
**Severity:** major · **Status:** open
See SYS-001. `auth_attempt` is a table with no writer.

## COV-004 — No cleanup surface
**Severity:** blocker · **Status:** open
See DATA-003. Four of the five "waiting to be cleared" categories have no UI.

## COV-005 — No single-owner enforcement
**Severity:** major · **Status:** open
See SYS-002 / DATA-005.

## COV-006 — No RLS policies
**Severity:** major · **Status:** open
See DATA-004 / SYS-004.

## What the standing browser-check procedure would not catch

`developer-workspace/procedures/browser-check.md` (read for coverage, never executed):
- Public widths are **560 / 820 / 1100** with **no 390** — the exact width of the phone this checklist is for. Everything the phone does differently (touch drag, native colour picker, iOS download, on-screen keyboard, `tel:`/`wa.me` handoff) is outside the standing procedure.
- Office widths do include 390, so the office layout is nominally covered — but its **states** matrix does not include touch reordering, native pickers, or a device draft restored after a reload.
- The procedure is desktop-browser-shaped: it can resize to 390 but cannot observe a real dialler, a real WhatsApp handoff, the iOS photo picker, or the phone's back gesture. Those are the additions this checklist makes.

## Files read for this audit
`app/(site)/**` (layout, home, inventory, car, car-parts, privacy, not-found, components); `app/office/**` (layout, shell, dashboard, inventory, car incl. the full 2,070-line client, enquiries, drafts, activity, settings, account, sign-in/out, error/not-found); all `app/office/actions/*`; all `app/api/*`; `components/site/*` and `components/office/*`; `lib/*` rule and store modules (public-cars, serialize, sections, counts, money, car-input, car-form, car-update, car-create, car-delete, change-check, sale, draft*, enquiry*, device-draft, upload-rules, photo-rules, photos, session, store-guard, origin-rules, settings, notices, cleanup, activity-feed); `migrations/0001–0025`; all eight specs in `openspec/changes/truespec-architecture/specs/`.

## Phase 5 cross-check — interaction inventory → checklist

Every interaction group in `interactions.md` is covered by these checklist sections. No row in the checklist exists without a spec line or a finding behind it.

| Inventory | Interactions | Checklist section |
|---|---|---|
| A. Site chrome | A1–A15 | 1.1–1.12, 5.1–5.6 |
| B. Home | B1–B6 | 2.1–2.12 |
| C. Public inventory | C1–C18 | 3.1–3.22 |
| D. Car page | D1–D24 | 4.1–4.23 |
| E. Office shell / dashboard | E1–E12 | 5.5, 7.4–7.8, 8.1–8.12 |
| F. Office inventory | F1–F13 | 9.1–9.17 |
| G. Car form | G1–G22 | 10.1–10.25, 11.1–11.8 |
| H. Enquiries | H1–H14 | 12.1, 13.1–13.16 |
| I. Drafts | I1–I14 | 12.5–12.18 |
| J. Activity | J1–J5 | 8.6–8.7, 13.17–13.20 |
| K. Settings | K1–K18 | 14.1–14.10, 15.1–15.11, 16.4–16.5 |
| L. Door / account | L1–L8 | 7.1–7.3, 7.9–7.12, 16.1–16.3, 16.6–16.9 |
| M. Files / downloads | M1–M5 | 9.16–9.17, 10.23–10.24, 12.1–12.4, 16.4 |
| N. System behaviour | N1–N6 | 5.4–5.6, 7.11, 8.10, 17.1–17.8 |

**Not phone-testable, and marked as such in the checklist:** the 12 h / 7 d expiry (N5), an induced server error (L8), RLS/single-owner/backup-job/rate-limit questions (DATA-004, DATA-005, SYS-003, SYS-006), and a malformed photo row (FN-002) unless bad data is created by hand. Everything else has a line.
