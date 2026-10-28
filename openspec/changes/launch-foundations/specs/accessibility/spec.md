## Purpose

Make the showroom and office usable with a keyboard, a screen reader and reduced motion, with heading structure and focus behavior that remain correct as pages change.

## ADDED Requirements

### Requirement: Every public page has one main heading
Each public page SHALL contain exactly one visible or assistive-technology-accessible `<h1>` that names the page, and the heading hierarchy below it SHALL not skip a level.

#### Scenario: Home heading
- **WHEN** the home page is parsed
- **THEN** it has one `<h1>` naming TrueSpec or the showroom, and its section headings are `<h2>` or deeper

#### Scenario: Inventory heading
- **WHEN** the inventory page is parsed
- **THEN** it has one `<h1>` naming the inventory, and the result and card headings do not introduce a second `<h1>`

#### Scenario: Car heading
- **WHEN** a car page is parsed
- **THEN** it has one `<h1>` naming the car and no duplicate page-level heading

### Requirement: Keyboard and focus behavior is complete
Every interactive control SHALL be reachable and operable by keyboard, SHALL show a visible focus indicator, and SHALL not trap focus outside a deliberately modal surface. A modal dialog SHALL move focus inside, close on Escape and return focus to its trigger.

#### Scenario: Inventory is keyboard operable
- **WHEN** a keyboard-only visitor opens the inventory, changes a filter and pages the results
- **THEN** every control is reachable, the focus is visible and the result count is announced

#### Scenario: Dialog returns focus
- **WHEN** a confirmation dialog is closed with Escape or Cancel
- **THEN** focus returns to the control that opened it

### Requirement: Status is not conveyed by colour alone
State, error and success messages SHALL include text or an icon in addition to colour, and text and meaningful interface elements SHALL meet WCAG 2.2 AA contrast.

#### Scenario: Car state is understandable without colour
- **WHEN** a visitor views a car card or car page
- **THEN** the state is readable as text and is not distinguished only by a colour

#### Scenario: Error is announced
- **WHEN** a form submission fails
- **THEN** the error is announced in text and associated with the field or form, not shown by colour alone

### Requirement: The accessibility target is documented and tested
The project SHALL record WCAG 2.2 AA as its target and SHALL include an accessibility check in the release process covering keyboard navigation, heading structure, contrast and screen-reader names.

#### Scenario: Release check exists
- **WHEN** a release is prepared
- **THEN** the accessibility check is recorded with the pages and assistive technologies exercised

#### Scenario: Automated check is not the only evidence
- **WHEN** an automated accessibility scanner reports no errors
- **THEN** the release still records a keyboard and screen-reader pass
