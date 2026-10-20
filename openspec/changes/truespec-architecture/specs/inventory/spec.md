## Purpose

Everything the office does with car records: creating and editing them — by hand, or from an uploaded file that lands as drafts the owner saves one by one — tracking where each car is through owner-defined states mapped to the fixed showroom sections, marking sales without losing history, and deleting safely.

## ADDED Requirements

### Requirement: One form for adding and editing a car
The system SHALL provide a single car form used for both adding and changing a car, with sections for details, photos, costs, current state, and private notes, and a live profit figure that updates while the owner types. On phone the form is a full page, on tablet a drawer, on laptop inline — the fields are the same on all three.

#### Scenario: Owner adds a car
- **WHEN** the owner fills the form, picks a state, and saves
- **THEN** the car appears in the office list immediately and, if it meets the listing gate, in the showroom immediately

#### Scenario: Profit visible while typing
- **WHEN** the owner changes the price or a cost value in the form
- **THEN** the profit figure beside the form updates as they type, labelled "estimated" until the car has landed

### Requirement: Car states come in two kinds — four fixed primary states and the owner's own secondary states
A car's states SHALL come in two kinds (owner ruling 2026-10-14; design D15). A **primary state** SHALL be one of exactly four, fixed and final: **Available, On Order, Landed, Sold** — not addable, renamable or deletable by anyone. **Every car SHALL sit under exactly one primary state**; a car without one is not a valid car. A **secondary state** SHALL be any state that is not one of those four: the owner creates it, names it, orders it and colours it, and a car MAY carry **none or several**. A secondary state carries **no section mapping and no new-arrival flag** — those belong to the primary states, which are fixed — and a car may never carry a secondary state without a primary one. Deletion of a state any car carries SHALL be blocked. The seeded states SHALL be the four primary states above, plus the owner's secondary set.

#### Scenario: Owner adds a custom (secondary) state
- **WHEN** the owner creates a state named "Held for payment"
- **THEN** it is available for every car thereafter as a **secondary** state, and the showroom shows nothing of it — the car still appears under whichever of Available, On Order or Landed its primary state is

#### Scenario: A state is deleted while cars occupy it
- **WHEN** the owner tries to delete a state that any car currently carries
- **THEN** the deletion is blocked with an explanation, and no car is orphaned

#### Scenario: A primary state cannot be touched
- **WHEN** any screen or request attempts to add to, rename or delete one of the four primary states
- **THEN** it is refused, and nothing changes

### Requirement: Sold is a primary state, and setting it performs the sale
**Sold SHALL be one of the four primary states** (owner ruling 2026-10-14; design D15, revising D6): the state comes first and the sale action follows from it. Setting a car to Sold SHALL record the sale — a sale price and a date — leave the car out of the showroom entirely, place it in Sold/Archive, keep it in lifetime totals and out of stock counts, and move profit from projected to real. The **money facts SHALL live on the sale row**, never on the state and never on the car. Un-marking SHALL reverse or void the sale record, return the car to its **previous primary state**, and **leave the car's secondary states untouched** (owner ruling 2026-10-14).

#### Scenario: Mark sold
- **WHEN** the owner marks a car sold with a sale price
- **THEN** its primary state becomes Sold, the car vanishes from the showroom, appears in Sold/Archive, real profit is recorded, and it is excluded from stock counts while remaining in lifetime totals

#### Scenario: Un-mark sold
- **WHEN** the owner reverses a sold marking
- **THEN** the sale record is reversed or voided, the car returns to its previous primary state with its secondary states intact, and profit totals return to projected figures with no stale real-profit residue

### Requirement: Private labels never reach buyers
The owner's secondary state labels, notes, and internal labels SHALL appear only in the office. Buyers SHALL see only the three primary-state names — **Available, On Order and Landed** — and never one of the owner's own.

#### Scenario: Buyer views a car in a custom state
- **WHEN** a car carries the owner's secondary state "Held for payment"
- **THEN** the showroom shows it under whichever primary state it sits in, with no trace of the label "Held for payment"

### Requirement: Delete with confirmation and undo
Deleting a car SHALL require confirmation, be undoable within an 8-second window, and only after the window close as a soft-delete tombstone. The tombstone is permanent until **the owner** removes it: no job, rule or clock ever hard-deletes it (owner ruling 2026-10-13 — the system warns, the client deletes). When the owner does remove it for good, its photos, costs and sale rows go with it and its stored images are cleared, with no orphan left behind. One accidental delete must never be final — and no delete is ever completed by the system.

#### Scenario: Owner deletes by mistake
- **WHEN** the owner deletes a car and hits Undo within 8 seconds
- **THEN** the car is restored byte-for-byte with its photos, costs, and state intact

#### Scenario: Undo window passes
- **WHEN** no undo happens within 8 seconds
- **THEN** the tombstone is hidden from all reads and stays listed as waiting to be cleared, and the owner removes it for good whenever he chooses — never the system, and not on any clock

### Requirement: A car can be created from an uploaded file, and it lands as a draft
The office SHALL accept a car file prepared from the fixed template and read each car it holds into a **draft** — one draft per car, in a holding place of its own and never a car row. The file SHALL carry the car's **editable fields and nothing else** — its fourteen details, the state among them — and nothing beyond them SHALL be read, inferred or filled in. A batch SHALL produce its drafts together, and each SHALL be saved on its own. Because a template carries values and not pictures, the owner SHALL add each draft's images by hand before saving it. A draft SHALL carry no `TS-####` and no change-check, and SHALL sit in no state and occupy none — so a waiting draft never blocks a state's deletion; it MAY hold the state its file named, which is applied when it is saved, and if that state no longer exists the save asks the owner to choose. A draft SHALL appear in no count, no section list and no public page; and **its code and its change-check SHALL be given at the moment it is saved, never when it is uploaded** — so a draft that is never saved consumes no reference code and disturbs no sequence. The car's own rules (a state, a well-formed amount, a required field) are enforced at that save, not at upload.

#### Scenario: A batch arrives as drafts
- **WHEN** the owner uploads one car file holding ten cars
- **THEN** ten drafts exist, no car exists, the next `TS-####` is untouched, and the showroom is unchanged

#### Scenario: A draft is saved
- **WHEN** the owner adds the draft's photos by hand and saves it
- **THEN** one car exists, carrying the next `TS-####`, its change-check, and its photos — and the other nine drafts are untouched

#### Scenario: A draft is never saved
- **WHEN** a draft is abandoned
- **THEN** no car exists, no reference code has been consumed, and the draft waits for the owner — nothing removes it for him

### Requirement: Durable reference codes
Every car SHALL receive a `TS-####` reference code on creation that is never edited, never manually chosen, and never reused after deletion; taps and activity rows join to the car by this reference. An enquiry joins to no car at all — it records the car the customer asked about in the customer's own words, which need not be a car the inventory holds (specs/enquiries).

#### Scenario: Code assignment
- **WHEN** a car is created
- **THEN** it receives the next code in sequence exactly once, and that code survives every edit

#### Scenario: Deletion does not recycle codes
- **WHEN** a car with code TS-0042 is deleted and a new car is later created
- **THEN** the new car never receives TS-0042
