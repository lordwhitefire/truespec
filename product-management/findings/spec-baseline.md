# Spec baseline — what "correct" means

**Source:** `openspec/changes/truespec-architecture/specs/*/spec.md` (8 specs, 595 lines), read 2026-10-20.
**Purpose:** the *expected* column for the phone checklist. Not my opinion — the project's own requirements.

---

## Showroom (public)
- Exactly three sections: **Available, On Order, Landed**. Owner can never rename/add/remove them.
- Landed appears inside Available. A "new arrival" shows under both, counted **once**, with an "of which N new arrivals" note.
- Public responses built from an explicit **allow-list**: brand, model, trim, year, colours, mileage, features, photos, price, section, reference. **No cost, no profit, never.**
- A car appears publicly only with **a price AND at least one photo**. Otherwise office-only.
- Car page: price (full naira, not abbreviated), year, mileage, colours, features, photos. Photos **swipeable on phone/tablet**, arrows additionally on laptop.
- WhatsApp button: opens chat with a pre-filled message naming that car. Records a tap row with **page, car ref, time only** — no name, number, or message.
- Sold or deleted cars leave the showroom; an old shared link gets a **graceful not-available** outcome, not an error page or stale data.
- Counts on home and inventory use the **same single rule** as the office (Available = Available group + Landed-this-year, sold excluded).

## Inventory / cars (office)
- **One form** for add and edit: details, photos, costs, state, private notes; **live profit figure** while typing, labelled "estimated" until landed.
- Form factor by device: **phone = full page, tablet = drawer, laptop = inline**. Same fields on all three.
- **Two kinds of state:** four fixed primaries (**Available, On Order, Landed, Sold** — not addable/renamable/deletable) and owner-made secondaries (none or several per car). Every car sits under exactly one primary.
- Secondary states: no section mapping, no new-arrival flag. Deletion of an occupied state is **blocked with a count/explanation**.
- **Sold is a primary state**; setting it records a sale (price + date), removes the car from showroom, places it in Sold/Archive, keeps it in lifetime totals, out of stock counts, moves profit projected→real. Un-marking reverses/voids, returns to **previous primary state**, leaves secondaries untouched.
- **Private labels never reach buyers** — buyers see only Available/On Order/Landed names.
- **Delete:** confirmation required, **undoable within 8 seconds**, after that a soft-delete tombstone. Tombstone permanent until the **owner** removes it. No job/clock ever hard-deletes.
- **Create from file → drafts**, one per car, never a car row. Draft: no `TS-####`, no change-check, sits in no state, not counted, not public. Code + change-check assigned **at save**. If the named state no longer exists at save, the save **asks the owner to choose**.
- **Reference codes** `TS-####`: assigned once at creation, never edited, never reused after deletion.
- Draft images must be added by hand (template carries values, not pictures) and must **survive a reload**.

## Money
- Six fixed cost kinds: purchase price, shipping, clearing, trucking within USA, trucking in Nigeria, full tank. All naira.
- "Cost complete" only when **all six have values**; **0 counts as entered**.
- **No exchange rate anywhere.**
- Total cost = Σ six lines, one function used at every read point. Recompute on every edit.
- Money stored as **integer minor units (kobo)**. Naira formatting only at the display edge.
- Projected profit = doorstep price − total cost (unsold). Real profit = sale price − total cost (sold). **Negative profit displays without correction.**
- Cost labels by state: "Estimated total cost" (on order/at port/cleared), "Landed cost" (landed), "Total cost" (sold).
- **One selling price** on the car (doorstep price); no state/section carries a price.
- Incomplete-cost cars: contribute to money-tied-up, **excluded from profit totals** with a "still building" line naming how many.

## Enquiries
- An enquiry is **not a car record** — no join to a car by reference/key. The car asked about is held **in the customer's own words**.
- Taps: page, car ref, time only. No PII.
- **Privacy notice before the tap** on the WhatsApp entry page — what's collected, why, how long, right to deletion.
- **Full tap list** exists as its own view; opening it **marks them seen** (badge clears, glyph stays). Seen-mark is a **POST**, resolved against a tap row that exists, and only ever moves forward.
- Uploaded enquiry PDF → **drafts**, one per row, never enquiries. Editable fields only. Owner corrects and saves one by one; **save creates the enquiry** and enforces its rules. Unreadable rows **explained and named**, never silently dropped.
- Enquiry states: seeded New, Talking, Negotiating, Sold, Lost — editable registry (add/rename/reorder; delete blocked while occupied). **No order enforced** between states.
- Enquiry state **never changes a car**.
- **Retention:** due for the owner's decision 12 months after recording. System **notifies, never deletes on its own**. Deletion removes the enquiry + its PDF, leaves taps, leaves the car, logs to activity.
- Customer details **office-only**, never in a public payload.
- Imported PDFs kept in private storage, randomized filenames, linked to produced enquiries, deletable by owner.

## Media
- Images in Sanity, list in DB (ordered photo list, **cover = position 0**). No Sanity Studio.
- **Upload first, car saves second.** Images can attach to a draft; draft's images survive reload.
- **15 MB upload cap**, EXIF stripped at write boundary, no derivatives in v1.
- **Showroom survives image-store failure** — placeholder, page still loads.
- Daily reconcile job **reports, never deletes** — two exceptions only: unreferenced half-finished uploads, and `auth_attempt` rows past 90 days.
- Uploaded files stored privately, randomized filenames; references **never in a public payload**.

## Office access
- Exactly one owner account at the provider; **invite-only**, no sign-up path, no registration route.
- **Every office page/data request checked server-side** against an active session. Sign-out immediately refuses everywhere, including open tabs.
- Session lifetime: **12 hours inactivity or 7 days total**, enforced by the app.
- Session row created **lazily** on first office request; no webhook, no callback route.
- Provider carries the sign-in; app builds no sign-in form and holds no credential material.
- Lockout: **10 failed attempts**, bounded period that clears itself (30 min). Never indefinite.
- **State changes are POSTs with origin verification.** No GET changes data. Cookie HttpOnly, SameSite=Lax, Secure.
- No in-app password reset; Settings documents that recovery is a provider operation.

## Settings
- Exactly: WhatsApp number, tagline, full-tank default, password change, data export. **No rate field.**
- WhatsApp number validated inline; valid = Nigerian mobile as `+234…`, `234…`, `0…`; **stored normalised to `+234…` digits only**; invalid refused and previous stays active.
- **One-click export → one ZIP**: `master.json`, one CSV per subject (cars, costs, photos, enquiries, taps, activity, settings), `README.txt`. Not an Excel workbook. Office-only.
- In-product notices (storage threshold default **4 GB**, backup status) **read from setting rows**, never computed live.

## Dashboard
- Fixed layout regardless of states/labels: stock counts, money totals, recent taps, recent activity.
- **Refresh on window/tab focus** — no manual Refresh button.
- Tap notification is a **badge only** — no alert, popup, or sound.
- Recent activity feed: cars added, states changed, sales, deletions, imports — subject and time.

---

## Note on the browser-check procedure
`developer-workspace/procedures/browser-check.md` — read for **coverage only**, not executed.
Its cell matrix: public `560/820/1100` × dark/light; office `1440/820/560/390` × dark/light.
**Public matrix has no 390 (phone) width** — noted as a gap for a phone checklist.
Its own limits: surfaces only, no screenshots, interactive behaviour only if actually driven.
