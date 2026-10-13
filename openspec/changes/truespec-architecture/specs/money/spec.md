## Purpose

The money rules: what a car really cost, what profit it makes, and the guarantees that keep every figure on every screen identical — one formula, integer arithmetic, and no exchange rate at all, because every amount in the system is naira.

## ADDED Requirements

### Requirement: Six fixed cost kinds
The car form SHALL accept exactly six cost kinds — purchase price, shipping, clearing, trucking within USA, trucking in Nigeria, full tank — every one entered in naira, and a car is "cost complete" only when all six have values.

#### Scenario: Completeness check
- **WHEN** any of the six cost values is missing
- **THEN** the car is treated as incomplete and its profit is reported under the incomplete-costs rule rather than included in profit totals

#### Scenario: A genuine zero
- **WHEN** the owner enters 0 as a cost value
- **THEN** zero counts as entered (the cost is complete) — zero and not-entered are different things

### Requirement: No exchange rate exists — every amount is naira
No exchange rate SHALL be stored or applied anywhere — not on a cost line, not on a car, not in Settings — and every amount in the system SHALL be naira, entered as the naira paid; a cost that was paid in dollars is entered as its naira amount. (Owner ruling 2026-10-12, superseding R3: the rate was never in the source spec — it came from the prototype screens — and the owner ruled that everything is naira, since mixing currencies in one total causes trouble.)

#### Scenario: A cost paid in dollars
- **WHEN** a cost was paid in dollars
- **THEN** it is entered and stored as its naira amount — no rate is asked for, stored, or applied

#### Scenario: The customer price
- **WHEN** a buyer views a car
- **THEN** the price is a naira figure, and no rate field, setting key, column, or constant appears anywhere in the system

### Requirement: One total-cost formula, recomputed everywhere
Total cost SHALL be `Σ of the six cost lines` — all naira, so the sum is exact — computed by a single function used at every read point. Changing any cost or the price SHALL recompute total cost and profit everywhere — nothing is frozen at entry.

#### Scenario: Owner corrects an old cost
- **WHEN** the owner edits a cost line of an already-landed car
- **THEN** total cost and profit recompute on every screen that shows them, from the same single formula

### Requirement: Integer money, one totals function
All money SHALL be stored as integer minor units (kobo) — never floats, never scaled numerics. Every amount is naira and nothing is converted or divided, so the totals are exact integer sums; a single totals function is the only place money is combined, so no screen re-derives a figure from its own arithmetic, and naira formatting happens only at the display edge.

#### Scenario: No drift across screens
- **WHEN** the same car's cost is shown on the form, the inventory list, and the dashboard
- **THEN** all three figures are identical to the kobo, because they come from one function over integer inputs

### Requirement: Profit, labelled by what is known
Projected profit SHALL be `doorstep price − total cost` for unsold cars; real profit SHALL be `sale price − total cost` for sold cars. Negative profit SHALL be displayed without correction — it signals a bad buy, not an error. Cost figures SHALL be named by state: "Estimated total cost" while on order/at port/cleared, "Landed cost" once landed, "Total cost" once sold.

#### Scenario: A loss-making car
- **WHEN** a car's price is below its total cost
- **THEN** the negative profit renders as a negative figure on the form and inventory, with no warning, clamp, or suppression

#### Scenario: On-order car has no landed cost
- **WHEN** a car still on order shows its costs
- **THEN** the figure is labelled "Estimated total cost", never "Landed cost" — the car has not landed

### Requirement: One selling price, on the car, never on a state
A car SHALL have one selling price — its **doorstep price**, what the buyer pays to have the car brought to their door — and it SHALL be a field on the car, identical whether the car is on order, available, or landed. No state and no section SHALL carry a price; there is no "landed price" and no "available price". The **cost** is the only figure tied to a state, and it is office-only (the showroom allow-list keeps every cost out).

#### Scenario: A car's state changes
- **WHEN** a car's state or section changes
- **THEN** its price is unchanged, on every screen

#### Scenario: The showroom price is the one price
- **WHEN** a buyer views a car that is still on order
- **THEN** the showroom shows that car's one doorstep price, exactly as for a landed car

### Requirement: Incomplete costs never silently distort totals
Cars with incomplete costs SHALL contribute their entered costs to money-tied-up (the money was genuinely spent) but SHALL be left out of profit totals with a plain "still building" line that names how many cars are out and why — never silently dropped, never counted as zero profit.

#### Scenario: Dashboard with three incomplete cars
- **WHEN** profit totals are shown with 3 of 12 cars missing costs
- **THEN** the figure reads as coming from the complete cars and carries a "still building" note naming the 3, while money tied up still includes them
