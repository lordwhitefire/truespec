# DEMO-001 copy review — approved

**Status:** APPROVED by the owner on 2026-10-26. The visible "Owner note" block was removed in
commit `57ff673`; the last-updated date is 26 October 2026 and the contact line uses the saved
WhatsApp number.
**Source of truth:** `app/office/sign-up/[[...sign-up]]/page.tsx` and
`app/(site)/privacy/page.tsx`. The privacy page inserts the saved WhatsApp number when one exists;
the text below marks those inserts as `{WhatsApp number}`.

## Sign-up page — exact copy

**Title:** Try the demo office

**First paragraph:** This is a demo account. Its data resets daily, around 03:00 UTC. Uploads are
deleted with the demo.

**Second paragraph:** The public showroom shows the main inventory, not the demo inventory.

**After Clerk's sign-up form:** Read the privacy notice.

The link goes to `/privacy`.

## Privacy notice — exact copy

**Title:** Privacy notice

**Last updated:** 26 October 2026

### The short version

This site collects almost nothing. The public showroom needs no account: you can browse without
signing in, and there are no analytics. You can choose an optional demo account to try the office.
If you do, the email you sign up with is used for signing in only; the demo’s data and uploads reset
daily, and the public showroom still shows the main inventory, not the demo’s. The one thing we keep
for every visitor is the record of a WhatsApp tap: which page, the car’s code and the time, and
nothing about you. When you contact us, that happens on WhatsApp, on your phone, with a message you
can read before you send it.

**Chips:** Showroom: no account · Optional demo account · No analytics · No ads or trackers

### What we store

- **Dark mode choice** — If you toggle dark/light, a tiny value called `ts-theme` is saved in
  `localStorage` in your browser. It is not sent to our servers.
- **A demo account** — If you choose one, the email you sign up with is held by our sign-in provider
  and recorded in the demo office so the office can show who is signed in. The cars, enquiries,
  settings and uploads you create in the demo office are stored there. Demo data and uploads reset
  daily; see Demo accounts below.
- **A main office account** — The main office is invitation-only. If you are invited, the email on
  that account is held by our sign-in provider and recorded in the main office for signing in.
- **A WhatsApp tap** — When you tap a WhatsApp link on a car, we record three things so the office
  knows that car was asked about: the page you tapped from, the car’s code and the time. Nothing
  about you: no name, no number, no message, no address.

### Demo accounts

The public showroom does not need an account. The demo office is a separate practice space: a demo
account can create cars, enquiries, settings and uploads there without touching the main office.

Demo data resets daily, around 03:00 UTC. Uploads are deleted with the demo. The public showroom
always shows the main inventory, never the demo inventory. A demo account does not grant access to
the main office; main access remains invitation-only.

### Email

If you create a demo account or are invited to the main office, the email you sign up with is used
for signing in only. We do not send marketing email. This application has no email channel of its
own: it sends no enquiry, marketing or notification email.

Our sign-in provider may send its own authentication messages as part of the sign-up you chose.
Those messages come from the provider, not from a marketing list.

### What we never collect

- No email address is required to browse the showroom. If you choose a demo or main office account,
  the email you sign up with is used for signing in only. If you send us an enquiry sheet, it may
  contain contact details you choose to include.
- No password material in this application. The sign-in provider handles passwords; this application
  never sees or stores them.
- No phone numbers unless you write one in a WhatsApp message or an enquiry sheet you send us.
- No cookies for tracking, advertising or analytics.
- No IP-address logs for marketing.
- No third-party trackers (no Google Analytics, Meta Pixel, etc).
- No marketing email.

### WhatsApp

Enquiries go to WhatsApp directly ({WhatsApp number}) . When you tap "Chat on WhatsApp", you leave
this site and open WhatsApp. WhatsApp is a separate service with its own privacy policy. Before you
leave, this site records that the tap happened — the page, the car’s code (when there is one) and the
time — and nothing else. We only see what you choose to send us in that WhatsApp chat.

If no number is saved, the page says “our WhatsApp directly” instead of the parenthetical number.

### How long we keep it

We store no browsing data beyond that tap record — no name, no number, no message, no address.
WhatsApp conversations are kept according to your WhatsApp settings and our normal business retention
for sales enquiries. We don’t keep copies of full lists of visitors.

Demo data and uploads reset daily, around 03:00 UTC. The demo office’s account record is reset with
the demo; the account itself is held by our sign-in provider. Main office records are kept as normal
business records. If you want an account removed, see Your rights.

### Your rights

If you sent us an enquiry and would like it removed, message us on WhatsApp ({WhatsApp number}) with
enough detail to identify it — for example the car’s code, or the number you wrote from. We will
remove the enquiry, and its imported sheet when no other enquiry or draft is using it. The tap
record — the page, the car’s code and the time, and nothing about you — stays.

If you created a demo account and want it removed, message us on WhatsApp with the email you used to
sign up. We will remove the account. Demo data and uploads are reset daily anyway. Depending on your
jurisdiction, you may have other rights; we’ll try to help.

### Who to contact

Questions about this notice: message us on WhatsApp.

**Pre-publication edit:** done in `57ff673`. The visible "Owner note" block is gone; the last-updated
date is 26 October 2026 and the contact line uses the saved WhatsApp number.

## What changed

- Removed the “no accounts” claim, the “No accounts” chip, and the “we don’t create user accounts”
  line.
- Added the optional demo account, its daily reset, upload deletion, and the main-showroom boundary.
- Added the sign-in-only email statement, the no-marketing statement, the application’s lack of an
  email channel, and the provider’s authentication messages.
- Kept WhatsApp as the only contact path; no `mailto:` and no invented email address.
- Corrected the sign-in page’s source comment and added the demo link only when
  `DEMO_SIGNUP_ENABLED === "1"`.
