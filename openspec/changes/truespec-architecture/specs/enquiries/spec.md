## Purpose

Tracking customer conversations: recording WhatsApp taps with no customer PII, importing enquiry details from a manually prepared PDF through a flow that lands them as **drafts** the owner saves one by one, and letting the owner track each enquiry by giving it a state (seeded New, Talking, Negotiating, Sold, Lost — his to add to, rename and reorder) under clear retention rules. An enquiry is the customer's asking, held in their own words and apart from the car records they may name.

## ADDED Requirements

### Requirement: An enquiry is not a car record
An enquiry SHALL be recorded under its own identity — the customer's name and number, what they asked for, any note, and the state the owner gives it — and SHALL NOT join to a car by reference, key, or any other identifier. The car asked about SHALL be held as the words the customer used (a name, a description, or several cars at once) and need not match any car the inventory holds: no car row SHALL be created, changed, or implied to make an enquiry fit. Two or more enquiries MAY name the same car, and a car MAY hold no enquiry — car tracking and customer tracking are separate records with separate identities.

#### Scenario: Asking about a car that is not listed
- **WHEN** a customer asks about a car the showroom does not hold
- **THEN** the enquiry is saved with the customer's own words for the car, and no car row is created or changed

#### Scenario: Two customers ask about the same car
- **WHEN** two customers ask about the same car
- **THEN** two independent enquiries exist, each with its own identity, and neither affects the other or the car

### Requirement: Taps record context, not customers
A WhatsApp tap SHALL be stored with only the page, the car's reference, and the time. The system SHALL NOT capture a name, number, or message content for a tap — those exist only if later imported manually.

#### Scenario: Tap without import
- **WHEN** a buyer taps WhatsApp and never appears in any import
- **THEN** the enquiry record derived from taps carries no name or number, and the dashboard tap list shows only page, car, and time

### Requirement: Privacy notice before the tap
The WhatsApp entry page SHALL carry a plain-language privacy notice — what is collected (name, number, car asked about, time), why, how long it is kept, and the right to demand deletion — presented before the tap.

#### Scenario: Visitor reads the notice
- **WHEN** a visitor opens the WhatsApp page
- **THEN** the retention and collection notice is visible before they press the tap button

### Requirement: The full tap list has a home
The office SHALL offer the complete list of taps — every recorded row — as a view of its own beside the enquiries board, and the dashboard's recent-taps panel SHALL link to it. A panel MAY draw a bounded recent slice; the list the owner opens MUST NOT be quietly short.

#### Scenario: The owner opens all taps
- **WHEN** the owner opens the full tap list
- **THEN** every recorded tap is shown, and opening it marks them seen for the badge (design D21) without the panel's own bounded read changing

### Requirement: An uploaded enquiry file becomes drafts, never records
The system SHALL accept a PDF prepared externally from a fixed template, read the enquiry rows it carries, and write each row into a **draft** in a holding place of its own — one draft per row, and never an enquiry. The file SHALL carry the enquiry's **editable fields and nothing else** — name, number, what they asked for, note, and the state — and nothing beyond them SHALL be read, inferred or filled in. The owner SHALL be able to correct any draft and save it on its own: a save is what creates the enquiry, and the enquiry's own rules (its required "what they asked for", its state) are enforced **at that save**, not at upload, because a draft is allowed to be incomplete. Until it is saved a draft SHALL carry no enquiry's key and no change-check, SHALL sit in no state and occupy none — so a waiting draft never blocks a state's deletion, though it MAY hold the state its file named, applied at that save — SHALL not be countable or listed as an enquiry, and SHALL be readable only as a draft. A row that cannot be read SHALL be explained and named, never silently dropped.

#### Scenario: Owner uploads a file
- **WHEN** the owner uploads an enquiry PDF holding ten rows
- **THEN** ten drafts exist and no enquiry exists; saving one creates one enquiry, gives it its state and its change-check, and leaves the other nine drafts untouched

#### Scenario: Drafts wait for the owner
- **WHEN** the owner leaves the office with drafts unsaved
- **THEN** the drafts are still there when he returns, still drafts, and nothing about them has become an enquiry

