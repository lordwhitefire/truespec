# TASK-005 · Task 39 — Closed, not done

**Date:** 2026-10-19 · **Status:** **CLOSED — NOT DONE** (owner ruling) · **Original deps:** 36.
**Product files:** none. **Privacy page:** unchanged.

## The owner's decision

The privacy page is written for **public visitors** — the people who see the showroom, the dark-mode
choice and the WhatsApp tap record. The device draft is different: it is the owner's own unsaved
typing inside the authenticated, owner-only office, kept in that browser's `localStorage`. It never
enters a public payload; a visitor cannot create one.

The task's proposed one-line disclosure would therefore put **owner-facing copy on a visitor-facing
page**. It also reads oddly against the notice's own "no accounts, no forms" framing. The owner
ruled: **do not add it**. The page was not edited, no copy was approved, and no live privacy-page
read was made — there was no change to read.

## What this means

- Task 39's original AC is **not met**; it is waived by the owner's ruling, not quietly claimed.
- The privacy page remains byte-identical (`git status --short -- 'app/(site)/privacy/page.tsx'`
  empty).
- The draft is still described where it belongs: the office's own offline line says *"your draft is
  kept on this device"*. That line is about the office, not the public notice.
- This is a **closed task in the 44-task plan**, not a hidden failure. Task 41's rulings record and
  Task 44's closing report must name it rather than count 44 built tasks.

## Why this is not a product defect

The public page's promise is about public visitor data. The office draft is private, owner-only,
device-local, holds no customer/enquiry record (Task 40), and never appears in a public payload
(SD11). Keeping the visitor notice free of office-only detail is the accurate placement; adding a
separate owner-facing notice would be a different, wider documentation change, not this task.

## Verified

- The privacy page has **no diff**; no source file changed.
- No copy was taken into code; no test was added; no live page claim is made.
- Plan tracker and task row mark **☒ closed — not done** with this reason.
