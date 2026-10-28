## Purpose

Set measurable performance expectations for the public showroom so the car-buying pages stay fast on Nigerian mobile connections and do not regress silently.

## ADDED Requirements

### Requirement: Public pages have Core Web Vitals targets
The public home, inventory and car pages SHALL be measured against LCP ≤ 2.5 s, CLS ≤ 0.1 and INP ≤ 200 ms at the 75th percentile on a representative mobile connection. A release SHALL NOT knowingly worsen a metric beyond the target without a recorded owner acceptance.

#### Scenario: Car page is measured
- **WHEN** a car page is tested on the agreed mobile profile
- **THEN** LCP, CLS and INP are recorded and compared with the target

#### Scenario: Regression is visible
- **WHEN** a change pushes a measured metric beyond its target
- **THEN** the release note or performance report names the regression and the acceptance

### Requirement: Images are served at display size
Public car images SHALL be requested at a size appropriate to the layout, SHALL declare width and height or an aspect ratio to prevent layout shift, and SHALL lazy-load below-the-fold images. The 15 MB upload cap SHALL NOT mean a 15 MB image is served to a buyer.

#### Scenario: Mobile car card is not oversized
- **WHEN** the inventory is opened on a phone-width viewport
- **THEN** each card requests a transformed image appropriate to the card and reserves its space before the image loads

#### Scenario: Missing image does not shift layout
- **WHEN** a car image fails to load
- **THEN** the placeholder occupies the same space and the page does not jump

### Requirement: Fonts do not block the showroom
The public site SHALL load its fonts with a strategy that avoids a render-blocking third-party request, and SHALL provide a usable fallback when a font request fails.

#### Scenario: Font request fails
- **WHEN** the font stylesheet is unavailable
- **THEN** the page remains readable with the fallback font and no invisible text

#### Scenario: Font payload is bounded
- **WHEN** the public pages are loaded
- **THEN** only the weights the page uses are requested

### Requirement: Caching and third-party scripts are deliberate
The project SHALL record the cache policy for public pages and the list of third-party scripts. A public page SHALL NOT be uncached by accident, and a new third-party script SHALL be reviewed for weight, privacy and consent before release.

#### Scenario: Cache policy is stated
- **WHEN** a public page is deployed
- **THEN** its cache/revalidation behavior is recorded and matches the architecture's freshness requirement

#### Scenario: New script is reviewed
- **WHEN** a third-party script is added
- **THEN** its purpose, weight, privacy effect and consent position are recorded before release

### Requirement: Bundle weight is watched
The project SHALL provide a bundle-size report or analyzer command and a documented budget for the public showroom. A change that exceeds the budget SHALL be justified in the release note.

#### Scenario: Bundle report exists
- **WHEN** a developer runs the documented bundle command
- **THEN** it reports the public route sizes and the configured budget

#### Scenario: Budget breach is explained
- **WHEN** a public route exceeds its budget
- **THEN** the release note names the cause and the accepted trade-off
