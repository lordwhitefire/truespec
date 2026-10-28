## Purpose

Put an automated quality and security gate in front of the repository so type errors, test failures, lint regressions and unsafe headers cannot reach the main branch unnoticed.

## ADDED Requirements

### Requirement: Lint and formatting are enforced
The project SHALL provide lint and formatting commands, a configuration committed to the repository, and a rule set that covers application code, scripts and tests.

#### Scenario: Lint command runs
- **WHEN** a developer runs the documented lint command
- **THEN** it checks the repository and exits non-zero on a lint error

#### Scenario: Formatting is checkable
- **WHEN** a developer runs the documented format-check command
- **THEN** it reports files that do not match the committed formatting rules without rewriting them

### Requirement: CI runs the quality gate
A continuous-integration workflow SHALL run on pull requests and on the main branch, and SHALL execute type checking, unit tests, linting and a production build. A failing step SHALL fail the workflow.

#### Scenario: Type error fails CI
- **WHEN** a pull request introduces a TypeScript error
- **THEN** the CI workflow fails at the type-check step

#### Scenario: Test failure fails CI
- **WHEN** a pull request breaks a unit test
- **THEN** the CI workflow fails at the test step

#### Scenario: Production build is proven
- **WHEN** a pull request changes application code
- **THEN** CI runs the production build and reports success or failure

### Requirement: A browser smoke test covers the critical paths
The project SHALL include an end-to-end smoke test that loads the public home, inventory and a public car page, opens the office door, and verifies that an unauthenticated visitor cannot reach office data. The smoke test SHALL run in CI or in a documented pre-merge job.

#### Scenario: Public showroom smoke test
- **WHEN** the smoke test runs against a preview or local build
- **THEN** the home, inventory and car pages load successfully and show their main heading

#### Scenario: Office door refuses anonymous access
- **WHEN** the smoke test requests an office route without a session
- **THEN** it is sent to the sign-in surface and no office data is rendered

### Requirement: Security headers are explicit
The application SHALL send a documented set of security headers covering content type, framing, referrer policy, permissions policy and transport security. A content security policy SHALL be present in report-only or enforcing mode and SHALL account for the site's fonts, styles, images and payment-free script surface.

#### Scenario: Headers are present
- **WHEN** a public page response is inspected
- **THEN** it includes the documented content-type, frame, referrer, permissions and transport-security headers

#### Scenario: CSP does not break the showroom
- **WHEN** the public home, inventory and car pages are loaded with the policy active
- **THEN** the pages render without a content-security-policy violation in the browser console

### Requirement: Dependencies are checked for known vulnerabilities
CI SHALL run a dependency vulnerability check, and a known vulnerability SHALL either block the merge or be recorded as an explicit, dated acceptance with an owner and a remediation plan.

#### Scenario: Vulnerability is reported
- **WHEN** the dependency check finds a known vulnerability
- **THEN** the workflow fails or the acceptance record names the package, severity, owner and review date
