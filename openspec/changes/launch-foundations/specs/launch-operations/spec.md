## Purpose

Make the running system observable, bounded and recoverable after launch, so an outage, abuse attempt or bad deployment is noticed and has an owner.

## ADDED Requirements

### Requirement: Public availability is monitored
The production showroom SHALL have an uptime check that requests a public page at a regular interval and alerts a named owner after a sustained failure. The check SHALL NOT depend on an office session or a database write.

#### Scenario: Showroom outage alerts
- **WHEN** the public home page fails repeatedly for the configured threshold
- **THEN** the named owner receives an alert naming the URL, the time and the failure

#### Scenario: Healthy site is not noisy
- **WHEN** the showroom is healthy
- **THEN** no repeated false alert is sent

### Requirement: Application errors are tracked
Server and client errors SHALL be reported to an error tracker with the route, release and a scrubbed error context. Costs, customer names, phone numbers, private notes, cookies and environment values SHALL NOT be sent to the tracker.

#### Scenario: Server error is recorded
- **WHEN** a server render throws an unexpected error
- **THEN** the tracker records the route, release and error type without customer or cost data

#### Scenario: PII is scrubbed
- **WHEN** a tracked error includes a request body or query string
- **THEN** known sensitive fields are redacted before transmission

### Requirement: Every unauthenticated write has a limit or an accepted risk
The project SHALL record the rate-limit boundary for each unauthenticated write: provider sign-in limits, the tap rule, demo sign-up and any public form. An unauthenticated write SHALL have an enforced limit or a dated owner acceptance explaining why the risk is acceptable.

#### Scenario: Tap abuse is bounded
- **WHEN** one source sends taps above the configured threshold
- **THEN** the requests are refused or throttled at the edge and no store write occurs

#### Scenario: Demo sign-up is bounded
- **WHEN** one source creates demo accounts above the configured threshold
- **THEN** the provider or application refuses or throttles further sign-ups

### Requirement: Demo identity lifecycle is decided
The project SHALL record whether demo identities live forever, expire after a fixed period, or are deleted by the owner, and SHALL ensure that demo cleanup never deletes main identities or main data.

#### Scenario: Demo reset preserves accounts unless deletion is configured
- **WHEN** the daily demo reset runs
- **THEN** demo rows and demo assets reset and demo identities follow the recorded lifecycle

#### Scenario: Main identity is never touched
- **WHEN** demo cleanup runs
- **THEN** no main account, main row or main asset is removed

### Requirement: Deployment and rollback are documented
The project SHALL document the production and preview deployment shape, how environment values reach each environment, how migrations are applied, and how a bad deployment is rolled back without losing committed data.

#### Scenario: Rollback is possible
- **WHEN** a production deployment is found to be bad
- **THEN** the documented rollback restores the previous deployment and states what happens to forward-only migrations

#### Scenario: Preview is isolated
- **WHEN** a pull request creates a preview deployment
- **THEN** it does not write to the production database or the production asset store

### Requirement: Alerts have an owner and a runbook
Each alert SHALL name an owner and a first response. The runbook SHALL cover showroom outage, office sign-in failure, backup failure, demo reset failure and suspected data exposure.

#### Scenario: Backup failure is actionable
- **WHEN** the daily backup fails
- **THEN** the named owner receives an alert and the runbook says how to inspect the job summary and rerun safely

#### Scenario: Suspected exposure has a path
- **WHEN** a cost, private note, customer record or asset is suspected to be exposed
- **THEN** the runbook names the containment, rotation and notification steps
