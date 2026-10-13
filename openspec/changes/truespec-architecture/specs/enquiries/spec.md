## Purpose

Tracking customer conversations: recording WhatsApp taps with no customer PII, importing enquiry details from a manually prepared PDF through a preview-and-confirm flow, and moving enquiries through an owner-editable pipeline under clear retention rules.

## ADDED Requirements

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

### Requirement: PDF import with preview and explicit confirmation
The system SHALL accept a PDF prepared externally from a fixed template, parse it into a preview table, let the owner correct every row, and save nothing until the owner confirms. Rejections SHALL be explained rather than dropped silently.

#### Scenario: Owner reviews an import
- **WHEN** the owner uploads an enquiry PDF
- **THEN** a preview table shows every parsed row, editable, with nothing saved until confirm is pressed

#### Scenario: A row cannot be parsed
- **WHEN** part of the PDF fails to parse
- **THEN** the owner is told what was rejected and why, and can correct or exclude it before confirming

### Requirement: Enquiry pipeline as an editable registry
Enquiries SHALL move through columns — seeded New → Talking → Negotiating → Sold/Lost — as an owner-editable registry like car states: add, rename, reorder allowed; deletion blocked while any enquiry sits in the state. A state's occupied-ness, not the label, is what blocks deletion.

#### Scenario: Owner renames a column
- **WHEN** the owner renames "Negotiating" to "Making a deal"
- **THEN** enquiries in that state keep their place and the new label shows everywhere

#### Scenario: Deleting an occupied state
- **WHEN** the owner tries to delete a state that holds enquiries
- **THEN** the deletion is blocked with a count of the enquiries in it

### Requirement: Enquiry state never moves the car
Moving an enquiry to Sold SHALL NOT change any car's state, sold flag, or showroom presence — car tracking and customer tracking are separate decisions the owner makes separately.

#### Scenario: Enquiry reaches Sold
- **WHEN** the owner drags an enquiry card to Sold
- **THEN** the enquiry's car remains exactly where it was, and marking the car sold stays a separate action

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
A confirmed import's PDF SHALL be kept in private storage, linked to the import, and deletable by the owner; before confirmation nothing persists server-side beyond the parsing scratch state.

#### Scenario: Owner deletes an imported PDF
- **WHEN** the owner deletes the stored PDF of a confirmed import
- **THEN** the imported enquiry rows remain, the file is removed, and the deletion is logged
