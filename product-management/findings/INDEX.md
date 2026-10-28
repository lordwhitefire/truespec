# Findings index

Every finding, one line each. Layer files hold the detail.
Severity: **blocker** (breaks a promise or leaks) · **major** (visible wrong behaviour) · **minor** (works but wrong) · **polish**.
Status: `open` — found by reading, not yet confirmed on a device.

| ID | Layer | Sev | Finding | Status |
|---|---|---|---|---|
| UI-001 | UI | minor | Four social links are `href="#"` — header Instagram, footer Instagram/Facebook/YouTube | open |
| UI-002 | UI | polish | Theme toggle starts as dark before reading storage; icon can flash; `aria-label` always "Toggle dark mode" | open |
| UI-003 | UI | minor | Available cars show no status chip on grid cards, but show an "Available" chip in list rows | open |
| UI-004 | UI | minor | Home "Landed this year" tab filters strictly `section === "landed"`, while `presentedSections()` says an available car flagged new-arrival belongs under Landed too | open |
| UX-001 | UX | **major** | Social-proof toast is fabricated — random city, random time, random car, in home, inventory and car pages. It tells the buyer something untrue | open |
| UX-002 | UX | **blocker** | Public privacy page carries an owner note: *"this is a demo privacy notice. Replace the 'last updated' date and any contact details before publishing."* Site is live | open |
| UX-003 | UX | **major** | Home "A family SUV" / "A saloon" navigates to `/inventory?body=SUV` / `?body=Sedan`; the inventory page never reads `body` — lands on the full list | open |
| UX-004 | UX | minor | Privacy "Your rights" says email a request; no email address exists anywhere — only WhatsApp | open |
| FN-001 | Functionality | **blocker** | `getPublicCarForView` skips the `isListed` gate, so a car with no price or no photo renders publicly at **₦0** instead of 404 | open |
| FN-002 | Functionality | major | `resolvePhotoUrl` throws on any asset id not starting `image-` — one bad row crashes the whole page instead of showing the placeholder | open |
| FN-003 | Functionality | minor | `getPublicCar()` (the `isListed`-filtered read) is dead code — nothing calls it | open |
| BL-001 | Business logic | minor | `countStock` counts new arrivals only among `landed`; an `available` car flagged new-arrival is presented under Landed but never counted as one | open |
| UX-005 | UX | minor | Exit intent needs a fast upward flick from the top; normal phone use will never see it | open |
| UX-006 | UX | minor | Return-visitor greetings depend on invisible `localStorage`; clearing site data resets them | open |
| UX-007 | UX | polish | The WhatsApp privacy notice is once per page load, per tab, not once per person | open |
| FN-004 | Functionality | minor | "See what's new" has no baseline on a first visit and shows "0 cars" while stock exists | open |
| FN-005 | Functionality | major | `?body=` is written by the home answer flow and never read by the inventory (see UX-003) | open |
| FN-006 | Functionality | minor | Filter counts are computed from all cars, so a count can include cars the other filters exclude | open |
| FN-007 | Functionality | minor | The related-cars strip is not filtered by section, so "More landed cars" can contain on-order cars | open |
| FN-008 | Functionality | minor | The ticker's "biggest drop" can name a car that is not available | open |
| BL-002 | Business logic | minor | The section filter accepts `?status=s` (sold), a state no public control can express; the result is an empty list | open |
| BL-003 | Business logic | minor | The price filter uses `parseInt` and has no upper bound; decimals truncate and min > max is not handled | open |
| BL-004 | Business logic | minor | "Special" is inferred at read time from was-price > price; raising the price silently removes the badge | open |
| BL-005 | Business logic | minor | Sold is read from two signals (`sale` row and section), which can disagree after an un-mark | open |
| BL-006 | Business logic | minor | Cost completeness is defined in `money.ts`, but the form is the real gate — carries into the office pass | open |
| BL-007 | Business logic | polish | Two `Number()` conversions at the money boundary would drift past 2^53; not reachable at car prices | open |
| BL-008 | Business logic | **major** | "Newest first" is not implemented anywhere — order is `ref` ascending (see UI-005) | open |
| BL-009 | Business logic | minor | The same state-delete button is safe or permanent depending on data the owner cannot see | open |
| BL-010 | Business logic | **major** | The add-car button always means "create a car"; a successful save does not change its meaning (see FN-009) | open |
| BL-011 | Business logic | polish | Reordering writes only editable rows; locked primaries can never be corrected from the office | open |

