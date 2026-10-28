# Plan — MVP handover: client note + page-by-page user guide (PDF)

**Date:** 2026-10-23
**Owner:** (project owner)
**Status:** COMPLETE — 2026-10-23. Approved and delivered. Artefacts in `product-management/handover/`.

---

## 1. What I was asked to produce

Two client-facing items, for handover of the finished build:

1. **A short note** to the client.
2. **A PDF user guide, in plain language a 10-year-old can follow**, showing page by page: what each page is for, and how to use it — including the sandbox email and password so he can log in and use it online.

The handover is framed as **an MVP, not a demo**. It says what changed from the original requirement and why, since some requirements were deliberately replaced with better options. It covers the running build at `http://127.0.0.1:3210` (`/office`), which is live against the throwaway Neon branch — not the live store.

## 2. One line — what I will produce

A `product-management/handover/` folder holding: the requirement summary, a read-only page-by-page inventory of the running build, a spec-vs-build change log, the guide as editable HTML plus a rendered PDF, the short note, and a pre-send checklist — all for the owner's approval before anything reaches the client.

---

## 3. Boundaries I will hold

- **Read-only on the product.** No writes, no config, no data changes, no tickets. I only look at pages and read them.
- **Exactly two browser tabs**, reused: the build (signed in) and the reference site. I will not open a third.
- **Everything described must have been seen.** No page, button, or flow appears in the guide unless it exists in the running build.
- **The throwaway Neon branch is called out plainly** in the guide, so the client knows it is a sandbox with sample data and what that means for him.
- **I recommend; the owner decides and sends.** I do not contact the client and do not put credentials anywhere outside the deliverable.
- **Nothing outside `product-management/` is written.**

---

## 4. Steps

### Step 1 — Read what was actually asked — **read on the owner's instruction, 2026-10-23**
`demo_product.pdf`, 5 pages: *"TrueSpec Automotive — Secure Inventory Website (Build Spec)"*.
Findings that change the framing:
- **The word "demo" does not appear anywhere in it.** The brief asks for "a two-sided web application" and "a live, deployed website", with the critical requirement that financial data "must never be retrievable by the public... enforced on the server, not just hidden in the frontend", plus tests for exactly that. It is a production brief, not a demo brief.
- **RLS is not a requirement.** It appears once, under *"Suggested Stack (adjust to your builder's preference)"*. The **outcome** is required; RLS is one mechanism for it. The change log must not claim the spec demanded RLS.
- **Documentation is Deliverable item 3** — *"how to log in, add a listing, and update settings"*. The PDF is not a courtesy, it is a contracted deliverable, and should be named as one.
- **No timeline appears in the brief.** The two weeks was the owner's own quote. The overrun is the owner's to own, not the document's fault.
- **Gap:** the brief requires a public URL and a separate admin route. The build currently runs at `127.0.0.1:3210`, which no client can open. The deployment target must be confirmed before the guide promises "online".
Output: `handover/01-requirement.md` (not yet written).

### Step 2 — Walk the build, page by page, read-only
Enumerate routes from `app/` (as a checklist only), then verify **every** one in the running build over CDP at `http://127.0.0.1:9222`, reusing the two existing tabs. For each page record: what it is for, what the client sees first, what he can do there, what a normal first action is, and any empty/error state worth explaining. Capture a screenshot per page — for my own accuracy only; the guide itself will not reproduce them.
Output: `handover/02-page-inventory.md` + `handover/screens/`.

### Step 3 — Spec vs build: the change log
Line by line: what the requirement said → what shipped → why the better option was taken. Includes the RLS work and the resulting timeline reality (2 weeks expected, ~5 weeks actual, because the requirement implied an MVP, not a demo).
Output: `handover/03-what-changed.md`. This feeds the "what changed and why" section of the guide.

### Step 4 — Settle the framing (Comprehend → Identify → Report)
The client is not buying a changelog or a status report. He needs to know: *this is mine, it works, it is safe, and here is how I use it.* I will write one plain-language paragraph defining what "MVP" means here — what it does, what it deliberately does not do yet, and what the 5 weeks bought. This is the single most consequential paragraph in the pack, and it is where "MVP" is either earned or read as an excuse.

