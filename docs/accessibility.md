# Accessibility release check

Target: **WCAG 2.2 AA** for the public showroom (home, inventory, car page, privacy, terms) and the
public-facing office sign-in door.

## Method

This check is not only an automated scan. Each page is verified with:

1. **Keyboard pass** — every control reachable and operable by Tab/Shift+Tab/Enter/Space/Escape,
   visible focus indicator, no focus trap outside a dialog, focus returns to the trigger after a
   dialog closes, background does not scroll while a dialog is open.
2. **Automated scan** — text contrast and meaningful control names (filters, counts, forms,
   dialogs, icon buttons); no unnamed control; no contrast failure that changes meaning.
3. **Screen-reader pass** — performed in the separate testing session with a real screen reader;
   recorded here as NOT RUN until that session completes.

## Pages tested

| Page                               | WCAG 2.2 AA target | Keyboard pass | Screen-reader pass         |
| ---------------------------------- | ------------------ | ------------- | -------------------------- |
| Home (`/`)                         | AA                 | Pass          | NOT RUN — separate session |
| Inventory (`/inventory`)           | AA                 | Pass          | NOT RUN — separate session |
| Car page (`/car/[ref]`)            | AA                 | Pass          | NOT RUN — separate session |
| Privacy (`/privacy`)               | AA                 | Pass          | NOT RUN — separate session |
| Terms (`/terms`)                   | AA                 | Pass          | NOT RUN — separate session |
| Office sign-in (`/office/sign-in`) | AA                 | Pass          | NOT RUN — separate session |

## Heading order (no skipped levels)

Every public page has exactly one page-level `<h1>`; section headings use `<h2>` or deeper with no
skipped level. Verified at 390 / 560 / 1440 px widths on home, inventory, car, privacy and terms.

## Colour is not the only cue

Car state (live/sold/on order/landed), form errors and success messages remain readable in
grayscale or colour-blind simulation — meaning comes from text or an icon, not colour alone.

## Focus

Visible focus indicator on every reachable control. Modal/dialog focus moves inside, Escape and
Cancel close, focus returns to the trigger, and the background does not scroll while a dialog is
open.

## Live regions

The public inventory live region announces the result count only (debounced 400 ms); non-colour
state cues accompany colour state. Office inventory uses `aria-pressed`, focus recovery and
`aria-current` on the active filter.

## Record

- Target: WCAG 2.2 AA
- Pages tested: home, inventory, car, privacy, terms, office sign-in
- Keyboard pass: Pass (runtime checklist C4/C5/C6 checked at 390/560/1440 px)
- Automated scan: Pass — no unnamed control, no meaning-changing contrast failure
- Screen-reader pass: NOT RUN — requires the separate testing session with a real screen reader;
  this checklist does not claim it

## How to re-verify

Open each page at 390 / 560 / 1440 px widths, tab through all controls, confirm visible focus and
heading order, then view in grayscale/colour-blind simulation. The screen-reader pass is recorded
above as NOT RUN pending the separate testing session.
