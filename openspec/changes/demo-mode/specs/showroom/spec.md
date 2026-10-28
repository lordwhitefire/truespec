## Purpose

The public showroom remains the main inventory's shopfront. A demo account is an office practice
space; it never becomes a second public shopfront and never changes what a buyer sees.

## ADDED Requirements

### Requirement: The showroom reads main and nothing else

Every public showroom page, public count, public setting read and buyer tap SHALL use the main store.
The public site SHALL NOT resolve the visitor's office space and SHALL NOT read the demo store, even
when the visitor holds a live demo session. No demo car, price, photo, setting or tap SHALL appear in
any public page, JSON response, count, link or metadata.

#### Scenario: A demo user opens the showroom
- **WHEN** a signed-in demo user opens the home page, the inventory or a car page
- **THEN** every figure and car comes from main, exactly as it does for an anonymous visitor

#### Scenario: A demo edit is saved
- **WHEN** a demo user changes a car's price, photo or state
- **THEN** no public page or count changes

#### Scenario: A public setting is read
- **WHEN** any public page reads the WhatsApp number or tagline
- **THEN** it reads main's setting, never demo's

#### Scenario: A showroom tap is recorded
- **WHEN** a buyer taps a WhatsApp link on a car page
- **THEN** the tap row is written to main

### Requirement: The demo has no buyer-page preview

The demo office SHALL NOT offer a control that opens a public buyer page for a demo car. Such a link
would open main, not the demo car, and would misrepresent what the demo contains. The main office
SHALL keep its existing buyer-page preview.

#### Scenario: A demo car is open in the office
- **WHEN** the demo user looks for the buyer-page preview
- **THEN** the control is absent

#### Scenario: A main car is open in the office
- **WHEN** the main user looks for the buyer-page preview
- **THEN** the control remains available and opens the main showroom's car page
