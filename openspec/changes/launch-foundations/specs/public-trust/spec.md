## Purpose

Give the public site a complete, truthful legal surface: terms, privacy contact, and a recorded position on cookies and consent that matches what the site actually does.

## ADDED Requirements

### Requirement: Terms of service are published
The public site SHALL publish a terms page that states the basis on which the showroom is offered, that vehicle availability and prices may change, that a WhatsApp conversation is not a binding sale until the parties agree, and which law governs. The terms SHALL be linked from the public footer.

#### Scenario: Terms page is reachable
- **WHEN** a visitor opens `/terms`
- **THEN** the page renders the approved terms and shows the last-updated date

#### Scenario: Footer links to terms
- **WHEN** a visitor views any public page footer
- **THEN** a link to the terms page is present

### Requirement: Privacy contact is real and consistent
The privacy notice SHALL name a contact channel that exists, SHALL describe the WhatsApp tap record and demo-account data accurately, and SHALL NOT promise a deletion channel or email address the site does not provide.

#### Scenario: Privacy contact works
- **WHEN** a visitor follows the privacy notice's contact instruction
- **THEN** the named channel is reachable and matches the contact shown elsewhere on the site

#### Scenario: Deletion request is actionable
- **WHEN** a visitor asks to delete a WhatsApp enquiry
- **THEN** the notice explains how the request reaches the owner and what the owner can remove

### Requirement: Cookie and consent position is recorded and truthful
The project SHALL record which cookies and local storage the site uses, classify them as essential or non-essential, and state whether a consent banner is required. The current no-analytics position SHALL be recorded; adding analytics or a non-essential tracker SHALL require a consent review before release.

#### Scenario: Essential cookies only
- **WHEN** the current site is inspected in a browser
- **THEN** the recorded cookie inventory matches the observed Clerk session cookie, theme preference and any demo state, and no unrecorded tracker is present

#### Scenario: Analytics would trigger review
- **WHEN** a non-essential analytics or advertising script is proposed
- **THEN** the change is blocked until a consent and privacy review is recorded

### Requirement: Legal content has an owner and a review date
Each public legal page SHALL name its owner, show a last-updated date, and be reviewed when the data flow, contact channel or third-party processor changes.

#### Scenario: Legal page changes are dated
- **WHEN** the privacy notice, terms or cookie position changes
- **THEN** the last-updated date changes and the change is recorded
