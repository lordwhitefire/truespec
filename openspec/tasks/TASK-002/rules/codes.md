# Rules — reference codes (`R-REF`)

What a car is called. A **JS rule** set. The code is the car's durable identity — it outlives
the row and is the join key for everything that points at a car.

Source: `specs/inventory/spec.md` §"Durable reference codes".

---

### R-REF-1 — A car's code is a `TS-` sequence number   [JS rule]

- **Rule:** Every car has exactly one reference code of the form `TS-` followed by a
  zero-padded sequence number.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Durable reference codes" ("`TS-####` reference code").
- **Obeys when:** every car's code matches the form; a non-matching string is rejected by the
  validity predicate.
- **Forces:** `formatRef(seq)` + `isValidRef(ref)` in `lib/refs.ts`; the stored default
  (`car.ref` from `ts_ref_seq`) already produces this shape.
- **Check:** `refs.test.ts` — `formatRef` pads to `TS-####`; `isValidRef` accepts valid, rejects
  malformed.

---

### R-REF-2 — Assigned once on creation, never edited, never chosen by hand   [JS rule]

- **Rule:** The code is assigned once when the car is created, from the sequence; it is never
  edited afterwards and never typed by hand.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Durable reference codes" ("never edited, never manually
  chosen"); scenario §"Code assignment" ("receives the next code in sequence exactly once, and
  that code survives every edit").
- **Obeys when:** creating a car assigns the next code; editing the car's details and costs
  leaves the code unchanged; no read path accepts a hand-entered code.
- **Forces:** `lib/refs.ts` states the invariant; the assignment itself is wired by the write
  path (TASK-004) against `ts_ref_seq`. This layer must **not** override or reassign a code.
- **Check:** `refs.test.ts` — the module exposes no "set" of a code. Live (TASK-004 later): a
  created car receives the next code and keeps it through an edit.

---

### R-REF-3 — A code is never reused after deletion   [JS rule]

- **Rule:** Deleting a car never frees its code: a later car never receives a deleted car's
  code.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Durable reference codes" ("never reused after deletion");
  scenario §"Deletion does not recycle codes".
- **Obeys when:** a car with `TS-0042` is deleted and a new car is created, the new car does not
  get `TS-0042`.
- **Forces:** the sequence is monotonic and deletion is soft (`deleted_at`) — the stored shape
  already supports it; this layer must not free or reuse a code, and names any gap for TASK-003.
- **Check:** `refs.test.ts` — the sequence advances; nothing in the module returns a used code.
  Live (TASK-004 later): a deleted car's code is not handed out again.

---

### R-REF-4 — The code is the join key   [JS rule]

- **Rule:** Enquiries, taps and activity rows join to a car by its reference code, so the code
  outlives the car row.
- **Kind:** JS rule.
- **Source:** `specs/inventory` §"Durable reference codes" ("enquiries, taps, and activity rows
  join to the car by this reference"); `testing.md` §6.4.
- **Obeys when:** a tap, an enquiry and an activity row each carry the car's code and resolve to
  that car.
- **Forces:** `lib/refs.ts` is the only definition of the code's shape; the public path and any
  join use it, never a row id.
- **Check:** search — joins use the ref, not an internal id, on the public path. Live
  (TASK-004 later): tap/enquiry/activity each join by code.