### Step 5 — Choose the guide's structure (Cut → List → Evaluate)
Options for a 10-year-old reader:
- **(a) Page-first:** one section per screen — "this page is for…", "do this…". Predictable, matches the brief literally.
- **(b) Task-first:** "how do I add a product", "how do I check stock". Easier for a non-technical reader, but pages get repeated.
- **(c) Guided tour:** one end-to-end walkthrough, screens in the order a new user meets them.

Recommendation: **(a) with a two-page (c) at the front** — a short "start here" walkthrough, then the reference. Given up: length, and page-first reads like a manual. With no screenshots (see 5.3), the walkthrough carries more weight, not less — it is the only thing that creates a sense of place.

### Step 6 — Write and render
- `handover/MVP-User-Guide.html` → `handover/MVP-User-Guide.pdf`.
- `handover/note-to-client.md` — the short message, plain language, no jargon, no apology theatre.
- Credentials block, marked **sandbox account** — filled from what the owner supplies. I will not invent or generate credentials.
- Rendering: reuse whatever produced `product-management/phone-checklist.pdf` if it is sound; otherwise headless Chrome print-to-PDF. I will confirm the renderer before promising the PDF.

### Step 7 — Pre-send check
A checklist the owner can run in 60 seconds: every screen in the build appears in the guide; no screen appears that does not exist; no live-store references; credentials correct and marked sandbox; the change log has no claim the requirement does not support; page count and file size sane for email. Output: `handover/04-send-checklist.md`.

---

## 5. Answers received (2026-10-23)

1. **Credentials — supplied.** Throwaway account `test@gmail.com`. Printed in the guide only; not duplicated into the plan, the note, or the checklist. Treated as a sandbox account throughout, and labelled as one where the client reads it.
2. **Timeline — confirmed 2026-10-23: the client was told a *demo* would take two weeks. Five weeks have passed. He does not know the real duration.** Silence is therefore no longer available — a date was given, so the note must name the overrun.
   - **Owner's instruction, 2026-10-23 — a hard constraint on the drafting: the client is not blamed anywhere in the note.** The owner's own position: *"It was my own fault... I didn't realize it early... I take full responsibility."* The client wrote the brief as a client, not as a developer. No sentence in the note may imply otherwise.
   - **Recommended shape: name the failure, own it once, then hand over the product.**
     1. Name **the silence**, not just the delay: *"I quoted you two weeks and I'm handing this over at five, and I didn't tell you when I knew it had changed. That's on me."* The delay is the smaller injury; the not-saying is the one that costs trust.
     2. One sentence of *what changed*, framed as a discovery, never as anyone's fault: *"Some of what your brief requires can't be shown in a demo — a demo shows a picture of a lock, not a lock. I found that late, and I chose to finish the real thing rather than hand you something that can't be tested."*
     3. Then what it gives him, then the guide. No second apology after that point.
   - **Do not over-apologise.** A client does not want a contractor who grovels; he wants one who names the failure, states what changed, and hands over something that works. Repeating the apology transfers the anxiety to him.
   - RLS belongs in **one clause**, not a paragraph, and only as the last thing found: *"the last piece was row-level security — I found it late, and shipping without it would have looked finished while being unsafe."* It explains the extra time without excusing the silence.
   - **Division of labour between the two artefacts:** the note carries the accountability. The PDF stays a pure user guide — no apologising inside it, no timeline, no defensiveness. A guide that apologises reads as a warning.
3. **Screenshots — no.** The guide is text-only. This raises the bar on wording: with no picture of a page, every description has to be precise enough to find the page and the button without one. Where a page has an unusual label, the guide quotes the label verbatim.

## 6. What this plan does not do

- It does not change, fix, or deploy anything.
- It does not decide the MVP wording for the owner — it recommends and shows the reasoning.
- It does not send anything.
