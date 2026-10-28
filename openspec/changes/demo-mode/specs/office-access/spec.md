## Purpose

The office has two kinds of account on one identity-provider application: an invited **main** account
sees the real inventory, and a self-serve **demo** account sees a practice copy. The provider still
carries the sign-in; the application still keeps its own session rows.

## REMOVED Requirements

### Requirement: Exactly one account, and no sign-up path

**Reason**: The owner has replaced the single-account, invite-only rule. Main access is now granted by
invitation, and a public demo sign-up is intentional. The old requirement's "no public sign-up
anywhere" would make the demo impossible.

**Migration**: The provider's sign-up mode is opened for demo accounts. Main remains invitation-only
through provider metadata (`truespec_space = "main"`), not through the provider's global sign-up mode.
The owner's account and the client's invitation carry that grant. The client's invitation → provider
→ office path stays the same.

## ADDED Requirements

### Requirement: Main and demo accounts

The identity-provider application SHALL support two kinds of signed-in account. An account carrying
`publicMetadata.truespec_space = "main"` SHALL be a **main** account. Every other signed-in account
SHALL be a **demo** account. The application SHALL NOT keep a role, permission or email allow-list
table. Main access SHALL be granted only by the owner setting that provider metadata on his own user
or on an invitation. A self sign-up SHALL have no main grant. There SHALL be no default password and
no shared login; each person signs in through the provider with their own account. The activity log
SHALL still name the actor of each action.

#### Scenario: The owner's account
- **WHEN** the owner signs in
- **THEN** his provider user carries the main grant and the office opens in main

#### Scenario: The client's invitation
- **WHEN** the owner invites a client with the main grant on the invitation and the client accepts it
- **THEN** the client's provider user carries the main grant and the office opens in main through the same invitation path already used

#### Scenario: A self sign-up
- **WHEN** a person signs up without an invitation carrying the main grant
- **THEN** the account is a demo account and the office opens in demo

#### Scenario: An account with no grant
- **WHEN** a signed-in account's provider metadata is missing, unreadable or not exactly `main`
- **THEN** the account is treated as demo; it is never treated as main by default

### Requirement: The demo sign-up is the provider's own

The application SHALL mount the identity provider's own sign-up component at the office's demo
sign-up path. It SHALL build no credential form, hold no password material, and create no account
row itself. The provider SHALL create the account and send the person back to the office. Demo
sign-up SHALL be gated by `DEMO_SIGNUP_ENABLED`; when the flag is off, the sign-up path SHALL refuse
and the sign-in surface SHALL not offer the link. Main accounts SHALL still be created by invitation,
not by this sign-up path.

#### Scenario: A person signs up for the demo
- **WHEN** demo sign-up is enabled and the person completes the provider's sign-up
- **THEN** the provider creates the account, the person returns to the office, and the office opens in demo

#### Scenario: The sign-up flag is off
- **WHEN** `DEMO_SIGNUP_ENABLED` is not on and the sign-up path is opened directly
- **THEN** the application refuses to render a sign-up form and returns the person to sign-in

#### Scenario: No password reaches the application
- **WHEN** the sign-up or sign-in request is inspected
- **THEN** the provider handles the credential; the application stores no password or credential material

### Requirement: The session row belongs to one space

When the application creates or reads its own `session` row, it SHALL do so in the store of the
account's resolved space. A main account's session row SHALL live in main; a demo account's session
row SHALL live in demo. A session row in one space SHALL NOT authorise a request in the other. The
lazy upsert and the 12-hour / 7-day limits SHALL continue to apply per row.

#### Scenario: A demo session is created
- **WHEN** a demo account makes its first office request
- **THEN** its `office_user` and `session` rows are created in demo, not main

#### Scenario: A main session is created
- **WHEN** a main account makes its first office request
- **THEN** its `office_user` and `session` rows are created in main

#### Scenario: A row from the other space
- **WHEN** a request's provider session matches a row that exists only in the other space
- **THEN** the request does not become authorised by that row; the selected space's lazy check runs

### Requirement: The office states which space the person is in

The office shell SHALL show the signed-in person's space. A demo account SHALL see the persistent demo
notice required by the demo capability; a main account SHALL see no demo notice. The notice SHALL NOT
be the only check — the server-side space resolution remains the boundary.

#### Scenario: The signed-in name and space
- **WHEN** any office page renders
- **THEN** the shell names the signed-in account, and a demo account also sees the demo notice
