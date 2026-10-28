# Audit plan — interaction inventory and phone checklist

**Status:** approved and completed 2026-10-20 — findings in `findings/`, checklist delivered
**Date:** 2026-10-20
**Author:** Product Management agent

---

## Purpose

Read the codebase and produce a checklist the owner will run **by hand, on a phone**, so that
someone else can later repeat the same actions on the same phone.

**What this is not:** verification. Nothing is executed. No browser is attached. No build is run.
No endpoint is called. No database is queried. No pass or fail is declared. The code can say a
button exists and what it calls; only a device can say it works.

**The owner is the instrument. This work is the map.**

---

## Principle

Read-only over source. Findings are written at the moment they are seen, never batched to the end,
because context compaction will otherwise erase them. If it is not written down, it did not happen.

---

## Phase 0 — Establish what "correct" means

Intended behaviour must come from the project's own documents, never from opinion.

- `openspec/changes/truespec-architecture/specs/` — dashboard, enquiries, inventory, media, money,
  office-access, office-settings, showroom.
- `product-management/` layer plans — ui-plan, ux-plan, business-logic, data-model, functionality,
  system-model.
- `developer-workspace/procedures/browser-check.md` — **for coverage only**: which screens, widths and
  states exist. Not executed.
- Existing reports in `developer-workspace/reports/` — so settled issues are not re-raised.

**Output:** a working note of what the product claims to do, which becomes the *expected* column.

---

## Phase 1 — Build the interaction inventory

Walk the code in a fixed order and extract every thing a person can do.

1. **Routes** — `app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
2. **Gates** — `middleware.ts` and Clerk usage: who reaches what, and what happens when they cannot.
3. **Components** — `components/**`: buttons, links, forms, inputs, selects, comboboxes, dialogs,
   sheets, menus, tabs, toasts, uploads, drag handles, pagination controls.
4. **Calls out of the UI** — what each interaction invokes; what it sends and expects back.
5. **API routes** — `app/api/{autofill,enquiry-template,export,tap,template,upload}`: method, params,
   validation, status codes, side effects.
6. **Server actions** — `app/office/actions/**`, same.
7. **Business rules** — `lib/**`: validation, calculations, filtering, sorting, pagination, permissions.
8. **Data** — `migrations/**` and queries: constraints, cascades, what actually persists.
9. **Rendered states** — loading, empty, error, success, disabled, read-only.

For each interaction record: **ID · screen · trigger · input · what it calls · expected result ·
states · risk note.**

**Output:** `product-management/findings/interactions.md`, written as found.

---

## Phase 2 — Findings, classified, incremental

Every observation lands immediately in `product-management/findings/`.

| File | Holds |
|---|---|
| `INDEX.md` | every finding: ID, layer, severity, one-liner, status |
| `ui.md` | surfaces, layout, responsive behaviour, states |
| `business-logic.md` | rules, validation, permissions, calculations |
| `data.md` | persistence, constraints, cascade, payload shape |
| `functionality.md` | features and whether the wiring is complete |
| `ux.md` | feedback, copy, destructive confirms, recovery, empty first-run |
| `system.md` | auth gates, error handling, limits, failure paths |

Severity: **blocker / major / minor / polish**. Plus one honest category — *code says X, only a
device can confirm* — which feeds the checklist.

---

## Phase 3 — Coverage cross-check

Look deliberately for what falls through:

- Routes nothing links to → dead screens or missing navigation.
- UI elements with no handler → buttons that do nothing.
- Handlers with no UI → built but unreachable.
- States defined but never rendered → untested branches.
- Phone-width (390) behaviour: anything the code makes conditional on width.

**Output:** `product-management/findings/coverage.md`.

---

## Phase 4 — The phone checklist

Built from the inventory and findings, then re-sorted into **journey order**, because it is run
holding a phone, not reading a codebase.

1. **First run & public site** — home, 390 width, scroll, navigation, tap targets.
2. **Browse** — inventory, filters, sorting, pagination, empty results.
3. **Car detail** — gallery, specs, sold/unavailable, not-found.
4. **Enquiry** — form, validation, submit, confirmation, duplicate tap.
5. **Office sign-in** — wrong credentials, signed-out access, session persistence.
6. **Office core** — dashboard, inventory list, create/edit/delete a car, photos/upload.
7. **Enquiries & drafts** — list, open, detail, template, PDF/export.
8. **Activity & settings** — filters, restore/undo, account.
9. **Destructive actions** — delete, confirm dialogs, cancel behaviour.
10. **Phone conditions** — keyboard, safe areas, rotation, backgrounding, slow network,
    airplane mode, back button.

Each line carries: **ID · screen · exact action · expected result · what to watch for · the finding
it came from.**

**Output:** `product-management/phone-checklist.md`.

---

## Phase 5 — Check the work

- Every interaction in the inventory appears in the checklist, or is explicitly marked
  not-phone-testable.
- Every checklist line traces to a finding or a spec line — no filler, no generic advice.
- No duplicates; no line requiring a developer to interpret.
- Index re-read against the layer files so nothing found is lost.

---

## Deliverables

```
product-management/
├── findings/
│   ├── INDEX.md
│   ├── interactions.md
│   ├── ui.md
│   ├── business-logic.md
│   ├── data.md
│   ├── functionality.md
│   ├── ux.md
│   ├── system.md
│   └── coverage.md
└── phone-checklist.md
```

Nothing is run. Nothing is verified. The checklist is the only thing that claims to know whether
the app works — and it makes that claim by asking the owner to prove it.


---

## Completion record — 2026-10-20

- Phase 0: all eight specs read; `findings/spec-baseline.md` written.
- Phase 1: every public page and office screen read, plus all API routes, all office actions, the office components, the rule modules, and migrations 0001–0025.
- Phase 2: **57 findings** — 6 blocker, 21 major, 24 minor, 6 polish — across UI (8), UX (11), functionality (9), business logic (11), data (6), system (6), coverage (6). `INDEX.md` reconciles 57/57 with the seven layer files.
- Phase 3: coverage cross-check written, including what the standing browser-check procedure cannot see (public widths have no 390 px; touch, dialler, WhatsApp, native pickers and iOS download are outside it).
- Phase 4: `phone-checklist.md` — **236 rows**, ordered by user journey, one interaction per row, with expected result and finding reference; a blocker-first section (18); a hand-over section for the second runner (19).
- Delivery: the checklist is also rendered to `phone-checklist.pdf` (A4, 31 pages, section per page) for printing and hand-over.
- Phase 5: interaction-group crosswalk in `coverage.md`; every finding is referenced from the checklist; no duplicate row numbers; index and layer files agree.

**Not done, by instruction:** no app interaction, no build, no browser, no database query, no endpoint call. No line has been marked pass or fail. The owner runs the checklist; the checklist is the only thing that asks whether the app works.
