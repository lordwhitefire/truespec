# UX Implementation Plan (Refined)

> Derived from: product-management/ux-plan.md, product-management/business-logic-implementation-plan.md, product-management/functionality-implementation-plan.md
> Screens: test-truespec-v2/
> Applied changes: office rate dead; money labels follow car state; enquiry states are just states
> Scope (UX layer): dialog shapes, focus, toasts, undo timing, offline handling, failure wording

## Decision Record

- What was decided: Refine ux-plan.md into an actionable UX implementation plan that maps directly to the real screens, applying the three agreed changes. Keep scope to dialog shapes, focus, toasts, undo timing, offline handling, failure wording.
- Why: The UI is done, rules settled; this refines (not restarts) against real screens so behavior matches built UI while preserving intent.
- What it serves: Implementation clarity for the next build without changing business/functional scope except the explicit updates.
- What it must not be used for: Code structure, database schema, styling beyond tokens affecting behavior (focus ring/visibility), or inventing features outside scope.

## Mapping to Real Screens (test-truespec-v2)

| Screen | UX touchpoints | Notes from screens |
|---|---|---|
| truespec.html | Hero/gallery (section C), one main WhatsApp button per size (Q22), progressive rendering, back restores position | Public home - follows shared-link-first principle; respects reduced motion, failed hero handled by skipping to next (Q18). |
| car.html | VDP layout, gallery full-screen (tap open, Escape/close/outside close Q21), similar cars, one WhatsApp button + small header link, not-available page behavior | Single-car page at its own address; must work standalone (Q3-Q4). |
| inventory.html | Tabs (Available/On Order/Landed this year) - Sold not shown, grid progressive, filters, empty/no-match states | Tabs replace grid in-place, no scroll-to-top (Q8). |
| office-dashboard.html | Dashboard cards (counts/money/taps), "needs attention", per-card links to lists | Needs attention = incomplete costs only (Q51); numbers live on load, no polling timer (Q53). Focus-refresh preferred over manual Refresh. |
| office-inventory.html | List rows, state dropdown (two taps, no confirm unless destructive), per-row actions (⋯), edit/delete/sold | State changes reversible (Q73-74); delete/sold ask first. |
| office-car.html | Add/Edit form (Car details/Photos/Costs/Private notes), live money summary, photo upload with per-photo progress/retry, 6 fixed cost rows, validation on blur | Live landed/profit update while typing (Q64); costs fixed order (Q63). |
| office-enquiries.html | Kanban/columns by enquiry states (5 seeded: New, Talking, Negotiating, Sold, Lost), drag/drop by device, per-state counts | States are just states - no open/closed grouping; counts per state (change #3). |
| office-settings.html | Settings form. **Rate field removed** per change #1. | R3: no global rate; dollar rates live on cost lines. |
| office-activity.html | Activity log with time/who/what and old→new | History visible per car and globally (Q75). |
| login.html, office-login/create-account context | Auth screens, generic error, growing delay (no lockout), session expiry messaging | Wrong sign-in generic "Email or password is not right" (Q44, Q90). Session expiry says work saved (Q46). |

## Applying the Three Changes

### 1. Office rate is dead (R3)
- **Settings**: Remove rate field from office-settings.html UI. No global rate stored. Dollar costs carry their own rate on each cost line.
- **UX implications**: Error states must say "Rate needed" on a dollar line with amount but no rate (Q65, already specified). Validation inline on blur; no mention of global rate in help text or failure wording.
- **Failure wording**: No new global-rate errors; existing per-line wording unchanged.

### 2. Money labels follow car state
- **Label mapping (by car state):** 
  - On order / At port / Cleared → **Estimated total cost**. Profit shown as **projected** (until sold).
  - Landed → **Landed cost** only. Profit shown as **projected** (until sold).
  - Sold → **Total cost** (final). Profit shown as **real**.
- **Constraint**: No car on order shows "landed cost" (explicit). "Landed cost" appears only when landed.
- **UX implications**: Summary panel (office-car.html), dashboard cards, inventory row/tooltips must use state-aware labels. When state changes (Q76), the label changes and the page communicates the shift clearly (not silently as toast noise unless user action context warrants - but label change is state-driven; communicate via line if totals meaning changes).
- **Failure wording**: None specific; labels are dynamic, not error states.

### 3. Enquiry states are just states
- **No open/closed grouping**; no special meaning on "Sold" triggering closure. All states (New/Talking/Negotiating/Sold/Lost and any owner-added states) are equal. Counts are per state.
- **UX implications**: Badges and filters read per state only (Q77/Q78). Enquiry board behavior unchanged except semantics; no "open enquiries" total. "Needs attention" remains incomplete costs only (Q51).
- **Failure wording**: None specific.

## UX Layer Specifics (as requested)

### Dialog Shapes
- Use native `<dialog>` with `showModal()` for all blocking dialogs (Q88). Focus trap, Escape, and focus restoration are browser-provided.
- Exactly two confirmations (Q80): delete car, mark car sold. No other reversible-heavy actions ask. Removing a state in use is **not** a dialog - disabled button with plain text reason beside it: "3 cars use this state. Move them first." (no tooltip).
- Dialog buttons: destructive on right/bottom in full-width stack on mobile (destructive at bottom, safe choice on top), in row on laptop. **Focus defaults to Cancel** in both confirmations. Enter never triggers destructive action.
- Tapping outside closes **only** the full-screen photo viewer; never closes a confirmation dialog (prevents discarding unsaved work by accident).
- One blocking dialog at a time; second request ignored rather than stacked.

### Focus
- Tab order follows visual order (top→bottom, left→right). Focus always visible.
- Focused element never hidden behind sticky bars (Q88). Account for keyboard covering inputs on mobile (Q62) - scroll padding to keep focused input visible.
- Escape closes any dialog/drawer and returns focus to opener (Q88). Left/right arrows move gallery when focused (Q20).
- Gallery has keyboard support; Enter activates focused control and submits forms appropriately.

### Toasts
- Success toasts only when action deliberate and needs confirmation ("Car saved", "Car deleted. Undo", etc. per Q90). No toast for trivial auto-updates.
- **Undo window 8 seconds** for undoable actions: photo delete, cost line delete, photo reorder (Q67, Q81). Delete car asks first then offers **Restore for 8 seconds** (Q81).
- Max 3 toasts visible. Fourth pushes oldest out unless oldest carries an Undo - Undo toasts stay until their 8s ends (section 9 rule).
- Toasts are non-blocking; they never cover the primary action in a way that blocks flow.

### Undo Timing
- 8 seconds for all undo windows (Q67, Q81). Timer visible only where necessary; behavior is deterministic. After expiry, tombstone/undo opportunity disappears (retention rule lives in functionality; timing is UX).
- Not undoable: marking sold (correct via sale record edit), anything already sent in WhatsApp (Q81).

### Offline Handling
- **Showroom**: does not work offline. If network drops, show quiet line "You are offline. Reload to see the site." Existing content stays visible; actions needing network disabled with reason attached (Q36). No cached showroom, no outbox.
- **Office**: offline banner "Offline, your draft is kept on this device." Save disabled with reason attached (not silently greyed). Drafts autosave to local storage as user types; server save only on explicit Save (Q46, Q56, Q84). When back online: "You're back online. Your draft is still here — press Save." Nothing auto-queues/sends.
- `navigator.onLine` unreliable - banner must be conservative (slow to appear, quick to withdraw). Programmatic redirects (session expiry) bypass unsaved-changes guard (Q58).

### Failure Wording
- Use exact words from ux-plan.md Q90, with updates applied (three changes don't alter core wording except context). Key points:
  - Generic sign-in: "Email or password is not right." (Q44, Q90). After too many wrong attempts: "Too many wrong attempts. Wait a moment, then try again." (with growing delay, no lockout).
  - WhatsApp cannot open: line directly under button (not toast), says "We could not open WhatsApp. Call or text us on 0800 000 0000." with number visible and copyable (Q33, Q90).
  - Field errors inline under field with specific reason (e.g. "Enter the year as four digits."). Validation on blur (Q61-62).
  - Photo upload failed: "Upload failed." with Retry on that thumbnail; rest continue (Q69, Q90). Full-screen viewer: "Photo couldn't load" on graphite tile with Retry (Q90).
  - Save failed: "We could not save this car. Check your connection and try again." (Q82, Q90).
  - PDF import: unreadable → "We couldn't read any rows from this file. Check it's the enquiry PDF and try again." with "Choose another file"; empty → "This file has no rows." (Q90).
  - Session expired: "Your session expired. Sign in again — your work is saved." (Q46, Q90).
  - Stale edit: "This car was changed somewhere else. Reload to see the latest." (Q83, Q90).

## Refinements vs Original ux-plan.md (refine only; no restart)

| Area | Refinement | Rationale |
|---|---|---|
| Rate field | Removed from Settings (change #1). | Matches R3 and business-logic (per-line rates). No other global-rate UX. |
| Money labels | State-aware labels enforced everywhere (change #2). | Prevents "landed cost" on order cars; aligns with screens and logic. |
| Enquiry states | Counts per state only; no open/closed semantics (change #3). | Matches R1; removes any implied closure on Sold. |
| Screens alignment | Mapped UX behaviors to actual test-truespec-v2 pages (car/office-*) | Prevents spec drift from built UI. |
| Focus/stacking rules | Explicit one-blocking-dialog, toast ordering with Undo exception, outside-tap scope clarified | Codifies Q88/Q80 more precisely for implementation. |

No features added, no existing agreed behaviors removed except the three explicit changes above.

## Build Requirements (UX layer)

1. Native `<dialog>` for confirmations and any blocking modals (Q88). Focus management via browser APIs.
2. Toast component with 8s undo window, max 3 visible, push-out rule with Undo exception.
3. Dirty-state guard separate from `beforeunload`, with bypass for programmatic redirects (Q58). Normalized comparison (ignore trailing spaces) to avoid false positives.
4. Offline banners (showroom + office) with conservative timing; Save disabled with explicit reason when offline.
5. Scroll-padding for inputs to avoid keyboard obscuring focused field (Q62).
6. Progressive rendering placeholders: card-shaped blocks (exact shape) before data loads; no spinners (Q34). Blur-first images then sharp (Q37).
7. Per-photo upload UI: progress bars per thumbnail, independent Retry, "Upload failed" on failed thumbnail (Q69).

## Acceptance

- Every planned element tagged per UI axes and journeys per UX rule are satisfied by refined behavior.
- Changes #1-#3 are correctly applied across screens with state-aware labels and per-state enquiry counts.
- Dialogs: exactly two confirmations, focus on Cancel, Escape works, outside-tap only on photo viewer.
- Toasts: 8s undo, max 3 with Undo exception. 
- Offline: showroom no-queue rule, office keeps draft labeled as device-stored.
- Failure wording matches Q90 with all cases covered; sign-in never locks out (growing delay).
- Nothing copied from examples without project derivation; refine-only against real screens.
