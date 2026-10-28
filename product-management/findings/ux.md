# UX findings — honesty, feedback, recovery

---

## UX-001 — Fabricated social proof
**Severity:** major · **Status:** open
**Evidence:**
- `components/site/HomeBehaviors.tsx:149-172` — picks a random car, random city from `CITIES`, random time from `WHEN`
- `components/site/InventoryBrowser.tsx:269-292` — same
- `components/site/CarBehaviors.tsx:376-398` — same, using the car's name

**What the code does:** after 9 seconds it shows *"Someone from Lagos asked about the 2021 Lexus RX — 20 min ago."* Nothing is read, counted or checked. The city, the car and the time are all `Math.random()`.
**Why it matters:** this is the product asserting that a named person did something at a named time. It is not true, and a buyer who asks "who?" cannot be answered. In a marketplace whose pitch is "one honest doorstep price", it is the wrong first impression.
**On a phone:** open home, wait 9 seconds. Then open inventory in the same session — the toast is once per session, so it will not repeat.
**Decide:** remove it, or replace the text with something true (e.g. real tap counts from `tap` rows).

## UX-002 — Live site tells the visitor it is a demo
**Severity:** blocker · **Status:** open
**Evidence:** `app/(site)/privacy/page.tsx:140-146` — an "Owner note" block rendered on the public page: *"this is a demo privacy notice. Replace the 'last updated' date and any contact details before publishing."*
**Why it matters:** this is the page a client or regulator opens first. It says, in the product's own voice, that the notice is not real. The site is already pushed online.
**On a phone:** open `/privacy`, scroll to "Who to contact".

## UX-003 — The home question promises a filter it does not apply
**Severity:** major · **Status:** open
**Evidence:** `app/(site)/(home)/page.tsx:31` — *"One tap and I'll shorten the list for you"*; `components/site/HomeBehaviors.tsx:215` — navigates to `/inventory?body=SUV` or `?body=Sedan`. `app/(site)/inventory/page.tsx:40-56` parses `status, make, year, color, min, max, sort, view, page` — **no `body`**.
**What happens:** the buyer answers "A family SUV", lands on the full inventory, unfiltered. The one thing the product promised to do at that moment, it does not do.
**On a phone:** home → answer "A family SUV" → check URL says `body=SUV` and the list is everything.

## UX-004 — "Email us" with no email address
**Severity:** minor · **Status:** open
**Evidence:** `app/(site)/privacy/page.tsx:121-124` — *"email a short request to the contact below"*; the contact section (`:127-139`) offers WhatsApp only. No email appears anywhere in the site chrome.
**On a phone:** open `/privacy` → "Your rights" → look for the address.

## UX-005 — Exit-intent is a gesture most people will never make
**Severity:** minor · **Status:** open
**Evidence:** `HomeBehaviors.tsx:133-147`, `InventoryBrowser.tsx:242-256`, `CarBehaviors.tsx:358-374`.
**What it requires:** a touch that starts below `y=140`, moves upward faster than `0.9 px/ms`, and ends while `scrollY < 80`. In practice: a fast flick from the top of the page while already at the top.
**Effect:** on a phone the "Before you go" modal is effectively unreachable by accident — which may be intended, but it means the recovery/offer path is not actually tested by normal use.
**On a phone:** try a normal scroll; then a fast flick upward from the top.

## UX-006 — Return-visitor messages depend on invisible local state
**Severity:** minor · **Status:** open
**Evidence:** `HomeBehaviors.tsx:54-62` (`asked`, `visits`, `known`, `lastcar` in `localStorage`); `CarBehaviors.tsx:143-168` (`seen[slug]`).
**Effect:** the home page changes its greeting and the car page says "Good to see you back" on the second visit. Clearing site data resets all of it. On a shared or freshly reset phone, none of these states exist.
**On a phone:** visit home once, close the tab, reopen. Then visit the same car twice.

## UX-007 — The WhatsApp notice is once per visit, per tab
**Severity:** polish · **Status:** open
**Evidence:** `components/site/WhatsAppGate.tsx:60` — `shown` is a `useRef`, so it resets on reload and is per tab.
**Effect:** the privacy notice appears before the first WhatsApp tap of each page load. Reload and it appears again. That is defensible, but it means "shown before the tap" is not once per person — check it does not feel repetitive on a phone where tabs reload constantly.

## UX-008 — Cancel silently discards the device draft
**Severity:** major · **Status:** open
**Evidence:** `app/office/(shell)/car/car-client.tsx:1781` — the edit/add **Cancel** is an `<a href="/office/inventory" onClick={clearCarDraft}>`. `clearCarDraft` (:639) erases the `localStorage` copy. No confirm, and the label says only "Cancel".
**Effect:** the car form has no visible "discard changes" concept, and the device draft is the only recovery if the page closes. Tapping Cancel after ten minutes of typing deletes that recovery **and** leaves the page. (The browser's own back button keeps the draft; Cancel does not.)
**Check on the phone:** type into a car, tap Cancel, return to the car — confirm the typing is gone with no question asked.

## UX-009 — An enquiry state pill commits on one tap
**Severity:** minor · **Status:** open
**Evidence:** `app/office/(shell)/enquiries/enquiries-client.tsx:104,303` — each pill calls `give(cur, s)` → `setEnquiryState` immediately, with a toast and no confirm.
**Effect:** a mis-tap in the detail dialog moves a customer to another state with no undo. On a phone the pills are close together. The board is the only record of where a customer stands.
**Check on the phone:** open a customer, tap the neighbouring state by accident, and see whether it can be put back without knowing the old one.

## UX-010 — Live copy tells a real owner this is a demonstration
**Severity:** polish · **Status:** open
**Evidence:** `app/office/(shell)/settings/settings-client.tsx:406` — "**Owner:** the demonstration ships with a placeholder number. Save your real one here…".
**Effect:** harmless while the number is a placeholder; wrong and slightly alarming once the office is in real use — it is the first sentence beside the field that controls every chat button.
**Check on the phone:** read the WhatsApp card with the real number saved.

## UX-011 — The WhatsApp preview keeps the last valid number while the field is invalid
**Severity:** polish · **Status:** open
**Evidence:** `app/office/(shell)/settings/settings-client.tsx:44` (comment), `:95`, `:435-438` — `pvLink` is only updated when the number parses; the digits line above can show the half-typed number while the link below shows the previous good one.
**Effect:** the preview can show a link that does not match the number on screen. It is a faithful port of the reference, but on a phone it is easy to read as "the new number is accepted".
**Check on the phone:** delete a digit from the number and watch the preview link.
