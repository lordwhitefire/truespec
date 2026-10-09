## Purpose

Everything the office does with car records: creating and editing them, tracking where each car is through owner-defined states mapped to the fixed showroom sections, marking sales without losing history, and deleting safely.

## ADDED Requirements

### Requirement: One form for adding and editing a car
The system SHALL provide a single car form used for both adding and changing a car, with sections for details, photos, costs, current state, and private notes, and a live profit figure that updates while the owner types. On phone the form is a full page, on tablet a drawer, on laptop inline — the fields are the same on all three.

#### Scenario: Owner adds a car
- **WHEN** the owner fills the form, picks a state, and saves
- **THEN** the car appears in the office list immediately and, if it meets the listing gate, in the showroom immediately

#### Scenario: Profit visible while typing
- **WHEN** the owner changes the price or a cost value in the form
- **THEN** the profit figure beside the form updates as they type, labelled "estimated" until the car has landed

### Requirement: Owner-defined car states mapped to fixed sections
Car states SHALL be an editable registry: the owner can add, rename, and reorder states (e.g. "held for payment"), each state MUST map to exactly one of the three fixed sections (Available, On Order, Landed), and each carries an owner-chosen colour plus an optional new-arrival flag. The five seeded states — Available, On the way, At port, Cleared, Landed (plus Sold handling) — ship as built-ins.

#### Scenario: Owner adds a custom state
- **WHEN** the owner creates a state named "Held for payment" mapped to the Available section
- **THEN** the state is available for every car thereafter, and cars in it appear in the Available section of the showroom

#### Scenario: A state is deleted while cars occupy it
- **WHEN** the owner tries to delete a state that any car currently sits in
- **THEN** the deletion is blocked with an explanation, and no car is orphaned

#### Scenario: Every state maps somewhere
- **WHEN** a state is created or edited
- **THEN** a section mapping is required — no state may exist that maps to no section or to two sections

### Requirement: Sold is a flag, not a state
"Mark as sold" SHALL be a separate action that sets a sold flag with sale price and date — never a state choice. A sold car leaves the showroom entirely, stays in the sold list, and still counts in office totals. Un-marking sold SHALL reverse or void the sale record so projected and real profit stay correct.

#### Scenario: Mark sold
- **WHEN** the owner marks a car sold with a sale price
- **THEN** the car vanishes from the showroom, appears in Sold/Archive, real profit is recorded, and it is excluded from stock counts while remaining in lifetime totals

#### Scenario: Un-mark sold
- **WHEN** the owner reverses a sold marking
- **THEN** the sale record is reversed or voided, the car returns to its section, and profit totals return to projected figures with no stale real-profit residue

### Requirement: Private labels never reach buyers
The owner's state labels, notes, and internal labels SHALL appear only in the office. Buyers SHALL see only the three section names, never the owner's custom state names.

#### Scenario: Buyer views a car in a custom state
- **WHEN** a car sits in the owner's state "Held for payment" (mapped to Available)
- **THEN** the showroom shows it under Available with no trace of the label "Held for payment"

### Requirement: Delete with confirmation and undo
Deleting a car SHALL require confirmation, be undoable within an 8-second window, and only after the window close as a soft-delete tombstone that a scheduled job hard-deletes (cascading photos, costs, and sale rows, and removing stored images). One accidental delete must never be final.

#### Scenario: Owner deletes by mistake
- **WHEN** the owner deletes a car and hits Undo within 8 seconds
- **THEN** the car is restored byte-for-byte with its photos, costs, and state intact

#### Scenario: Undo window passes
- **WHEN** no undo happens within 8 seconds
- **THEN** the tombstone is hidden from all reads and the scheduled job later hard-deletes it and its assets with no orphan left behind

### Requirement: Durable reference codes
Every car SHALL receive a `TS-####` reference code on creation that is never edited, never manually chosen, and never reused after deletion; enquiries, taps, and activity rows join to the car by this reference.

#### Scenario: Code assignment
- **WHEN** a car is created
- **THEN** it receives the next code in sequence exactly once, and that code survives every edit

#### Scenario: Deletion does not recycle codes
- **WHEN** a car with code TS-0042 is deleted and a new car is later created
- **THEN** the new car never receives TS-0042
