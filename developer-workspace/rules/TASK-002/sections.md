# Rules — sections (`R-SEC`)

The three fixed sections and how a car reaches one. A **JS rule** set: this layer's logic,
nothing rendered — it decides which section a car is in and what a buyer is allowed to see.

Source: `specs/showroom/spec.md` §"Three fixed sections"; `specs/inventory/spec.md`
§"Owner-defined car states mapped to fixed sections", §"Private labels never reach buyers".

---

### R-SEC-1 — The section set is exactly three, and it is fixed   [JS rule]

- **Rule:** The sections are exactly `Available`, `On Order`, `Landed`. No owner action —
  adding, renaming or deleting a car state — can add, rename or remove a section.
- **Kind:** JS rule. Nothing is rendered by this layer; the section set is a value the code
  holds once.
- **Source:** `specs/showroom` §"Three fixed sections" ("exactly three sections … which the
  owner can never rename, add, or remove"); `specs/inventory` §"Owner-defined car states…".
- **Obeys when:** however many states the owner configures, the section list is still exactly
  those three, with those three labels.
- **Forces:** the single canonical section type and label set in `lib/sections.ts`; every
  section label anywhere in the product (public and office) reads from it.
- **Check:** `sections.test.ts` — the section list is exactly three and is not derived from
  any state list. Search: no second literal list `["Available","On Order","Landed"]`.

---

### R-SEC-2 — Every state maps to exactly one section   [JS rule]

- **Rule:** A car state is resolved to exactly one of the three sections. A state that maps
  to no section, or can be read as two, cannot exist — resolution raises rather than guessing.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Owner-defined car states mapped to fixed sections"
  ("each state MUST map to exactly one of the three fixed sections"; "no state may exist that
  maps to no section or to two sections").
- **Obeys when:** for any state, `sectionOfState` returns exactly one section; a state with
  none or two is rejected by the same function that resolves it.
- **Forces:** `lib/sections.ts` — the one `sectionOfState`/`isSection`; `lib/office.ts`'s
  adapter and every read point call it, none carries its own state→section list.
- **Check:** `sections.test.ts` — `sectionOfState` returns one section for each seeded state;
  a `null`/two-valued mapping raises. Search: no hardcoded state→section list outside
  `lib/sections.ts`.

---

### R-SEC-3 — Landed is presented inside Available   [JS rule]

- **Rule:** Landed is not a fourth, separate place: a car in the Landed section is also
  presented under Available, because a landed car is still buyable.
- **Kind:** JS rule (decides what the showroom presents; the rendering itself is not this layer).
- **Source:** `specs/showroom` §"Three fixed sections" ("Landed SHALL appear inside Available
  (a landed car is still buyable)").
- **Obeys when:** a car whose section is Landed appears in the Available presentation.
- **Forces:** the section-inclusion relation in `lib/sections.ts`; the section-composition used
  by `lib/overview.ts` and the office adapter.
- **Check:** `sections.test.ts` — the Landed section is included in Available. Live: a landed
  car is visible under Available (Task 21 probe).

---

### R-SEC-4 — A new-arrival car appears in both, and by section only   [JS rule]

- **Rule:** A car flagged as a new arrival appears under both Landed and Available; its
  appearance is decided by its section and flag, never by its owner state label.
- **Kind:** JS rule.
- **Source:** `specs/showroom` §"Three fixed sections" ("a car marked as a new arrival SHALL
  appear under both Landed and Available"); `specs/inventory` §"Private labels never reach
  buyers".
- **Obeys when:** a new-arrival car is presented in both sections; no buyer-facing name is the
  owner's state label.
- **Forces:** the new-arrival flag read in the one section module; the public path uses the
  section, not the state label. Counting of a doubly-presented car is `R-CNT`.
- **Check:** `sections.test.ts` — a new-arrival car resolves into both Landed and Available
  for presentation. Search: no owner state label in any public payload.

---

### R-SEC-5 — Section names are the only names a buyer sees   [JS rule]

- **Rule:** A buyer-facing response carries only a section name (`Available` / `On Order` /
  `Landed`) for placement. An owner's state label never appears in any public response.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Private labels never reach buyers"; `specs/showroom`
  §"Three fixed sections".
- **Obeys when:** a car in the owner's state "Held for payment" (mapped to Available) is shown
  under Available, and the words "Held for payment" appear nowhere public.
- **Forces:** the public allow-list in `lib/serialize.ts` (already exists) — it permits the
  section, never the state label.
- **Check:** search the public path/payload for any state label; `serialize.ts` sources section
  from the one module. Live: the buyer payload holds no state label (Task 21 probe).
