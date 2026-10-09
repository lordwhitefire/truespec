## Purpose

The money rules: what a car really cost, what profit it makes, and the guarantees that keep every figure on every screen identical — one formula, one rounding point, integer arithmetic, and a per-line FX rate with no global rate anywhere.

## ADDED Requirements

### Requirement: Six fixed cost kinds
The car form SHALL accept exactly six cost kinds — purchase price ($), shipping ($), clearing ($), trucking within USA ($), trucking in Nigeria (₦), full tank (₦) — and a car is "cost complete" only when all six have values.

#### Scenario: Completeness check
- **WHEN** any of the six cost values is missing
- **THEN** the car is treated as incomplete and its profit is reported under the incomplete-costs rule rather than included in profit totals

#### Scenario: A genuine zero
- **WHEN** the owner enters 0 as a cost value
- **THEN** zero counts as entered (the cost is complete) — zero and not-entered are different things

### Requirement: Every dollar cost carries its own rate
Each $ cost line SHALL store the FX rate (kobo per dollar, integer) at which that amount was made; there SHALL be no global or settings-level rate anywhere in the system, and lines of one car may legitimately carry different rates. Saving a $ amount with no rate SHALL be invalid and caught inline before save.

#### Scenario: Two lines, two rates
- **WHEN** a car's purchase price was made at one rate and its shipping at another
- **THEN** each line converts with its own rate and the total is correct

#### Scenario: Rate missing on save
- **WHEN** the owner saves a $ cost line without a rate
- **THEN** inline validation blocks the save and marks the missing field — the error is caught as typed, not after saving

### Requirement: One total-cost formula, recomputed everywhere
Total cost SHALL be `(Σ of the four $ lines × each line's own rate) + (Σ of the two ₦ lines)`, computed by a single function used at every read point. Changing any cost, rate, or price SHALL recompute total cost and profit everywhere — nothing is frozen at entry.

#### Scenario: Owner corrects an old rate
- **WHEN** the owner edits the rate on a $ line of an already-landed car
- **THEN** total cost and profit recompute on every screen that shows them, from the same single formula

### Requirement: Integer money, one rounding point
All money SHALL be stored as integer minor units (kobo/cents) — never floats, never scaled numerics — and rounding SHALL happen in exactly one place: the totals function. Naira formatting happens only at the display edge.

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

### Requirement: Incomplete costs never silently distort totals
Cars with incomplete costs SHALL contribute their entered costs to money-tied-up (the money was genuinely spent) but SHALL be left out of profit totals with a plain "still building" line that names how many cars are out and why — never silently dropped, never counted as zero profit.

#### Scenario: Dashboard with three incomplete cars
- **WHEN** profit totals are shown with 3 of 12 cars missing costs
- **THEN** the figure reads as coming from the complete cars and carries a "still building" note naming the 3, while money tied up still includes them
