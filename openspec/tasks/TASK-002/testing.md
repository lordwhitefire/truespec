# TASK-002 — testing task

**Handed to a separate session that did not do the work.** Check that each business rule exists once and that every screen reads it. Every check is observable: you either see the expected outcome or you do not. Pass = each rule exists as the only implementation and behaves as this file says. Fail = name what you did, what you saw, and what was expected.

Do not fix anything. Report.

---

## What this checks

The rules of layer 2 — section mapping, counting, money, cost-line validity, reference codes, the sold flag — and the negative check that decides the rest: **no screen invents its own answer.**

## Before you start

- Ask the Builder how to run the app, how to sign in to the office, and how to inspect stored data.
- Read the requirements in `openspec/changes/truespec-architecture/specs/`: `inventory`, `dashboard`, `money`, `showroom`; and the layer plan `product-management/business-logic-implementation-plan.md`.

---

## 1. The rules exist exactly once (do this first — it decides the rest)

**1.1 Counting**
- Do: search the codebase for anything that computes Available / On Order / sold.
- Pass: exactly one implementation, and the showroom, the home page and the office all call it.
- Fail: a second one — e.g. hardcoded state lists in the office read layer.

**1.2 Money**
- Do: search for anything that computes total cost or profit.
- Pass: exactly one function; every screen that shows a money figure calls it.
- Fail: any screen with its own arithmetic, or any use of an exchange rate anywhere.

**1.3 Section mapping**
- Do: search for state→section.
- Pass: one mapping, and it is the only thing a public path reads for section.
- Fail: a hardcoded state→section list outside it.

**1.4 No rate at all**
- Do: search for an exchange rate of any kind.
- Pass: none exists — no settings rate key, no constant in the car form, no rate field or column anywhere.
- Fail: any rate field, key, constant, or column.

---

## 2. Section mapping

**2.1 A custom state reaches the right section, and buyers never see its name**
- Do: add a state "Held for payment" mapped to Available; put a car in it; open the showroom, and fetch the car's page source and any JSON payload.
- Pass: the car is under Available, and the words "Held for payment" appear nowhere public.
- Fail: the label appears, or the car is missing or misplaced.

**2.2 A state must map somewhere**
- Do: try to save a state with no section, or with two.
- Pass: it cannot be saved.
- Fail: a stateless (or doubly-mapped) state exists.

**2.3 The three sections cannot be changed**
- Do: add, rename and delete states in the office; open the showroom.
- Pass: the showroom still shows exactly Available, On Order, Landed.

---

## 3. Counting

**3.1 The same number everywhere**
- Do: read Available on the home page, the inventory page and the office dashboard at one moment.
- Pass: all three are equal.
- Fail: any two differ.

**3.2 Landed-this-year counted once**
- Do: open a car flagged as a new arrival.
- Pass: it shows under Landed and under Available, and Available counts it once with an "of which N new arrivals" note.

**3.3 Sold sits outside stock**
- Do: mark a car sold.
- Pass: it leaves the stock total and appears under Sold/Archive.

---

## 4. Money

**4.1 The figure is named by the car's state**
- Do: open a car that is on order with all six costs entered.
- Pass: it reads "Estimated total cost", never "Landed cost".
- Do: open a landed car.
- Pass: it reads "Landed cost".

**4.2 Projected and real**
- Pass: unsold cars show projected profit; sold cars show real profit.

**4.3 A loss is shown as it is**
- Do: open a car whose price is below its total cost.
- Pass: a negative figure, with no warning, clamp, or suppression.

**4.4 Zero is not missing**
- Do: enter 0 in one cost field, then clear it.
- Pass: 0 counts as entered (the car stays cost-complete); clearing it makes the car incomplete again.

**4.5 Incomplete costs are explained, never hidden**
- Do: with three cars missing costs, read the dashboard.
- Pass: money tied up still includes those cars; the profit total names how many cars it counted and carries a "still building" line naming the rest.

**4.6 The six costs add up**
- Do: open a car with all six costs entered.
- Pass: the total is exactly the sum of the amounts entered — nothing converted, nothing re-derived per screen.

---

## 5. Cost-line validity

**5.1 A bad amount cannot save**
- Do: type something that is not a number into a cost field and save.
- Pass: the save is blocked, and the error appears at that field, visible before submitting.
- Fail: it saves, or the error appears only after.

**5.2 A change recomputes everywhere**
- Do: change a cost on an already-landed car; look at the form, the inventory list and the dashboard.
- Pass: total cost and profit change on every screen, consistently.

---

## 6. Reference codes

**6.1 Assigned once** — create a car; it receives the next `TS-####`.
**6.2 Never edited** — edit the car's name and costs; the code is unchanged, and it cannot be typed by hand.
**6.3 Never reused** — delete a car; create another; the deleted car's code is never given out again.
**6.4 The join key** — a tap, an enquiry, and an activity row each join to a car by its code.

---

## 7. Sold

**7.1 Mark sold** — mark a car sold with a price; it vanishes from the showroom, appears in Sold/Archive, and real profit includes it.
**7.2 Un-mark reverses cleanly** — reverse it; the car returns to its section and to projected profit, with no stale real-profit figure left behind.

---

## 8. The public boundary

**8.1 Nothing internal in public**
- Do: walk every public route and inspect the HTML and any network payload.
- Pass: no cost, total, profit, or state label anywhere.

**8.2 Sold and deleted links**
- Do: open a shared link to a car that has since been sold or deleted.
- Pass: a graceful outcome — no stale data, no leak, no crash.

---

## How to report

1. **Verdict:** PASS or FAIL.
2. **Per check:** what you did, what you saw, and what was expected — enough for someone who did not watch you to reproduce it.
3. **Every second implementation found:** the file and line, and where its answer differed from the shared rule.
4. **The conflict log** the work left behind: each screen-vs-requirement disagreement and which side won.
