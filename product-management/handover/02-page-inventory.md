# 02 — Page inventory (read-only walk of the running build)

Source: `http://127.0.0.1:3210`, walked over CDP in the existing signed-in tab, 2026-10-23.
Screenshots captured for verification only; the guide itself is text-only by the owner's decision.
Raw data: `raw-inventory.json`, `raw-inventory-detail.json`.

Every page below was seen. Nothing in the guide is inferred from source that was not also visible on screen.

---

## Public showroom (`/(site)`)

| Route | Screen | What it is for | Key controls seen |
|---|---|---|---|
| `/` | Home | Presents the business and a handful of cars; starts a conversation | Hero, three editorial lines ("New on the lot", "Next to land", "Biggest drop"), featured car cards, "Chat on WhatsApp", one-tap "What are you after?" panel (A family SUV / A saloon / Something I haven't listed yet / Skip) |
| `/inventory` | Inventory | Browse all stock | 19 cars; filters STATUS (Available 13 / On Order 6 / Landed 3), MAKE, YEAR, COLOUR, PRICE (₦); search options; sort (Newest, Price low→high, Price high→low, Year newest); pagination |
| `/car/[ref]` | Car page | One car in full | Photo gallery (1/3), Overview / Features / Delivery tabs, doorstep price, "Chat on WhatsApp", "Book a viewing" (available) or "Reserve this car" (on order), "Share this", related cars |
| `/privacy` | Privacy notice | What is stored and what is not | Static text; "Last updated 23 October 2026" |
| `/not-found` | Not found | Fallback | — |

Public pages carry the same header (TRUESPEC, "Imported from the USA", "Delivered anywhere in Nigeria", WhatsApp number, chat hours) and footer.

## Office (`/office`)

| Route | Screen | What it is for | Key controls seen |
|---|---|---|---|
| `/office/sign-in` | Owner sign in | The only door | Clerk email + password. No public sign-up (invite only). Forgot-password lives here |
| `/office` | Dashboard | The state of the business at a glance | Money tied up, projected profit, real profit (sold), Available / On order / Landed counts, recent activity, recent WhatsApp taps, "Add a car" |
| `/office/inventory` | Inventory | Every car, its cost and its profit | Tabs All 27 / Available 17 / Landed 3 / On Order 6 / Sold 1; sort; 10/25/50/100 per page; columns Car, State, Price, Cost, Profit, Actions; "Car template"; "Create from file"; "Add a car"; "Costs incomplete" links |
| `/office/car/new` | Add a car | Create a listing | 5 sections: 1 The car, 2 Photos, 3 Costs — never leaves the office, 4 State, 5 Private notes; "Autofill from PDF"; live landed cost; "What the buyer sees" preview; Save car; Cancel |
| `/office/car/[ref]` | Edit car | Change a listing, sell it, delete it | Same form plus "Mark as sold" (sale price + date), "Delete" with Undo, "Preview the buyer page" |
| `/office/drafts` | Drafts | Review what came out of an uploaded file before it becomes a record | Batches per file; car and enquiry drafts; Edit; "Save as a car" / "Save as a enquiry"; Delete / Remove for good |
| `/office/drafts/car/[id]` | Edit car draft | Correct a draft before saving | Same car form + "Save as draft" |
| `/office/drafts/enquiry/[id]` | Edit enquiry draft | Correct a draft before saving | Name, Phone number, Asked for, Note, Where this enquiry is; "Save as draft" / "Save enquiry" |
| `/office/enquiries` | Enquiries | The customer board and the WhatsApp tap list | Tabs Enquiries / Taps; board columns New / Talking / Negotiating / Sold / Lost; card actions WhatsApp them, Call, Edit; "Enquiry template"; "Create from file" |
| `/office/enquiries/[id]/edit` | Edit enquiry | Change a saved enquiry | Same five fields + state. Reached from a card's Edit action (the route takes the row id) |
| `/office/activity` | Activity log | Who changed what, when | Filters All 118 / Added 36 / Edited 12 / State 3 / Sold 3 / Deleted 51 / Restored 13 / Imports 0 / Settings 0; entries cannot be edited or removed |
| `/office/settings` | Settings | The few things the whole site runs on | Tabs General / Car states / Customer states / Account. General: WhatsApp number, tagline (80 chars), full tank default. Copy states the demonstration ships with a placeholder number |
| `/office/account` | Your account | Password and identity | Password is held by the sign-in provider; recovery happens at the sign-in screen |

## Behaviour worth knowing for the guide

- The office shell shows **Signed in as `<email>`**, a theme toggle, Sign out, and a WhatsApp-tap notice.
- Desktop navigation is a sidebar; on a phone it becomes a bottom bar: **Home, Stock, Add, Chats, More** — and More opens **Drafts, Activity log, Settings**.
- `/office/car` redirects to `/office/inventory` (the sidebar's "Add / edit car" actually points at `/office/car/new`; the redirect only catches a typed URL).
- `/office/settings` failed to load once on first visit ("We couldn't load this / We tried a few times but the server didn't answer") and loaded normally on retry. Recorded as a flake, not reproduced.
- Saving a car publishes it to the showroom immediately. There is no separate publish step.
- Costs, profit and private notes are described on screen as never leaving the office; the add form shows a live "What the buyer sees" panel that excludes them.
