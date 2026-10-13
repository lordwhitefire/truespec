## Purpose

The office Settings screen and the owner's data ownership: the handful of values that configure the site, password change, and a full one-click export of everything the system holds.

## ADDED Requirements

### Requirement: The settings that exist
Settings SHALL hold exactly: WhatsApp number, tagline, full-tank default (form prefill only), and password change. There SHALL be no exchange-rate setting — no rate exists anywhere in the system (owner ruling 2026-10-12; the rate was never in the source spec and has been removed) — and the password SHALL be held by the identity provider (Clerk), never stored as a setting value and never held in plaintext by the application.

#### Scenario: Settings screen contents
- **WHEN** the owner opens Settings
- **THEN** they see WhatsApp number, tagline, full-tank default, password change, and the data-export action — and no rate field

### Requirement: WhatsApp number validated before it saves
A save with an invalid WhatsApp number SHALL be rejected inline, because a wrong number makes the showroom's primary action dead.

#### Scenario: Owner fat-fingers the number
- **WHEN** the owner saves a malformed WhatsApp number
- **THEN** the save is blocked with an inline explanation, and the previous number stays active

### Requirement: One-click full export
The system SHALL offer a single action exporting all held data — cars (with costs), enquiries, taps, activity, and settings — as CSV and JSON, usable as the owner's exit path. Per-subject access requests SHALL be satisfiable from the same data.

#### Scenario: Owner exports everything
- **WHEN** the owner presses export
- **THEN** a file downloads containing every car, cost, enquiry, tap, activity row, and setting in both human-readable and machine-readable form

#### Scenario: Exit with nothing lost
- **WHEN** the owner stops using the product
- **THEN** the export they already hold contains everything the product knew, so exit loses no data the export covers

### Requirement: In-product operational notices
The office SHALL surface operational notices in-product — storage usage past a threshold, backup status — rather than by email, since there is no mail channel in v1.

#### Scenario: Storage approaches its limit
- **WHEN** image storage passes the configured usage threshold
- **THEN** the office tells the owner in-product, with the response (upgrade or trim photos) left to them
