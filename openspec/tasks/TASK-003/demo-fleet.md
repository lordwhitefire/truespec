# TASK-003 — the demo fleet (Task 9, for the owner's approval)

**Date:** 2026-10-13 · **Status:** ⬜ shown to the owner in full; **nothing is seeded until he approves**
**Authority:** TASK-003 Round 1 Q3 — *"the fleet is 15–18 cars, written by picking the better-documented cars
out of both lists and completing the gaps, shaped so the site looks full and every feature has something to
show."* Plus Round 2 Q3 (the demo marker) and the milestone ruling (the data is demonstration data).

## Why these cars

- **Picked from both lists, preferring the fully documented and already photographed.** The public seed's cars
  are documented end to end (brand, model, trim, year, km, state, naira price, was-price, arrival note, colour,
  **and three Unsplash photos each**); the office list's cars carry model, year, km, prices — but no photos.
  A car with no photo cannot show the media path this layer builds, so the fleet is drawn from the photographed
  set. The office-only models (Land Cruiser V8, Corolla, Tacoma, Hilux, Fortuner, Venza, Camry 2021) are
  **offered as an addition** — taking any of them means sourcing new photos for it.
- **The gaps completed:** no car in either list was in **Cleared**; the demo needed one, and one *was* given the
  state (TS-1017, a car that had arrived and cleared customs — consistent with its arrival note).
- **Mileage in kilometres**, one unit, stored and labelled once (`car.mileage` km). The office's miles figure
  retires with `office_car`.
- **The prices are the public list's doorstep prices** — naira, one number per car, no rate anywhere.

## The fleet — 17 cars

| ref | car | year | km | state (showroom section) | doorstep ₦ | was ₦ | arrival note | what it is there to show |
|-----|-----|------|----|--------------------------|-----------|-------|--------------|--------------------------|
| TS-1001 | Toyota Camry XSE V6 | 2021 | 31,000 | Available *(available)* | 34,500,000 | — | — | flagship sedan; carries the **oldest enquiry** (the year-mark notice) |
| TS-1003 | Lexus RX 350 F Sport | 2020 | 41,000 | Available *(available)* | 52,000,000 | — | — | premium SUV |
| TS-1005 | BMW X5 xDrive40i | 2021 | 34,000 | Available *(available)* | 88,000,000 | — | — | top of the range; the **imported PDF** enquiry points here |
| TS-1007 | Honda Accord Touring | 2021 | 29,000 | Available *(available)* | 38,000,000 | — | — | low-mileage sedan |
| TS-1008 | Toyota RAV4 Prime SE | 2022 | 12,000 | Available *(available)* | 45,500,000 | 50,900,000 | — | **Special ribbon** (crossed-out was-price) |
| TS-1011 | Mercedes-Benz C 300 AMG Line | 2018 | 71,000 | Available *(available)* | 29,500,000 | 33,000,000 | — | Special ribbon; the oldest car on the lot |
| TS-1012 | BMW X3 xDrive30i | 2019 | 58,000 | Available *(available)* | 41,000,000 | — | — | mid-size SUV |
| TS-1013 | Range Rover Sport HSE | 2021 | 0 | On the way *(on order)* | 115,000,000 | — | Expected November | arrival chip; a recent enquiry; one cost line unentered |
| TS-1014 | Porsche Macan S | 2021 | 0 | On the way *(on order)* | 96,000,000 | — | Expected December | arrival chip |
| TS-1018 | BMW X7 xDrive40i | 2022 | 0 | On the way *(on order)* | 128,000,000 | — | Expected January | **costs genuinely incomplete** — two lines not yet entered (not landed yet) |
| TS-1015 | Toyota Land Cruiser Prado VX | 2022 | 0 | At port *(on order)* | 92,000,000 | — | Expected January | the **At port** state |
| TS-1016 | Chevrolet Tahoe LT | 2020 | 0 | At port *(on order)* | 74,000,000 | — | Expected November | the At port state |
| TS-1017 | Ford F-150 Lariat | 2021 | 0 | Cleared *(on order)* | 68,000,000 | — | Expected November | **the completed gap — the Cleared state** |
| TS-1019 | Lexus RX 350 | 2019 | 64,000 | Landed *(landed)* | 44,500,000 | — | — | **new arrival** (this year's group) |
| TS-1020 | Honda CR-V EX-L | 2020 | 48,000 | Landed *(landed)* | 36,000,000 | — | — | new arrival |
| TS-1023 | Mercedes-Benz E 350 | 2020 | 39,000 | Landed *(landed)* | 48,000,000 | 52,500,000 | — | new arrival **and** Special ribbon |
| TS-1025 | Honda Civic EX | 2021 | 42,000 | **Sold** *(hidden from the showroom)* | 28,000,000 | — | — | **the sold car** — the `sale` row, the office's Sold state, a real sold figure |

**Shape check:** 17 cars · Available 7 · On the way 3 · At port 2 · Cleared 1 · Landed 3 · Sold 1.
Every office state has something; all three showroom sections look full; one sold car; three new arrivals; one
car with genuinely incomplete costs; three Special ribbons; five arrival notes.

## The enquiries the seed will write (Task 14)

1. **Chidi O.** — TS-1001, dated **more than 12 months ago** (so the year-mark notice has something to show).
2. **Aisha B.** — TS-1013, recent.
3. **The imported PDF enquiry** (Task 13) — TS-1005, plainly fictional (invented company, invented customer).

## The photos (feeds Task 10)

Every fleet car already has three ordered photos recorded in the store, each an `unsplash:<id>` token; TS-1025
(the sold car) has one. These are the source set Task 12 downloads and uploads. The manifest is written
separately (Task 10) once this list is confirmed.

## How this lands in the store (declared)

The store's content is defined by the **rebuild: drop → migrate → seed** (Task 20's benchmark). The rows that
exist today (25 cars, the previous seed's) are demonstration rows too: every one is marked `is_demo`, and the
demo wipe (Task 24) removes the demonstration in one move. Between the seed landing (Task 14) and the rebuild,
the store holds the old rows beside the fleet — a named interim, cleared by the rebuild, not silently.