---

## Layer notes
- **UI** — surfaces, layout, states. `ui.md`
- **Business logic** — rules, validation, permissions. `business-logic.md`
- **Data** — persistence, constraints, cascade. `data.md`
- **Functionality** — wiring complete or not. `functionality.md`
- **UX** — feedback, copy, honesty, recovery. `ux.md`
- **System** — auth, failure paths, limits. `system.md`
- **Coverage** — what the code never wires. `coverage.md`

## Office pass — added findings

| ID | Layer | Sev | Finding | Status |
|---|---|---|---|---|
| UI-005 | UI | **major** | "Newest first" sorts nothing — both public and office inventory show the store's `ref`-ascending order (oldest first) under that label | open |
| UI-006 | UI | **major** | State reordering is drag-and-drop plus arrow keys only; neither works on a touch phone | open |
| UI-007 | UI | minor | The state trash button fires immediately — no confirmation, no undo for an unoccupied state | open |
| UI-008 | UI | minor | A draft's "the file named X, which is gone" warning stays after a new state is chosen | open |
| UX-008 | UX | major | The car form's **Cancel** clears the device draft and leaves without asking — typed work is discarded | open |
| UX-009 | UX | minor | An enquiry state pill changes the state on one tap — no confirmation, no undo | open |
| UX-010 | UX | polish | Settings' WhatsApp card says "the demonstration ships with a placeholder number" on a live office | open |
| UX-011 | UX | polish | The WhatsApp live preview keeps the last valid link while the field is invalid | open |
| FN-009 | Functionality | **major** | After a successful **new car** save the form does not reset or navigate; pressing Save again creates a second car with a new `TS-####` | open |
| DATA-001 | Data | **major** | `enquiry_pdf` is never written — the imported PDF is held but never linked to the enquiries it produced, and no path deletes it | open |
| DATA-002 | Data | **blocker** | No deletion path for an enquiry at all — customer PII cannot be removed, while the privacy notice promises deletion on request and at 12 months | open |
| DATA-003 | Data | **blocker** | `lib/cleanup.ts` is complete and **never called** — no surface for enquiries at their year, missing assets, or unreferenced uploads | open |
| DATA-004 | Data | major | RLS is enabled on every table with **no policy anywhere**; the app's role must own the tables, so RLS protects nothing | open |
| DATA-005 | Data | **major** | `office_user` has no single-row constraint; any Clerk user who reaches the office is inserted as an owner | open |
| DATA-006 | Data | minor | Device drafts keep costs and private notes in `localStorage`; cleared on sign-out, not on tab close | open |
| SYS-001 | System | **major** | The 10-attempt / 30-minute lockout is not implemented — `auth_attempt` is written by nothing and read only by dead cleanup code | open |
| SYS-002 | System | major | Owner identity is "any provider user" — no allow-list and no single-owner check (see DATA-005) | open |
| SYS-003 | System | minor | The public tap endpoint has no rate limit or in-memory counter, though the spec says flooding is answered outside the store | open |
| SYS-004 | System | major | Row-level security is enabled with no policies — no database-side boundary behind the app (see DATA-004) | open |
| SYS-005 | System | minor | Session expiry has no in-page signal; an open form learns it only when Save fails | open |
| SYS-006 | System | major | Nothing writes the backup/storage keys and no daily job exists in this repo — the System card cannot report a healthy deployment | open |
| COV-001 | Coverage | **blocker** | No enquiry deletion, no retention queue, no PDF link/deletion (merges DATA-001/002/003) | open |
| COV-002 | Coverage | **major** | No daily backup/storage/reconcile job in this repository — external dependency to verify (see SYS-006) | open |
| COV-003 | Coverage | major | No lockout implementation (see SYS-001) | open |
| COV-004 | Coverage | **blocker** | No surface for four of the five "waiting to be cleared" categories — only car tombstones are listed (see DATA-003) | open |
| COV-005 | Coverage | major | No single-owner enforcement (see DATA-005 / SYS-002) | open |
| COV-006 | Coverage | major | No RLS policies (see DATA-004 / SYS-004) | open |
