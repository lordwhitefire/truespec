# TASK-006 — research plan

**Written:** 2026-10-20. **Layer:** System model (Layer 6, the last layer). **Status:** complete —
task and testing written (2026-10-23).

**Completion:** this plan is complete only when `task.md` is written from the findings (with its
`testing.md` companion). The plan is not the task; the task is the last thing this plan produces.

## Why this plan exists

The layer needs findings before it can be written as a task. This file is the guide and the memory:
what to find, what is already settled, where we stopped, and what is next. If the session ends, this
file says where we are. The tracker below is the single source of position — update it as work moves,
never keep the state only in a conversation.

## What the layer covers

Behaviour, request paths, guarantees, boundaries and edge cases; the daily job, convergence, audits,
monitoring, and the pre-handover gate. This is the **last layer**; TASK-007 is the final pass, not a
layer.

## The rule that shapes every answer

The system never deletes on its own initiative — not customer data, not a car, not a file. It makes the
owner **able** to act and **reports** what waits. The only litter it may clear is its own: an upload no
record ever referenced, and `auth_attempt` rows past 90 days (TASK-003 ruling, 2026-10-13). Every daily
job below reports; none removes client data.

## Inputs already in hand — do not re-decide

### The two carried findings (registry, 2026-10-20)

1. **Delete a customer's details.** The privacy notice promises deletion; the office has no delete path
   for an enquiry, and the notice names an email address that does not exist. **Owner ruling: add a
   delete button — the client must be able to delete the data he wants.**
2. **Duplicate car on a second save.** `/office/car/new` carries no identity for the car being made;
   `createCar` mints a fresh UUID per call; after success the form stays put and the Save button stays
   awake. The original build spec explicitly requires that a quick second save does not create a
   duplicate. **Spec gap.**

### The PM's system findings, re-checked against the current code (registry)

- **SYS-001 — changed by ruling.** Clerk carries the lockout (owner, 2026-10-14); the app is meant to
  have none. Remaining: a deployment check that Clerk is set to 10 attempts / 30 minutes.
- **SYS-002 — demo-accepted.** No permissions now; the activity log names the actor. The original spec
  says "Admin (single user)" — the demo deviates deliberately.
- **SYS-003 — open.** The tap endpoint has no rate limit.
- **SYS-004 — accepted for the demo.** No RLS policies; the showroom's fence is the server-only read
  path plus the allow-list serializer.
- **SYS-005 — open, minor.** No in-page expiry signal; the device draft mitigates it.
- **SYS-006 — open, the layer's core.** No backup writer, no storage measurement, no daily job.
- **DATA-001 — cross-layer, open.** The app never writes `enquiry_pdf`.
- **DATA-003 / COV-001 / COV-004 — open.** Cleanup is CLI-only; the office shows only car tombstones.

### Owner decisions already recorded (2026-10-20)

- No permission system for the demo; roles wait.
- The activity log names the user. The data already records the actor's email; the list shows the
  initial and the email on hover — make it visible on touch.
- Backup target: **Sanity**, in a **private dataset or encrypted** — never the public dataset.
- Storage check: **Neon space and Sanity space**.
- Daily job runner: **Vercel Cron**.
- RLS: accepted for the demo; revisit if the office gets multiple users or roles.

### The original build spec (`demo_product.pdf`)

Single admin; rate-limited login; no duplicate records on quick successive saves; image
compression/resizing on upload; real desktop and mobile testing; documentation. The registry records
which of these are met and which are gaps.

## Questions — all answered (findings/07)

