## Purpose

The door to the private office: one owner, one account held at the identity provider, the provider's own sign-in as the only way in, sessions the app enforces itself, and abuse control the provider applies — it slows attackers down and then clears itself, never leaving the real owner shut out for good.

## ADDED Requirements

### Requirement: Exactly one account, and no sign-up path
The system SHALL have exactly one owner account, held at the identity provider and created by the owner himself. The provider's application SHALL be in its invite-only mode, so no public sign-up exists anywhere. The application SHALL build no registration screen and no account-creation route. There SHALL be no default password and no shared login.

#### Scenario: The owner's account exists
- **WHEN** the owner needs his account to exist
- **THEN** he creates it himself at the identity provider — by manual creation or by an invitation he sends himself — and no route in the application creates an account

#### Scenario: No registration path anywhere
- **WHEN** a stranger reaches the office, or the identity provider's own sign-up, without a valid invitation
- **THEN** no account can be created and only sign-in is offered

#### Scenario: Registration is open again
- **WHEN** the provider's access mode is found to be anything but invite-only
- **THEN** the requirement fails — the office's whole account rule rests on that setting

### Requirement: Every office request is checked server-side
Every office page and data request SHALL be verified on the server against an active session, and the check SHALL apply to the request itself, not to the visibility of links. Signing out SHALL immediately make every office page and action refuse the session.

#### Scenario: Direct URL without a session
- **WHEN** an unauthenticated visitor types an office URL directly
- **THEN** the server refuses to render the page or return its data

#### Scenario: After sign-out
- **WHEN** the owner signs out
- **THEN** every office page and action rejects the old session, including tabs left open

### Requirement: Session lifetime enforced by the app
A session SHALL expire after 12 hours of inactivity or 7 days total, whichever comes first, enforced by the application itself regardless of any provider's plan tier. There SHALL be no "remember me" that exceeds the 7-day cap.

#### Scenario: Idle office tab
- **WHEN** the owner leaves the office untouched for more than 12 hours
- **THEN** the next action requires a fresh sign-in

#### Scenario: Active week
- **WHEN** the owner works continuously but the session reaches 7 days old
- **THEN** the session ends and a fresh sign-in is required

### Requirement: The identity provider carries the sign-in
The sign-in SHALL be the identity provider's own, mounted in the office. The application SHALL build no sign-in form, SHALL put no credential material in any table, log or response, and SHALL receive no sign-in attempt — so the application can apply no per-attempt rule of its own, and abuse control belongs to the provider (next requirement). Every office page and data request SHALL still be checked against the application's own session, on the server. *(Owner ruling, 2026-10-14: the provider does the sign-in, not the office. This supersedes the earlier requirement that the application's own form gate every attempt before forwarding it — a provider-carried sign-in never passes through the application.)*

#### Scenario: A sign-in is submitted
- **WHEN** someone signs in
- **THEN** the provider handles the attempt end to end, and the application holds no credential material from it

#### Scenario: The application is searched for password material
- **WHEN** the schema, the code and the logs are searched for password material
- **THEN** none exists — no hash column, no credential written anywhere, and no form of ours that takes one

### Requirement: Abuse control is the provider's, and its lock clears itself
Repeated failed sign-ins SHALL be limited by the identity provider: the account SHALL be locked after **10 failed attempts**, for a **bounded period that clears itself**, with the provider's own per-address rate limiting left in force. The lock SHALL never be indefinite and SHALL never require a support action, a ticket, or anyone's intervention to clear. *(Owner ruling, 2026-10-14: ten attempts, thirty minutes, not indefinite. This replaces the application's own delay schedule and per-IP window, which a provider-carried sign-in cannot see — the application receives no attempt.)*

#### Scenario: Repeated failures
- **WHEN** failed sign-ins are fired one after another
- **THEN** the account is locked after ten consecutive failures, and the attempts beyond that do not reach the account

#### Scenario: The lock clears itself
- **WHEN** the bounded period passes with no further failures
- **THEN** the owner signs in normally — no support action, no ticket, and no state anyone has to clear by hand

#### Scenario: A lock that is indefinite
- **WHEN** the lockout configuration is inspected
- **THEN** a bounded duration is set; an indefinite lock, or one only an operator can clear, fails this requirement

### Requirement: The failure message is the provider's, and probing is rate-limited
The sign-in failure message SHALL be the provider's own; the application SHALL add no message of its own and SHALL never display the account's identity back to a caller. The provider's **bulk** user-enumeration protection SHALL be enabled, so that probing which identifiers exist is rate-limited. *(Recorded limit, 2026-10-14, verified against the provider's documentation: concealment so complete that the existence of an identifier is never revealed requires the provider's **strict** mode — and strict forbids password as the starting strategy, which would cost email-and-password sign-in. With a password kept, this requirement is met by rate-limiting the probing rather than by concealing existence. The alternative — strict mode and no password-first sign-in — is the owner's to choose.)*

#### Scenario: A sign-in fails
- **WHEN** a sign-in fails
- **THEN** the message comes from the provider, the application adds nothing of its own, and the account's identity is never echoed back

#### Scenario: Someone probes for the account
- **WHEN** one identifier is tried repeatedly to learn whether an account exists
- **THEN** the provider's bulk protection rate-limits the probing

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