#### Scenario: A row cannot be read
- **WHEN** part of the PDF cannot be read
- **THEN** the owner is told what was rejected and why, and can correct or exclude it before saving

### Requirement: Enquiry states as an editable registry
Every enquiry SHALL carry exactly one state — seeded New, Talking, Negotiating, Sold, Lost — as an owner-editable registry like car states: add, rename, reorder allowed; deletion blocked while any enquiry sits in the state. A state's occupied-ness, not the label, is what blocks deletion. **A state is a label for tracking, not a stage in a flow:** the states carry no order that anything enforces or implies, an enquiry may be given any state at any time, and no rule SHALL require one state to precede another.

#### Scenario: The owner adds, renames or reorders states
- **WHEN** the owner adds a state, renames "Negotiating" to "Making a deal", or changes the order the states are listed in
- **THEN** every enquiry keeps the state it has, the new label shows everywhere, and no enquiry's state is changed by the edit

#### Scenario: A customer buys immediately
- **WHEN** an enquiry that has just arrived is given the state Sold the same day
- **THEN** the change is accepted, and nothing requires it to pass through Talking or Negotiating first

#### Scenario: Deleting an occupied state
- **WHEN** the owner tries to delete a state that holds enquiries
- **THEN** the deletion is blocked with a count of the enquiries in it

### Requirement: An enquiry's state never changes a car
An enquiry state SHALL NOT change any car's state or showroom presence — car tracking and customer tracking are separate decisions the owner makes separately.

#### Scenario: Enquiry reaches Sold
- **WHEN** the owner gives an enquiry the state Sold
- **THEN** no car's state or showroom presence changes, and marking a car sold stays a separate action the owner takes himself

### Requirement: Retention schedule for customer data
Customer data SHALL follow a retention schedule measured from **the date the enquiry was recorded** (keyed in or imported), not from any later contact: every enquiry becomes due for the owner's decision 12 months after it was recorded — the system SHALL NOT need a flag to tell an open enquiry from a closed one, because the state the owner gave it is what tells him, and the action is the same either way. The system SHALL notify the owner when an enquiry becomes due and SHALL NOT delete or anonymise customer data on its own — deletion is the owner's action, taken from that notice or at any time. Buyer records are kept 6 years after sale (accounting period). Deletion of a customer SHALL remove the customer's data — the enquiry row and its imported PDF — leave the tap rows intact (they carry no PII), leave the car record untouched, and log the deletion in activity.

#### Scenario: An enquiry reaches a year
- **WHEN** an enquiry passes 12 months since it was recorded
- **THEN** the office shows it to the owner as due for a decision, nothing is deleted until the owner deletes it, and once he does the customer's details and the imported PDF go while the car's tap rows remain (taps hold no name or number)

#### Scenario: Owner deletes a customer mid-conversation
- **WHEN** the owner deletes a customer record
- **THEN** the enquiry card disappears, tap rows stay (page/car/time only), the car record is untouched, and the deletion appears in activity

### Requirement: Only the owner sees customer details
Customer names, numbers, and notes SHALL be visible only inside the authenticated office — v1 has no staff roles — and SHALL never appear in any public payload.

#### Scenario: Public inspection
- **WHEN** any public response is examined for customer data
- **THEN** no name, number, or note appears anywhere outside the authenticated office

### Requirement: Imported PDFs are kept, linked, and deletable
An uploaded enquiry PDF SHALL be held in private storage from the moment it is uploaded — the file a draft came from is not discarded while its drafts are still waiting — and once its drafts are saved it is linked to the enquiries it produced and deletable by the owner. The original filename and the asset reference SHALL live only in the database, and a reference SHALL never appear in a public payload. What persists before a save SHALL be a draft and never an enquiry: no enquiry exists, and none is counted, until the owner saves one.

#### Scenario: Owner deletes an imported PDF
- **WHEN** the owner deletes the stored PDF of a saved import
- **THEN** the imported enquiry rows remain, the file is removed, and the deletion is logged
