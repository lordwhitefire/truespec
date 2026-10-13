# Rules — counting (`R-CNT`)

The one counting rule. A **JS rule** set. What "how many cars" means, decided once, so that
the showroom, the home page and the office can never disagree.

Source: `specs/dashboard/spec.md` §"One counting rule, applied at every read point";
`specs/showroom/spec.md` §"Showroom counts follow one counting rule", §"Sold and deleted cars
leave the showroom"; `specs/inventory/spec.md` §"Sold is a flag, not a state".

---

### R-CNT-1 — Available = the available group + landed-this-year, counted once   [JS rule]

- **Rule:** `Available` = the cars in the Available section **plus** the cars in the Landed
  section landed this year; each car is counted exactly once even if it is presented twice,
  and the count carries an "of which N new arrivals" note where N is the number of those cars
  flagged as a new arrival.
- **Kind:** JS rule.
- **Source:** `specs/dashboard` §"One counting rule…"; `specs/showroom` §"Showroom counts
  follow one counting rule" ("Available = Available group + Landed-this-year group").
- **Obeys when:** a new-arrival car rendered under both Landed and Available raises Available
  by exactly one, and the note reports it.
- **Forces:** the one counting implementation in `lib/counts.ts`; `lib/overview.ts` and every
  count read point call it.
- **Check:** `counts.test.ts` — a doubly-presented new-arrival car is counted once; the
  Available figure is the available group + landed-this-year. Search: no second Available count.

---

### R-CNT-2 — On Order = the on-order group   [JS rule]

- **Rule:** `On Order` = the cars whose section is On Order.
- **Kind:** JS rule.
- **Source:** `specs/dashboard` §"One counting rule…" ("On Order = on-order-group cars").
- **Obeys when:** the office dashboard's On Order equals the number of cars in the On Order
  section.
- **Forces:** `lib/counts.ts` — the same implementation as `R-CNT-1`.
- **Check:** `counts.test.ts` — On Order counts exactly the On Order section. Search: no second
  On Order count.

---

### R-CNT-3 — Sold sits outside the stock total   [JS rule]

- **Rule:** Sold cars are counted separately, outside the stock total; a sold car leaves the
  stock counts and appears under Sold/Archive while remaining in lifetime totals.
- **Kind:** JS rule.
- **Source:** `specs/dashboard` §"One counting rule…" ("Sold counted separately outside the
  stock total"); `specs/inventory` §"Sold is a flag, not a state".
- **Obeys when:** marking a car sold lowers Available/On Order by one and raises the Sold count
  by one; the stock total is unaffected by the sold count.
- **Forces:** `lib/counts.ts` — sold is its own count, never folded into a section count.
- **Check:** `counts.test.ts` — a sold car is excluded from stock and included in the sold
  count. Live: a sold car leaves the stock total (Task 21 probe).

---

### R-CNT-4 — Sold and deleted cars are excluded from public counts and links   [JS rule]

- **Rule:** A car marked sold, or deleted, is excluded from all showroom pages and counts; an
  old shared link to it returns a graceful not-available outcome, never an error or stale data.
- **Kind:** JS rule.
- **Source:** `specs/showroom` §"Sold and deleted cars leave the showroom".
- **Obeys when:** a sold or tombstoned car contributes to no public count, and its old link
  resolves to a not-available outcome.
- **Forces:** the public read path (`lib/public-cars.ts`) filters sold/deleted before counting;
  the same counting rule (`lib/counts.ts`) receives only live cars.
- **Check:** `counts.test.ts` — sold/deleted cars are excluded from public counts. Live: the
  sold-car shared link is graceful (Task 21 probe).
- **Note (named for other layers):** the *mechanism* that hides a deleted car (the 8-second
  undo window and the soft-delete tombstone) is a write path — TASK-004; the tombstone's shape
  is a stored shape — TASK-003. This rule states only the read-side exclusion.

---

### R-CNT-5 — One rule at every read point   [JS rule]

- **Rule:** The showroom, the home page, the inventory page, the layout ticker and the office
  dashboard all derive their counts from this one rule; no read point computes its own count.
- **Kind:** JS rule.
- **Source:** `specs/dashboard` §"One counting rule…"; `specs/showroom` §"Showroom counts
  follow one counting rule"; task 10 (owner, 2026-10-12).
- **Obeys when:** at one moment, Available on the home page, the inventory page and the office
  dashboard are equal wherever they read the same data, and each shows the new-arrival note.
- **Forces:** every count read point calls `lib/counts.ts` (directly, or through
  `lib/overview.ts`); no local count arithmetic remains.
- **Check:** search for a second implementation of Available / On Order / sold — there must be
  none (testing.md §1.1). Live: the three numbers are equal at one moment (Task 21 probe).
- **Note (owner ruling 2026-10-12):** "one rule, invoked by all read points" — not literal
  cross-table equality. Where the office reads its own table, a difference is a *data*
  difference, named in the conflict log and TASK-003's to settle, never a second rule.
