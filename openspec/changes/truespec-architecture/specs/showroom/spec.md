## Purpose

The public showroom buyers visit without an account — browse the three fixed sections, judge a car completely on its page, and start a WhatsApp conversation — while guaranteeing that no cost or profit data ever reaches the browser.

## ADDED Requirements

### Requirement: Three fixed sections
The showroom SHALL always present exactly three sections — Available, On Order, and Landed — which the owner can never rename, add, or remove through the office. Landed SHALL appear inside Available (a landed car is still buyable), and a car marked as a new arrival SHALL appear under both Landed and Available while being counted only once.

#### Scenario: New arrival appears in both sections, counted once
- **WHEN** a car's state is marked as a new arrival
- **THEN** the car renders under Landed and under Available, and every count of Available includes it exactly once with an "of which N new arrivals" note

#### Scenario: Owner cannot change the sections
- **WHEN** the owner adds, renames, or deletes a car state in the office
- **THEN** the showroom still shows exactly Available, On Order, and Landed — state labels are an office concept and never alter the section set or the buyers' view of it

### Requirement: Cost data never reaches the browser
The system SHALL build every public response (pages, payloads, counts, API output) from an explicit server-side allow-list of public fields — brand, model, trim, year, colours, mileage, features, photos, price, section, reference code — and MUST never include purchase price, shipping, clearing, trucking, fuel costs, total cost, or profit, not even by accident of serialization.

#### Scenario: Public car page payload
- **WHEN** a visitor opens a car page or requests the showroom list
- **THEN** the response contains only allow-listed public fields, and no cost or profit value appears anywhere in the HTML, the serialized payload, or any network response

#### Scenario: Error responses do not echo submissions
- **WHEN** a public form submission is rejected
- **THEN** the error response does not repeat back values that were not already public

### Requirement: A listed car always has a price and at least one photo
A car SHALL appear publicly only when it has a price and at least one photo; otherwise it remains a draft visible only in the office. A public car page MUST never render an unset price as a number.

#### Scenario: Incomplete car stays private
- **WHEN** a car has no price or no photo
- **THEN** it does not appear in any showroom section, count, or link, and remains workable in the office as a draft

#### Scenario: Last condition met
- **WHEN** the missing price or photo is added
- **THEN** the car appears in its section immediately

#### Scenario: The price does not move with the state
- **WHEN** the car's state changes between on order, available and landed
- **THEN** the showroom shows the same one doorstep price

### Requirement: Car page carries everything needed to decide
Each car page SHALL display price (full naira figure, not abbreviated), year, mileage, colours, features, and photos, so a buyer never needs to ask whether the car is available or what it costs. Photos SHALL be swipeable on phone and tablet, with arrows additionally on laptop.

#### Scenario: Buyer checks a car on a phone
- **WHEN** a visitor opens a car page on a phone
- **THEN** the price, year, mileage, colours, features, and swipeable photos are all visible without any login, modal, or extra request

### Requirement: WhatsApp conversion with tap recording
Every car page SHALL offer a WhatsApp button that opens a chat with a message already naming that car, and the system SHALL record only that the tap happened — the page, the car's reference, and the time. The record MUST NOT contain the visitor's name, number, or message content.

#### Scenario: Buyer taps the button
- **WHEN** a visitor taps "Chat on WhatsApp" on a car page
- **THEN** WhatsApp opens with a pre-filled message naming that car, and a tap row is stored containing only page, car ref, and timestamp

### Requirement: Sold and deleted cars leave the showroom
A car marked sold, or deleted by the owner, SHALL disappear from all showroom pages and counts, while a visitor opening an old shared link to it SHALL receive a graceful not-available outcome rather than an error page or stale data.

#### Scenario: Shared link to a sold car
- **WHEN** a visitor opens a link to a car that has since been marked sold
- **THEN** the page handles it gracefully (car no longer presented as available) and does not show stale or crashing content

### Requirement: Showroom counts follow one counting rule
Section counts on the home page and the inventory page SHALL be computed by the same single rule used by the office (Available = Available group + Landed-this-year group, sold excluded), so public and office numbers can never disagree.

#### Scenario: Same number everywhere
- **WHEN** a buyer compares the count on the home page, the inventory page, and the owner checks the office
- **THEN** all three derive from the same rule and agree for the same instant
