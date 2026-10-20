## Purpose

The office dashboard: one fixed shape showing stock counts, money totals with explicit reach, recent WhatsApp taps, and recent activity — numbers that always say what they count.

## ADDED Requirements

### Requirement: One counting rule, applied at every read point
Stock counts SHALL all derive from a single shared rule: Available = Available-group cars + Landed-this-year cars (counted once, with an "of which N new arrivals" note), On Order = on-order-group cars, Sold counted separately outside the stock total. The showroom, the home page, and the office SHALL all read the same rule, so their numbers can never disagree.

#### Scenario: Cross-checking counts
- **WHEN** the owner compares the dashboard's Available count with the showroom's section count at the same moment
- **THEN** they match, and the new-arrival note explains any car appearing in two sections

### Requirement: Every money figure states its reach
Each money total SHALL say which cars it counts — e.g. "projected profit from 9 of 14 cars" — and SHALL name what is left out. No total may silently drop cars or quietly include unfinished ones.

#### Scenario: Profit over the whole stock
- **WHEN** the dashboard shows projected profit
- **THEN** the figure carries an explicit "from N of M cars" reach line and any exclusion is named in words

### Requirement: Incomplete costs are explained, never hidden
When cars have incomplete costs, the profit total SHALL carry the "still building" line (per the money capability) explaining the gap; money tied up SHALL still include those cars. The dashboard shape never changes to accommodate data it lacks.

#### Scenario: Half-entered stock
- **WHEN** several cars lack cost data
- **THEN** the profit card keeps its place and wording shape, adds the explanation line, and the money-tied-up card does not shrink or change

### Requirement: Fixed layout, whatever the owner configures
The dashboard SHALL keep the same sections no matter what states, labels, or settings the owner adds: stock counts, money totals, recent taps, recent activity.

#### Scenario: Owner adds custom states
- **WHEN** the owner adds new states and labels in Settings and states
- **THEN** the dashboard layout is unchanged; only the numbers within it move

### Requirement: Refresh without a manual button
The dashboard SHALL refresh on window/tab focus rather than offering a manual Refresh control.

#### Scenario: Owner returns to the tab
- **WHEN** the owner switches back to the dashboard tab
- **THEN** the figures refresh automatically, and no Refresh button exists

### Requirement: Tap notification is a badge only
Recent WhatsApp taps SHALL be surfaced by a count badge and the recent-taps list — no separate alert, popup, or sound. The badge's figure is **the taps since the office last looked**, not an all-time total: opening the full tap list marks them seen and the figure clears, while the tap glyph itself stays so the list keeps a permanent entry point. The seen-mark SHALL be written by a POST (no GET changes data), SHALL be resolved by the store against a tap row it actually holds, and SHALL only ever move forward.

#### Scenario: New tap arrives while the dashboard is open
- **WHEN** a buyer taps WhatsApp somewhere on the showroom
- **THEN** the badge/list reflects it on refresh, with no additional alert raised

#### Scenario: The owner looks, and the figure clears
- **WHEN** the owner opens the full tap list
- **THEN** those taps are marked seen, the figure clears with the glyph left in place, and a tap arriving afterwards counts as new again

### Requirement: Recent activity feed
The dashboard SHALL show a recent-activity feed of the owner's own actions (cars added, states changed, sales, deletions, imports) with subject and time.

#### Scenario: Owner reviews the week
- **WHEN** the owner opens the dashboard
- **THEN** recent actions are listed in time order with what changed and when
