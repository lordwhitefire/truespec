# LAUNCH-001 Task 13 — terms draft (owner approval required)

**Status:** draft only. `/terms` does not exist yet; nothing is published; E1 is
`NOT RUN — owner approval`. If approval is later than 27 October 2026, the last-updated and reviewed
dates move to the approval date.

## Proposed page copy

**Terms of service**

Last updated: 27 October 2026

Owner: TrueSpec Automotive · Reviewed: 27 October 2026

**The short version**

- Showroom, not a checkout
- One doorstep price in naira
- The sale is agreed on WhatsApp
- Nigerian law (Lagos)

**On this page:** What this site is · Availability · Prices · The WhatsApp sale · Delivery ·
Condition and information · Liability · Governing law · Contact

### What this site is

TrueSpec Automotive is a Nigerian vehicle-import showroom. This site shows the cars we have, the
cars we have on order and the cars that have landed. It is a showroom, not a checkout: no payment is
taken on this site. The private office is for TrueSpec; the public pages are the showroom, inventory
and car pages linked here.

### Availability

Each car page shows the car’s current state: available, on order or landed. Availability can change.
A car can be sold or reserved while you are looking. We do not hold a car for you until we agree it
in the WhatsApp conversation. If a car is no longer available, we will tell you and help you find
another.

### Prices

Prices are shown in Nigerian naira (NGN). The price on a car page is the current doorstep price:
shipping, clearing and delivery to your door in Nigeria are included. Prices may change. The price
we agree in the WhatsApp conversation is the price for that sale. We do not add a separate delivery
charge at the door.

### The WhatsApp sale

The site is a showroom, not a binding sale. When you tap “Chat on WhatsApp”, you leave this site and
open WhatsApp. A WhatsApp conversation is not a binding sale until you and TrueSpec agree the car,
the price and the delivery. The messages you send are yours; the privacy notice explains what the
site records.

### Delivery

We deliver to your door anywhere in Nigeria. Delivery is included in the price. Timing depends on
the car’s state: an available or landed car can be delivered sooner; an on-order car is shipped from
the USA and cleared at the port first. We will confirm the expected timing in the WhatsApp
conversation. The car is delivered fully cleared with the requirements completed.

### Condition and information

We describe each car from the records and photos we have. Condition, mileage, features and colours
are shown in good faith; minor differences can occur. Ask us for the current photos and details
before you agree. The car is sold with the condition and terms we agree in the WhatsApp conversation.

### Liability

We do not exclude liability that cannot be excluded by law. Beyond that, the site is provided as it
is, and we are not liable for indirect losses arising from the site or from a car before a sale is
agreed. The terms of the sale are the ones we agree in the WhatsApp conversation.

### Governing law

These terms and any sale are governed by the laws of the Federal Republic of Nigeria. The courts of
Lagos State have jurisdiction.

### Contact

Questions about these terms: message us on WhatsApp (the saved public number).

## What will be wired after approval

- `/terms` page with `pageMetadata` (title, description, canonical, OG/Twitter) and the copy above.
- Last-updated and owner/review record on the page; `lib/site.ts` gets the date constant.
- A `Terms of service` link in the shared public footer (home, inventory, car, privacy, not-found).
- `/terms` added to `sitemap.xml` and `llms.txt`; the two runtime checks that assert terms absence
  are updated to assert the link.
- Runtime E1 (terms render), E2 (footer links on home/inventory/car) and E6 (owner and date) on the
  local production build. E1 stays `NOT RUN — owner approval` until this draft is approved.

## Open points for the owner

- **Seller:** “TrueSpec Automotive”. No registered company name or RC number exists in the repo. If
  you want a registered name/RC shown, send it; otherwise the page uses the trading name.
- **Liability paragraph:** a plain default. Edit or remove it if you prefer.
- **Date:** 27 October 2026 unless approval is later; both the last-updated and reviewed dates move
  together.
- **Contact:** the saved public WhatsApp number; no email address and no self-service channel.
- **Privacy page:** Task 14 adds its owner/review record; this draft does not change privacy.

## Approval

Reply **approve**, **edit**, or **hold**. Do not push `/terms` before approval.