| # | Question | Answer |
|---|---|---|
| Q1 | Tap flood: Vercel edge (WAF/rate limit) or in-app? | **Edge WAF, 30 requests/minute per IP** — a Vercel dashboard setting; no app code. |
| Q2 | Session expiry: warn in-page, or accept the draft? | **Accept** — no in-page warning. |
| Q3 | `enquiry_pdf`: fix the link in this layer, or make it its own item? | **Fix here** — the delete needs it. |
| Q4 | Encrypt into the current dataset, or upgrade Sanity? | **Encrypt** with a new AES-256-GCM key; upload with the existing `SANITY_TOKEN`; no private dataset, no permissions. |
| Q5 | Backup scope: database only, or the Sanity assets too? | **Database only.** |
| Q6 | How many dumps are kept? | **The last 7.** |
| Q7 | Cleanup surface: where in the office, and which categories? | **A report-only "waiting to be cleared" list in Settings.** |
| Q8 | Delete button: where and what? | **On an enquiry, with confirmation; removes the enquiry and its PDF file; taps stay; the deletion is logged.** |
| Q9 | Activity list: show the email in the row on touch? | **Yes — the email is visible in the row.** |
| Q10 | Storage thresholds, and where the warning appears? | **Two lines: database 800 MB; photos/files 4 GiB.** |
| Q11 | Privacy notice contact? | **WhatsApp, no email** — the notice is for showroom visitors; the client owns the office data and deletes directly. |

## The tracker

Status: ☐ not started · ◐ in progress · ☑ done. The evidence column says where the proof is.

| # | Phase / item | Status | Evidence |
|---|---|---|---|
| 0 | Plan written; inputs carried | ☑ | this file |
| 1 | Re-verify the delete path and the activity attribution in the current code | ☑ | findings/01 |
| 2 | Re-verify the duplicate-save path (fresh UUID, no post-save state) | ☑ | findings/01 |
| 3 | Verify SYS-002 (owner enrollment) and SYS-005 (expiry signal); activity display on touch (Q9) | ☑ | findings/02 |
| 4 | Verify SYS-003 (tap limit) and decide edge or app (Q1) | ☑ | findings/03 — edge WAF, 30/min |
| 5 | Verify SYS-006: no writer for the job keys; no scheduler; cleanup callers | ☑ | findings/04 |
| 6 | Vercel Cron research: route, secret, schedule, local test, logs | ☑ | findings/04 |
| 7 | Backup research: Neon dump, Sanity file asset, private/encrypted target, restore drill, `last_backup_at` | ☑ | findings/05 |
| 8 | Storage research: what Neon and Sanity expose; thresholds (Q10) | ☑ | findings/05 — DB 800 MB; photos 4 GiB |
| 9 | Cleanup report: categories, queries, surface (Q7) | ☑ | findings/06 |
| 10 | Delete button: where, what it removes, logging (Q8) | ☑ | findings/06 |
| 11 | Owner questions Q1–Q11 answered and recorded | ☑ | findings/07 — all closed |
| 12 | Findings summary written | ☑ | findings/00-summary |
| 13 | `task.md` written from the findings | ☑ | task.md |
| 14 | `testing.md` companion written | ☑ | testing.md |
| 15 | Plan closed — the task exists | ☑ | this file |

## How findings are recorded

- One file per topic under `openspec/tasks/TASK-006/findings/`, numbered as the tracker says.
- Each file: the question, what was checked, the evidence (file:line, command output, store reading),
  what it means, and what is still open.
- No claim without evidence. The PM's findings are re-checked, not copied.
- Runtime checks follow the store discipline: throwaway/net-zero writes only, a demo marker on anything
  created, real cars never touched, any residue reported.

## What this plan does not do

- No code changes.
- No task instructions before the findings are complete.
- No decision the owner has not made — Q1–Q11 are his.
- No secret in the repo; the backup and job keys live in the environment only.

## Current position

The plan is closed. Q1–Q11 are recorded in `findings/07`; findings 01–07 and the summary are
written; the cleanup/delete findings are in `findings/06`; `task.md` and `testing.md` exist. The key
check: the Sanity token exists; the backup key is the only new **recovery** secret; the cron route
adds a replaceable `CRON_SECRET` in Vercel only. The next step is the Builder, not this plan.
