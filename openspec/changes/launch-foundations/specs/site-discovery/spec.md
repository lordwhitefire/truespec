## Purpose

Make the public showroom correctly discoverable by search engines and AI readers, with accurate metadata, canonical URLs, crawl rules, sitemaps and structured vehicle data.

## ADDED Requirements

### Requirement: Public pages carry complete metadata
Every indexable public page SHALL declare a unique title, a description, a canonical URL, and Open Graph and Twitter card metadata. The metadata base SHALL be the production origin, so no canonical or social URL is relative.

#### Scenario: Home page metadata
- **WHEN** a crawler or link preview requests the home page
- **THEN** the response contains a title, description, canonical URL, Open Graph title/description/image and Twitter card metadata

#### Scenario: Car page metadata
- **WHEN** a car page is requested
- **THEN** its title names the year, make and model, its description includes the public price and mileage, and its Open Graph image is the car's cover photo or the site default

#### Scenario: Inventory metadata
- **WHEN** the inventory page is requested
- **THEN** it has a title and description that describe the current stock and a canonical URL that excludes filter, sort, view and page parameters

### Requirement: Crawl rules protect private surfaces
The site SHALL serve a `robots.txt` that allows the public showroom, points to the sitemap, and disallows the office, API routes and authentication surfaces. The rule SHALL NOT rely on `robots.txt` as an access control.

#### Scenario: Robots request
- **WHEN** `/robots.txt` is requested
- **THEN** it returns a plain-text rule set that allows public showroom paths, disallows `/office/` and `/api/`, and names the sitemap URL

#### Scenario: Office page is not indexed
- **WHEN** a search engine requests an office route without a session
- **THEN** the response is not a successful public page and the route is excluded from the sitemap

### Requirement: Sitemap lists only public, current cars
The site SHALL serve a sitemap containing the home, inventory, privacy, terms and every currently public car. Sold, deleted, draft and not-yet-listed cars SHALL NOT appear. The sitemap SHALL use absolute production URLs and a last-modified value where one is known.

#### Scenario: Sitemap contains live inventory
- **WHEN** `/sitemap.xml` is requested
- **THEN** it lists the public static pages and every car that is currently listed, and each car URL is absolute

#### Scenario: Sold car leaves the sitemap
- **WHEN** a car is marked sold or deleted
- **THEN** its URL is absent from the next sitemap response

### Requirement: llms.txt gives AI readers the public truth
The site SHALL serve a plain-text `llms.txt` that names the business, the public pages, the inventory, the currency and the WhatsApp contact rule. It SHALL NOT expose office data, private notes, costs, customer data or an invented phone number.

#### Scenario: llms.txt is readable
- **WHEN** `/llms.txt` is requested
- **THEN** it returns plain text with a short description, links to the home, inventory, privacy and terms pages, and the current public contact rule

#### Scenario: No private value leaks
- **WHEN** the `llms.txt` response is scanned for cost, profit, private note, customer and office terms
- **THEN** none of those values appears

### Requirement: Car pages carry vehicle structured data
Each public car page SHALL include JSON-LD describing a `Vehicle` with its public make, model, year, mileage, colours, price, currency, availability, seller and image. The structured data SHALL use only fields already exposed on the public page.

#### Scenario: Available car structured data
- **WHEN** an available car page is requested
- **THEN** its JSON-LD has `@type` Vehicle, a price in NGN, an availability value and the public seller identity

#### Scenario: Sold car is not offered
- **WHEN** a sold car URL is requested
- **THEN** it does not present the car as available and does not emit an available `Offer`

### Requirement: Indexing rules match the public surface
The site SHALL define which URLs are indexable, which are canonicalised and which are excluded. Filtered inventory URLs SHALL canonicalise to the inventory page. Office, API and authentication routes SHALL be excluded. A page that returns a not-found status SHALL NOT be indexable as a normal page.

#### Scenario: Filtered inventory canonicalises
- **WHEN** the inventory is opened with status, make, price or sort parameters
- **THEN** the page declares the unfiltered inventory URL as canonical

#### Scenario: Unknown car is not indexed
- **WHEN** an unknown car reference is requested
- **THEN** the response is a real not-found status and the page is not presented as an indexable car
