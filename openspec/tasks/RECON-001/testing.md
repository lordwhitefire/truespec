# RECON-001 — testing task

**Handed to a separate session that did not do the work.** Check the UI against the approved design and this file. Every check is observable: you either see the expected outcome or you do not. Pass = every screen exists and every approved element is present and matching. Fail = name the screen or element, what you did, and what you saw instead.

Do not fix anything. Report.

---

## What this checks

**All the UI** — every screen, every approved element, all three widths, both modes.

## Before you start

- Open the reference screens `test-truespec-v2` (read-only) and `product-management/ui-plan.md`.
- Ask the Builder how to run the app locally.

---

## 1. Coverage

**1.1 Every screen accounted for**
- Do: read the coverage list the work left behind.
- Pass: it names every screen in the approved design — public showroom, office, and the extras — none missing from the list.
- Fail: a screen from the approved design is unlisted.

**1.2 Every listed screen opens**
- Do: open each screen in the list.
- Pass: it opens without error.
- Fail: a screen errors, 404s, or is a blank shell.

---

## 2. Screen-by-screen against the approved design

**2.1 Public showroom** — home, inventory, car page match the reference and `ui-plan.md` (sections, controls, wording).

**2.2 Office** — login / first-run, dashboard, inventory, car form, state editor, enquiries, activity, settings match the reference / `ui-plan.md`.

**2.3 Extras** — privacy, 404, sold/deleted page present.

---

## 3. The known-at-risk elements

**3.1 Inventory search, filters and sorting** (Q41)
- Do: open the buyer Inventory.
- Pass: search, filters (status, make, year, price, colour) and sorting are present and work.
- Fail: any of them is missing.

**3.2 Grid / list toggle**
- Do: open the buyer Inventory.
- Pass: the grid/list switch is present and switches the view.

**3.3 Special ribbon + crossed-out discount price** (Q37)
- Do: open a car that has a discount set, then one that does not.
- Pass: the discounted car shows the gold ribbon and the crossed-out figure; the other shows neither.

**3.4 Theme toggle, dark default** (Q7)
- Do: open any screen; switch the theme; navigate; reload.
- Pass: the toggle is present, dark is the default, the visitor's choice persists, and the device setting is not consulted.

**3.5 WhatsApp button per screen size** (Q40)
- Do: open a car page at phone, tablet and laptop.
- Pass: one main button per screen size (sticky bar on phone/tablet, sidebar on laptop); the header carries a small text link only.

**3.6 Empty states, sold/deleted page, privacy, login / first-run**
- Pass: the empty state (Q42), the sold/deleted page (Q43), the privacy link (Q44), and the office login / first-run card (Q45–46) are present as approved.

---

## 4. Widths and modes

**4.1 Three widths**
- Do: open each screen on phone, tablet and laptop.
- Pass: behaviour matches `ui-plan.md` Q77/Q79; content identical, presentation per width.
- Fail: content or rules differ between widths.

**4.2 Both modes**
- Do: open every screen in dark and in light.
- Pass: both render with no contrast failure; dark is the default.

**4.3 Seen on a real phone and a real laptop**
- Do: check both modes on real devices.
- Pass: every screen seen in both modes on a real phone and a real laptop — not judged from colour values alone (ui-plan line 77).

---

## How to report

1. **Verdict:** PASS or FAIL.
2. **Screen-by-screen table:** each screen → done / missing / does not match, one line each.
3. **Failures:** what you did, what happened, what was expected — enough for someone who did not watch you to reproduce it.
4. **Evidence:** screenshots at the three widths and in both modes.
