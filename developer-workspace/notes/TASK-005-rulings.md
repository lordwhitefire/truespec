# TASK-005 · The owner's rulings (Q11–Q18)

**Recorded 2026-10-19** by the Developer, from the grilling session itself — OpenCode session
`ses_eb63e3615ffeohEbgy9H5rb7TP`, exported through the running service (`/api/experimental/session/.../export`),
2026-10-17. The owner messages are quoted verbatim, typos included. This file is the ruling record the
plan and the closing report cite; it is **not** a reconstruction from memory. Q7–Q10 and Q12 were
also answered yes and are included for context.

## The widening

`task.md:360-361` says this layer “adds **no feature, no route, no data and no rule**.” Q11 widens that
line: the owner asked for a real device draft so the office's approved sentence *“Offline, your draft
is kept on this device.”* is true. This is a **new feature** — a browser-local draft store — and is
**logged, not hidden**. It adds no route, no server data model and no business rule; the feature is
the single exception to the “no feature” line.

## Source

The grilling ran in four rounds. The owner's answers used in this record:

- Q11 / Q12: *“#11 make it true even it meaans builfing a feature others i am okay with it”* (Q11;
  Q7–Q10 and Q12 accepted).
- Q13 / Q14 / Q18: *“all yes”*.
- Q15 / Q16 / Q17: *“all yes”*.

The questions themselves are in the same session transcript. Q11 asked whether to install only the
true offline sentences or build the draft; Q12 asked for the TASK-004 plan/commit shape; Q13 asked
which forms get a draft; Q14 asked auto-restore vs prompt; Q15 asked for a privacy-page line; Q16
asked client-side only vs a service worker; Q17 asked erase-on-act vs a timer; Q18 asked whether to
record the widening as a ruling.

## The numbered rulings

### Q11 — Make the offline draft-keeping claim true
**Answered:** *“#11 make it true even it meaans builfing a feature others i am okay with it.”*
**Built:** the device draft store (`lib/device-draft.ts`, Task 36 `f45b2eb`), restore (Task 37
`67dd116`), erase-on-act (Task 38 `d27b19c`), and the payload boundary (Task 40 `711640f`). The
office line is now true for the car form and settings. It is client-side only and holds no
customer/enquiry record. **Conflict named:** this is the new feature `task.md` says the layer does
not add; the owner widened the layer and this file records it.

### Q12 — Plan and commit shape (TASK-004 method)
**Answered:** yes — mirror TASK-004: numbered tasks, phases, AC · Verify · Deps · Files, gates and
owner checkpoints, a progress tracker, one note per task, and **one commit per task** (per slice when
sliced), plan committed first. **Built:** `developer-workspace/plans/TASK-005-plan.md`; the task
notes and commits through Task 40 and checkpoint C.

### Q13 — Which forms get a device draft
**Answered:** all office forms with unsaved typing. **Applied to the code as it exists:** the office
has two such forms — the **car form** and **settings**. The enquiries screen is a read-only board;
there is no enquiry editor, so no third form exists. **Built:** Tasks 36/37/38 for both forms. No
enquiry/customer key is stored.

### Q14 — What happens when the person comes back
**Answered:** put the draft back automatically, no prompt, and let the approved recovery line say so.
**Built:** Task 37 — car fields/state/photo references and settings cards restore only when the
draft's `base` matches the current page/store and the value differs; a plain reload writes no draft.
The exact recovery line is *“You're back online. Your draft is still here — press Save.”*

### Q15 — Privacy-page disclosure
**Answered:** yes — add one plain line to the device-storage list. **Later owner ruling (2026-10-19)
supersedes this for the public page:** the privacy notice is visitor-facing, while the draft is
private, owner-only office storage and never a public payload. Task 39 is **closed — not done**, and
`app/(site)/privacy/page.tsx` is unchanged (`notes/TASK-005-task39.md`). The later ruling governs; the
original answer is recorded, not erased.

### Q16 — How the offline path works
**Answered:** client-side only — catch the failed tap inside our chrome, show the offline state, and
record the residual. **Built:** Tasks 34/35 — the showroom line, the office banner, disabled network
controls, and no service worker (`0` SW registrations, `0` caches, no outbox). **Residual (Q16a):**
a hard browser reload while offline still exits to the browser error page; this is recorded, not
claimed away. No cached showroom and no queued sends.

### Q17 — When a draft is erased
**Answered:** only when the person acts — successful save, explicit discard, or sign-out — never on a
clock. **Built:** Task 38 `d27b19c`; `clearDrafts()` removes only `ts-draft:` keys. The live drive
showed Cancel/discard, settings Save, and sign-out each erasing the draft, while theme and a
non-draft key survived.

### Q18 — Record the widening
**Answered:** yes — record it as a numbered owner ruling and flag the `task.md` conflict in the
report. **Built:** this file, cited from the plan and the closing report. The closing report names
the Q11 exception, the Task 39 closure, and the showroom “Reload” copy conflict.

## The later ruling that is not Q11–Q18

**Task 39 — closed, not done (owner ruling 2026-10-19).** The public privacy notice stays as it is.
This is not a hidden failure and not a built task. Task 44's report must say **43 tasks built/closed
as ruled, 1 closed not done** — not “44 built.”

## What this record does not claim

- It does not claim the public privacy page says anything about drafts.
- It does not claim the office stays inside the app on a hard reload while offline.
- It does not claim a service worker, cache, outbox or auto-send exists.
- It does not claim a third (enquiry) form exists or holds a draft.
- It does not claim the showroom “Reload to see the site.” wording was changed; it is kept verbatim
  and flagged as a copy conflict.

## Traceability

| ruling | evidence |
|---|---|
| Q11 | `notes/TASK-005-task36.md`, `TASK-005-task37.md`, `TASK-005-task38.md`, `TASK-005-task40.md`; commits `f45b2eb`, `67dd116`, `d27b19c`, `711640f` |
| Q12 | plan tracker and commit log through `a555115` |
| Q13 | `notes/TASK-005-task36.md` (car + settings only); `notes/TASK-005-task40.md` (no customer data) |
| Q14 | `notes/TASK-005-task37.md`; witnesses §Task 37 |
| Q15 + Task 39 closure | `notes/TASK-005-task39.md`; privacy page no diff |
| Q16 / Q16a | `notes/TASK-005-task34.md`, `TASK-005-task35.md`; witnesses §Tasks 34–35 |
| Q17 | `notes/TASK-005-task38.md`; witnesses §Task 38 |
| Q18 | this file; plan; closing report |
