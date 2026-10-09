## Purpose

The door to the private office: one owner, one account, sessions the app enforces itself, and abuse control that slows attackers down without ever locking the real owner out.

## ADDED Requirements

### Requirement: Single first-run account
The system SHALL have exactly one owner account, created on first run by the operator themselves. There SHALL be no default password, no shared login, and no public sign-up.

#### Scenario: First run
- **WHEN** the office is opened before any account exists
- **THEN** the first-run screen lets the operator create the account with their own email and password, and no pre-set password is ever used

#### Scenario: Sign-up attempts afterwards
- **WHEN** someone reaches the office after an account exists
- **THEN** only sign-in is offered — no registration path exists

### Requirement: Every office request is checked server-side
Every office page and data request SHALL be verified on the server against an active session, and the check SHALL apply to the request itself, not to the visibility of links. Signing out SHALL immediately make every office page and action refuse the session.

#### Scenario: Direct URL without a session
- **WHEN** an unauthenticated visitor types an office URL directly
- **THEN** the server refuses to render the page or return its data

#### Scenario: After sign-out
- **WHEN** the owner signs out
- **THEN** every office page and action rejects the old session, including tabs left open

### Requirement: Session lifetime enforced by the app
A session SHALL expire after 12 hours of inactivity or 7 days total, whichever comes first, enforced by the application itself regardless of the database vendor's plan tier. There SHALL be no "remember me" that exceeds the 7-day cap.

#### Scenario: Idle office tab
- **WHEN** the owner leaves the office untouched for more than 12 hours
- **THEN** the next action requires a fresh sign-in

#### Scenario: Active week
- **WHEN** the owner works continuously but the session reaches 7 days old
- **THEN** the session ends and a fresh sign-in is required

### Requirement: Sign-in passes through the application, never a hosted login page
The sign-in form SHALL be part of the application, submitting to a server-side route that applies the failure rules before forwarding the attempt to the identity provider. No hosted third-party login page SHALL receive attempts directly, because it would bypass the delay schedule and the per-IP window.

#### Scenario: Attempt reaches the identity provider
- **WHEN** a sign-in is submitted
- **THEN** it passes the application's delay and per-IP checks on the server first, and only a cleared attempt is forwarded — the provider never sees attempts the application has rejected

### Requirement: Growing delay on failed sign-in
After 3 failed sign-in attempts the system SHALL delay each subsequent attempt — 1s, 5s, 15s, 30s — capped at 60 seconds, for as long as failures continue.

#### Scenario: Repeated wrong password
- **WHEN** a signer fails 5 times in a row
- **THEN** attempts 4 and 5 are delayed according to the sequence, with no delay on the first three

### Requirement: Per-IP failure window, never a lockout
The system SHALL allow at most 10 failed sign-in attempts per IP per 15-minute window; further attempts in that window are logged and rejected without processing. The system MUST never lock an account — after the window passes, sign-in works normally.

#### Scenario: Failure flood from one IP
- **WHEN** more than 10 failures occur from one IP within 15 minutes
- **THEN** additional attempts in the window are logged and refused, and the real owner signing in from a different context is unaffected

#### Scenario: Window expires
- **WHEN** the 15-minute window passes with no further failures
- **THEN** the next attempt from that IP is processed normally, with the account still usable

### Requirement: Generic sign-in failure message
The sign-in page SHALL answer a failed attempt with one generic message that does not reveal whether the email exists, and shall never display the account's identity back to the caller.

#### Scenario: Unknown email vs wrong password
- **WHEN** sign-in fails for an unknown email and, separately, for a known email with a wrong password
- **THEN** both show the identical generic message and behave identically in timing-visible ways (delay schedule)

### Requirement: State changes are POSTs with origin verification
Every office state change SHALL arrive as a POST (never a link or GET), the origin SHALL be verified, and no GET request SHALL ever change data. The session cookie SHALL be `HttpOnly`, `SameSite=Lax`, and `Secure`.

#### Scenario: Link-triggered state change attempt
- **WHEN** a crafted URL is opened that would change data if it were a GET
- **THEN** no data changes, because state changes only happen on POSTs that pass the origin check

### Requirement: Password recovery without an in-app reset flow
The system SHALL NOT include an in-app password reset flow in v1; the office SHALL state in Settings that recovery happens outside the app as a documented operation at the identity provider, so the owner knows the one recovery route before they need it.

#### Scenario: Owner forgets the password
- **WHEN** the owner is locked out by a forgotten password
- **THEN** Settings (readable without the password, via documentation) has already told them recovery is an identity-provider operation, and no reset link feature exists in the app
