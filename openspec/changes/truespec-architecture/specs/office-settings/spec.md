## Purpose

The office Settings screen and the owner's data ownership: the handful of values that configure the site, password change, and a full one-click export of everything the system holds.

## ADDED Requirements

### Requirement: The settings that exist
Settings SHALL hold exactly: WhatsApp number, tagline, full-tank default (form prefill only), and password change. There SHALL be no exchange-rate setting — no rate exists anywhere in the system (owner ruling 2026-10-12; the rate was never in the source spec and has been removed) — and the password SHALL be held by the identity provider (Clerk), never stored as a setting value and never held in plaintext by the application.

#### Scenario: Settings screen contents
- **WHEN** the owner opens Settings
- **THEN** they see WhatsApp number, tagline, full-tank default, password change, and the data-export action — and no rate field

### Requirement: WhatsApp number validated before it saves
A save with an invalid WhatsApp number SHALL be rejected inline, because a wrong number makes the showroom's primary action dead. A **valid** number is a Nigerian mobile written as `+234…`, `234…`, or `0…` (owner ruling 2026-10-14); it SHALL be stored **normalised to `+234…`** and digits only, because the `wa.me` link the tap button builds only resolves when the number holds one fixed shape. Anything else — letters, a partial number, a foreign number without its country code — is invalid and is refused.

#### Scenario: Owner fat-fingers the number
- **WHEN** the owner saves a malformed WhatsApp number
- **THEN** the save is blocked with an inline explanation, and the previous number stays active

#### Scenario: The same number, written a different way
- **WHEN** the owner saves the number as `0803 123 4567`, `2348031234567`, or `+234 803 123 4567`
- **THEN** it is accepted, stored as `+2348031234567`, and the showroom's WhatsApp link resolves

### Requirement: One-click full export
The system SHALL offer a single action exporting all held data — cars (with their costs and photos), enquiries, taps, activity, and settings — usable as the owner's exit path. The action SHALL produce **one download — a single ZIP archive** holding all of it in both forms, so nothing has to be remembered and nothing is left behind: `master.json`, a **machine-readable master** that keeps the shape of the data (each car's cost lines and photo list, and each enquiry's imported file, nested where they belong), and **one CSV per subject — cars, costs, photos, enquiries, taps, activity, settings — never one combined sheet**, because a car carries costs and photos while a tap carries neither, and a single sheet would be mostly empty cells and columns that mean nothing. The archive SHALL also carry a short `README.txt` saying what is inside and when it was made. **Not an Excel workbook:** it is one vendor's file, and it flattens the nesting. Per-subject access requests SHALL be satisfiable from the same data.

#### Scenario: Owner exports everything
- **WHEN** the owner presses export
- **THEN** one ZIP archive downloads, holding `master.json` with its nested parts intact, one CSV per subject, and a `README.txt` naming the contents and the date

#### Scenario: Exit with nothing lost
- **WHEN** the owner stops using the product
- **THEN** the export they already hold contains everything the product knew, so exit loses no data the export covers

#### Scenario: The export reaches nothing public
- **WHEN** anyone without an authenticated office session requests the export
- **THEN** nothing is served — the export is reachable only from inside the office, and no export payload appears on any public path

### Requirement: In-product operational notices
The office SHALL surface operational notices in-product — storage usage past a threshold, backup status — rather than by email, since there is no mail channel in v1. Both notices SHALL be **read from setting rows, never computed here** (owner ruling 2026-10-14): a `last_backup_at` value **written by the daily job** (D8; TASK-006's work) and a storage-warning figure whose default is **4 GB**. The office only displays them; it SHALL NOT compute storage live from the image store, and no new table is added for either.

#### Scenario: Storage approaches its limit
- **WHEN** image storage passes the configured usage threshold
- **THEN** the office tells the owner in-product, with the response (upgrade or trim photos) left to them
