# 04 — Requirement vs build: what changed, and why

Baseline: `demo_product.pdf`, 5 pages, *"TrueSpec Automotive — Secure Inventory Website (Build Spec)"*.
Build: `https://truespec-k4y6.vercel.app/`, walked read-only on 2026-10-23.

This log feeds the guide's closing section and the note. It states what the brief required, what shipped,
and the reason for every deliberate difference. **It does not claim the brief required RLS** — RLS is one
mechanism; the brief required the outcome.

---

## Met as written

| Brief | Shipped |
|---|---|
| Public site anyone can browse, no login, no write access | `/`, `/inventory`, `/car/[ref]`, `/privacy` — anonymous |
| Admin backend, single owner, server-verified login, no client-side PIN | `/office`, Clerk email + password, invite-only, no public sign-up |
| Sensitive financial data never retrievable by the public — UI, API, dev tools | Server-side session checks on every office route; database-level enforcement; an allow-list serializer; `npm run leak-check` tests the public API for forbidden fields |
| Public fields / admin-only fields split at database and API level | Split exists in the schema and in the serializers; the add form's "What the buyer sees" panel demonstrates the boundary |
| Public API uses an explicit allow-list serializer | Implemented; the leak-check enumerates forbidden identifiers and naira cost values |
| Admin routes reject unauthenticated requests at the server | `/office/*` redirects to `/office/sign-in`; `requireOfficeSession` on every page and layout |
| Rate-limited login, hashed credentials | Held by Clerk (a provider the brief named); the application never stores a password |
| All admin actions logged with a timestamp | Activity log: 118 entries, filterable, not editable or removable |
| Home with hero, logo, tagline, prominent WhatsApp CTA | Present |
| Three browsable sections: Available / On Order / Landed | Present as status filters on `/inventory`; counts shown (13 / 6 / 3 at time of walk) |
| Listing card → detail with gallery and features | Present; gallery, Overview / Features / Delivery |
| WhatsApp button on every listing, pre-filled with that vehicle | Present; "Chat on WhatsApp" on each car page |
| Fully responsive, reflowed not shrunk | Present; desktop sidebar becomes a bottom bar on a phone |
| Full CRUD, three statuses | Present; plus Sold |
| Multi-photo upload | Drop or browse, first photo is the cover, up to 15 MB each |
| Cost breakdown with live landed cost and profit | Present: "Landed cost — live" recalculates as you type |
| Summary view: count, total landed cost, projected profit | Dashboard: money tied up, projected profit, real profit (sold) |
| Settings: WhatsApp number, tagline, full tank default | Present, plus car states, customer states, account |
| Dark charcoal / gold / WhatsApp-green, Oswald + Inter, logo top-left | Present |
| Typed language, server-side validation, explicit error states | TypeScript; server actions validate; the office has explicit failure states ("We couldn't load this… Nothing was lost") |
| Four named automated tests | 50 test files in `lib/`, including the four risk paths |
| Deliverable 1: live deployed site | `https://truespec-k4y6.vercel.app/` |
| Deliverable 2: separate `/admin` login route | Shipped as `/office` — see deviation 1 |
| Deliverable 3: brief documentation on login, adding a listing, settings | This handover |

## Deliberate deviations

1. **`/admin` became `/office`.** The business calls its back room the office; the word appears in the
   product, the navigation and the sign-in screen. Route name only — the separation the brief required
   (separate, authenticated, server-checked) is unchanged.
2. **Three public sections became one Inventory page with status filters.** The brief asked for three
   browsable tabs; the build gives one catalogue with STATUS as a filter and the three counts visible.
   Reason: a buyer comparing cars should not have to remember which tab a car was in, and a car that
   moves from On Order to Available should not require the buyer to find it again.
3. **Enquiries were added — the brief did not ask for them.** The brief stopped at "WhatsApp button".
   A button tells the owner nothing. The build records *that* a tap happened and on which car, and gives
   him a board for the names and numbers that follow. This is the largest addition and the one most
   likely to change his week.
4. **Drafts were added.** A filled PDF becomes draft rows, reviewed before anything becomes a record.
   Reason: a spreadsheet read straight into live inventory is a data-entry accident waiting to happen.
5. **Sold, and real profit, were added.** The brief asked for projected profit. The build also records
   the sale price and shows what was actually made.
6. **Car and customer states are editable.** The brief fixed three statuses. The build keeps the four
   car states fixed but lets the owner add, rename, recolour and reorder customer states, and edit the
   secondary car states. Reason: his sales vocabulary is his.
7. **Public extras:** the one-tap "What are you after?" panel, the three editorial lines on the home
   page, "Share this", and the returning-visitor greeting. All serve the brief's actual goal — a buyer
   starting a conversation — without changing the data boundary.
8. **Activity log is visible as a screen.** The brief required logging; it did not require the owner to
   be able to read it. Exposing it makes the requirement useful.

## Known gaps — stated, not hidden

1. **No automatic image compression or resizing.** The brief asked for it. Photos are accepted up to
   15 MB each and stored as uploaded; the code comments record the omission deliberately ("Resizing
   would be a pipeline v1 does not have"). Large photos mean slower pages and more storage. This is the
   one brief item not delivered, and the guide says so in plain language rather than letting him
   discover it.
2. **No email or push notification.** Not in the brief. An enquiry only appears when he opens the office.
3. **`/office/settings` failed to load once** on first visit and loaded on retry. Not reproduced;
   recorded for the owner, not mentioned to the client.
4. **The catalogue reads "Add / edit car" in the sidebar and lands on the add form.** A typed
   `/office/car` redirects to Inventory. Harmless, but worth a one-line fix later.

## Two things the owner must confirm before sending

1. **Which database the Vercel deployment points at.** If it still points at the throwaway Neon branch,
   the client can enter real stock into a store that will be discarded. The guide calls the visible cars
   "sample stock"; if the branch is temporary, the note needs one more line saying so.
2. **The WhatsApp number is a placeholder** — `+2348146927170`, and Settings says so on screen. The
   guide makes replacing it the first task, because until it is replaced every chat button on the site
   points at a number that is not his.
