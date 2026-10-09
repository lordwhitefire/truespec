# TrueSpec Automotive — Product Design Recommendation

**Status:** recommendation, not a decision. Nothing here has been built. Whoever owns this decides what lands.

**Prepared:** 2026-10-03
**Method:** CIRCLES (Comprehend · Identify · Report · Cut · List · Evaluate · Summarize)
**Source:** `demo_product.pdf` (5pp build brief) + owner answers in session
**Scope note:** the agent that wrote this recommends. It does not build, deploy, or modify anything.

---

## The brief in one paragraph

A vehicle import business advertises cars on Instagram; enquiries arrive by WhatsApp DM. The brief asks for a two-sided web app — a public showcase plus a private admin dashboard — with a hard server-side split between public fields (brand, year, mileage, price) and admin-only financial fields (purchase price, shipping, clearing, profit). Conversion path is a WhatsApp deep link with a pre-filled message.

**Two facts stated by the owner, which change the product materially:**

1. **The output is a working prototype handed to a client who will *use* it.** Not a screenshot deck, not a mockup. Real auth, real database, real field split. **Only the vehicle data is fake.**
2. **The goal is marketing** — attract real car buyers and turn them into WhatsApp conversations.

---

## C — Comprehend

### Goal

**Marketing.** The site exists to produce the conversation it is built around: a real buyer, on their own phone, choosing to message the seller about a specific car.

Not cost reduction. Not inventory management. Not "a system that records cars." Those are by-products.

### Metric this goal implies

A WhatsApp conversation started from the site, where the buyer's first message does **not** ask for information the page already displays.

The second clause is what makes it a real metric. "Did they message?" proves only that a button exists.

### Constraints

| | |
|---|---|
| Builder | The owner, solo |
| Delivery | To a client, who then operates it |
| Budget / deadline | **Not stated** — see unknowns |
| Hard requirement | Financial fields must never reach a public client, under any circumstance |

### Context

- **How it works today:** Instagram posts, WhatsApp DMs. Car may have sold weeks ago; buyer cannot tell.
- **What the buyer does instead:** opens the listing in a DM thread. That thread now holds both information *and* negotiation, and the buyer entered it knowing less than the seller.
- **Competing for the same job:** WhatsApp catalogue messages, Facebook Marketplace, car-dealer sites, and the seller's own Instagram grid.

### Assumptions carried (owner did not state these)

1. The prototype replaces an informal process, not shipped software. **Greenfield.**
2. Single admin account. The client becomes that account.
3. Cars are added one at a time by a non-technical operator.
4. Costs cross two currencies — USD at source, NGN on the local leg. *(inferred from the brief's cost fields, not stated)*
5. No deadline was given, so nothing below is time-boxed.

---

## I — Identify

### Chosen cohort

**A buyer on a phone, in the evening, who tapped through from an Instagram story or a group chat.**

- **Context:** one hand, phone, at home. No prior relationship with the seller. Expects to be walked into a sales conversation.
- **Friction:** **they cannot learn anything without starting the very conversation they are afraid to start.** Price, year, mileage, colour, availability — all of it sits behind "send me a message."

### Why this cohort

It is the only group whose conversion the metric counts, and its friction is terminal: unaddressed, the buyer either drifts away or enters the haggle from the weak position. Every other group is downstream of this one working.

### The other side — named, not ignored

**The client-operator in the admin dashboard.** Explicitly acknowledged because the owner confirmed a client will use it, which promotes the admin from a back-office afterthought to a first-class surface. Design consequences are in **C — Cut** and **L**.

A further audience exists and is treated as a stakeholder, not a cohort: **anyone the client shows the prototype to** — a partner, an investor. This is why link previews (OG tags) are in scope: the prototype's own marketing surface.

---

## R — Report

### Primary need

> As a buyer on a phone, I want to judge a car completely on my own — price, year, mileage, colour, condition, availability — so that I can decide whether it is worth talking to the seller, and start that conversation from a position of knowing rather than asking.

**Stated as inferred.** No buyer was interviewed. This is inferred from the brief's structure and from how this category of site fails. It is a hypothesis, and confidence here is inherited by everything downstream.

### Supporting needs

| | Need | Whose |
|---|---|---|
| **N2** | As an operator, I want to enter a car and its true costs and have the profit be right, so I never list a price I cannot afford to sell at. | client-operator |
| **N3** | As the business, I want a link that looks professional when it lands in a chat, so the message that carries it lands too. | business |
| **N4** | As an operator, I want a car to stop advertising itself once sold, without losing it from my totals. | client-operator |

### Wants, separated from needs

The brief names mechanisms where it means needs. Recorded so they are not mistaken for requirements:

| Stated in brief | Actually a… |
|---|---|
| "allow-list serializer" | a **mechanism** for N1's sibling — the security guarantee |
| "WhatsApp button, pre-filled" | a **wont** for the conversion mechanism |
| "row-level security" | a **mechanism**, offered as an alternative |
| "live-calculated profit as you type" | a **wont** for N2 |

Mechanisms are decided in **L**, not inherited as requirements.

---

## C — Cut

### Axes (fixed before ranking)

1. **Frequency** of the pain
2. **Acuteness** — what it costs when it happens
3. **Alignment with the marketing goal**

### Ranking

| Need | Frequency | Acuteness | Alignment | Verdict |
|---|---|---|---|---|
| **N1** buyer can judge alone | Every visit | High — buyer drifts or haggles blind | **Total** — it *is* the conversion | **CHOSEN** |
| **N2** correct cost & profit | Per car | High — wrong profit = wrong price | Partial — enabler | Cut to first version, simplified |
| **N4** sold cars stop advertising | Per sale | Medium | Partial | Cut to a single status field, no history |
| **N3** professional shareable link | Per share | Medium | High | Kept — near-zero cost |

### The cut, stated out loud

**Chosen: N1.** Reason: it is the only need whose failure is terminal. If the buyer cannot judge the car unaided, no amount of polish elsewhere matters — the WhatsApp button becomes the trap it was meant to replace. N2, N3 and N4 are all means to N1.

### What is being given up

Refused, by name, with reasons:

| Cut | Reason | Consequence accepted |
|---|---|---|
| **FX conversion engine** with historical rates | No stated need; a configurable rate + timestamp satisfies N2 | If the naira moves sharply, historical profit figures are approximate. **Accepted** — the client is tracking current cars, not doing accounting. |
| **Audit log / full change history** | One operator, one account | "Who changed this, when" answered by a single `updated_at` + `updated_by`. **Accepted** — no dispute resolution needed with one user. |
| **Bulk / CSV import** | Cars added one at a time | Slow initial data load. **Accepted** — 20 seed cars by hand is tolerable and makes the data look real. |
| **Multi-admin, roles, invitations** | Brief says single user | Cannot onboard a second operator later without a migration. **Accepted.** |
| **Search, filters, sorting** | Not in brief; a later convenience | Buyers browse a small inventory. **Accepted** — revisit above ~40 cars. |
| **Financing calculator, comparison tool, "notify me"** | Not in brief, invented while widening the space | — |

---

## L — List

Options for **N1** only. Differ in kind, not size.

### Option A — "Everything above the button" *(quick win, narrow)*

Keep the brief's structure. Make the listing card and detail sheet carry every buyer-relevant field — price, year, mileage, both colours, status — so nothing requires asking. WhatsApp button unchanged.

- **Addresses N1 by:** removing the specific gaps. Cheap, fast, low risk.
- **Does not address:** the *feeling* of the trap. Still a page with a button.

### Option B — "The gallery is the decision" *(core bet)*

Invert the detail view into a full-screen, image-first, swipeable experience. The car is the product; the page is a showroom floor. Price and key facts are persistent but understated. **The WhatsApp button stays quiet until the buyer has swiped the gallery** — it is the last step, not the first.

- **Addresses N1 by:** making the buyer *want* to stay and judge rather than reach for a shortcut. Replaces the ambush with seduction.
- **Risk:** image weight. This is also the option most likely to die on Nigerian mobile data during a live demo.

### Option C — "Hand off warm" *(longer horizon)*

The WhatsApp message carries the listing ID and what the buyer was looking at. The seller opens the chat already informed, and the buyer gets a one-tap "Is this still available?" The handoff goes from cold to warm in both directions.

- **Addresses N1 by:** removing the reason to *not* click — the fear that starting a chat commits them to a haggle.
- **Cost:** near zero. **Risk:** `wa.me` deep links and message prefills have platform length and encoding limits; it fails quietly if the message gets long.

### Discarded while widening the space

Filter/sort system · financing calculator · compare two cars · "notify me when a similar car arrives" · blog/specs section · enquiry form alongside WhatsApp · saved-cars list · share-to-facebook.

---

## E — Evaluate

Axes fixed before reading: **viable**, **lovable**, **cost/time**, **risk of visible failure**. Feasibility is a floor, not a discriminator.

| | **A — Everything above the button** | **B — The gallery is the decision** | **C — Hand off warm** |
|---|---|---|---|
| **Viable** | Yes, trivially | Yes — but only if images are actually compressed | Yes — near-zero marginal cost on top of A or B |
| **Lovable** | Fits, unremarkably — it is still "a website with a button" | Fits hard — they already live in a phone photo gallery | Fits — zero added steps for the buyer |
| **Cost / time** | Lowest | Highest — full-bleed gallery, swipe handling, image pipeline | Lowest |
| **Risk if it fails** | Looks fine; just doesn't persuade | **Loud** — fails on a slow connection, in front of someone | **Quiet** — deep link opens, message is empty or truncated |
| **Drawbacks (including the favoured)** | Cannot be differentiated from any other car site; leaves N1 half-solved | **Builds the hardest failure mode into the hero surface.** Heavy JS, layout shift, weak devices. Needs hard performance budgets, not good intentions. | Requires the operator to actually read the ID prefix or it adds noise; WhatsApp link limits are a real ceiling |

**Short vs long term.** A is fast and permanent — it never becomes more persuasive. B costs more now and is the only option that makes the site *memorable*, which is what marketing is for. C's value compounds because every message arrives pre-qualified.

**The favoured option's own risk:** B puts the highest-stakes surface on the thing most likely to break on the audience's actual hardware and network. That risk is real and is not dismissed below.

---

## S — Summarize

### Recommendation

**Build Option B as the spine, adopt Option C as a rider, treat Option A as the baseline already implied by B.**

Concretely, argued for:

1. **Detail view as full-screen swipeable gallery**, with price, year, mileage and status persistent and understated. This is the answer to N1 — it lets a buyer judge without asking.
2. **The WhatsApp button is deliberately not the loudest thing.** It stays quiet on the first screen and becomes the obvious action once the buyer has swiped through. *(This overrides the brief's design section, which specifies a "prominent" WhatsApp button — see objections.)*
3. **Carry the listing ID in every WhatsApp message** (Option C). Near-zero cost, and it is what makes the client-operator feel the product is real the first time he receives a message.
4. **N2 settled:** every cost is stored at the rate that was true *when that cost happened* — amount, currency, and its own rate on each line. There is no single global rate. All money is held in **integer minor units (kobo/cents)**, never floats, and profit is computed **server-side only**. Underwater cars show a negative profit rather than being clamped to zero. *(Superseded: the earlier single-configurable-rate version. See "Money is stored per payment, not at a global rate".)*

### One metric

**Measurable without analytics, without a baseline, and without knowing anything about the business:**

> **Count the WhatsApp messages that arrive carrying a listing ID.**
>
> A view that becomes a conversation shows up as a message beginning with something like `[TS-1042]`. That number, over a period, is the conversion rate — and it needs no instrumentation, no tracking code, and no knowledge of how many DMs the business took before.

**Where a baseline would help, ask the client for one optional number:** "roughly how many buyers message you in a month today?" If they know, the metric strengthens to a before/after comparison. If they don't, the count above stands on its own.

This works only because recommendation (3) puts the ID in the message. **The measurement rides on the feature** — which is why it survives having no analytics budget and no access to the business's history.

### Trade-off, named

**This costs a leaner build.** Option B costs meaningfully more engineering time than A, adds an image pipeline with real failure modes, and puts the most fragile surface at the front of the funnel. In exchange: a site that is defensible and persuasive rather than merely adequate.

Also given up, from the Cut: FX accuracy across time, audit history, bulk import, multi-user support.

### Link back to the goal

Every element serves **marketing**. B because persuasion is the goal. C because a pre-qualified message is what makes the conversion the client actually wants. The deliberately quiet WhatsApp button because the goal is a *conversation*, and a buyer pushed into one too early is the failure the whole product exists to remove.

### Anticipated objections

**"The brief says prominent WhatsApp button."**
It does — and it should be prominent *once the buyer is interested*. Prominent from the first pixel rebuilds the ambush in nicer lighting. This is the recommendation overriding the brief, deliberately. If you disagree, that is a legitimate call to make against my advice.

**"Won't this be slower to build?"**
Yes, versus A. B costs roughly the difference between a polished brochure and a showroom.

**"Isn't a prototype supposed to be cut short?"**
Cut short on *hardening* — yes. Not cut short on the surfaces the client will touch. The client operates the admin and views the gallery; those are the product from their side.

### What I do not know

- **No real baseline.** I have no figure for how many DMs the client gets today. The metric needs one, and it is the first thing to establish.
- **No user research.** N1 is inferred from the category, not reported by a buyer. If even three buyers are asked, this document should be rewritten.
- **No deadline or budget**, so nothing here is time-boxed.
- **Whether the client is technical.** If they are not, the admin's error handling and empty states carry more weight than assumed.

---

## Decisions taken

Settled with the builder. Recorded so the reasoning survives.

### Storage split — four vendors, one job each

| What | Where | Why |
|---|---|---|
| **Car records, costs** | **Neon** (Postgres) | The brief's structured data, and the admin needs relational queries for the profit column |
| **Accounts and sessions** | **Clerk** | Auth — sign-in and sessions. The 7-day cap is Clerk's default setting; the 12-hour inactivity timeout is enforced in our own code, which is what the spec already required |
| **Images** | **Sanity** | Its image pipeline handles resize, compression and format conversion server-side. Removes the single largest demo risk — image weight on mobile data — without writing image-processing code |
| **Enquiry PDFs** | **Sanity** | Owner's ruling, 2026-10-08: PDFs join the vendor that already holds the images. Office-only, never public-read |

*Supabase was the original single vendor for data, auth and storage. It is out — free accounts are capped at 2 projects, which TrueSpec cannot fit under. Stack ruling recorded in `planning-close.md` **A8**.*

**Do not use Sanity Studio as the admin.** The brief requires a custom admin where costs are entered and profit is computed live. Studio would be a second admin the client could find, without cost fields. Use Sanity strictly as asset storage plus its image CDN.

**Cost of this choice:** four vendors, four sets of credentials. All four sets must be present in deployment env vars (§J) or the site builds locally and breaks for the client.

**What it buys:** responsive images become nearly free. Request width and format at the URL level rather than shipping full-resolution originals:

```
?sanity/image?url=<asset>&w=800&fm=webp&q=75&auto=format
```

Serve a small width for the grid, a larger one for the full-screen gallery, and let `auto=format` serve AVIF or WebP to whatever phone is asking. **This is what lets 100 photos per car exist without 100 photos ever loading.**

### Inventory filtering — a dropdown, not shifting tabs

Cars are found by **one filter dropdown** at the top of Inventory: *All*, plus each of the three groups, plus *Sold*, plus any custom states that currently have cars in them.

Not a second tab bar that grows and shrinks as the owner adds states. A mutating layout means every addition reshuffles the controls he is trying to use, and the owner would have to redesign Inventory around his own labels. A filter gives the same power — pick "Held for payment", see those cars — while the page itself never moves.

**Custom states never appear on the dashboard**, which stays fixed regardless of what the owner adds.

### A state in use cannot be deleted

Only states attached to no car and no enquiry may be removed. In use → blocked, with the reason shown.

### Money is stored per payment, not at a global rate

**There is no dollar rate in Settings.** Each cost line carries its own amount, its own currency (naira or dollars), and **the rate used for that payment**, showing the converted figure alongside. Totals — the car's total cost and profit — are always summed in naira.

**The name of the cost figure follows the car's state** (owner ruling 2026-10-08): *estimated total cost* while the car is on order, at port, or cleared; *landed cost* only once the car has actually landed; *total cost* once sold. A car on order has no "landed cost", because it hasn't landed. Profit is labelled *projected* until the car is sold and *real* once sold.

This is better than a single global rate, and it fixes a flaw this document originally recommended: if the naira moves, every car on the lot would silently show a different profit than it actually made. Storing the rate on each payment means **a car's figures never drift on their own after it is entered** — while price and rates stay editable and recompute when changed (owner ruling R3).

Three rules to hold it together:

| # | Rule | Why |
|---|---|---|
| 1 | The rate **defaults from the previous cost line on the same car**, editable per line | Seven costs per car means typing the rate seven times otherwise — and getting one wrong |
| 2 | A dollar cost with **no rate is an error**, never a fallback of 1 | A silent fallback produces confident, wrong money |
| 3 | "Money tied up in stock" = sum of each non-sold car's **entered total cost** (money genuinely spent or committed, whatever the state) | Needs writing down, or the number is ambiguous to him — particularly for cars still at sea |

No live-rate feature, so nothing can break or drift.

### One counting rule, applied everywhere

> **Available = every car in the Available group *or* the Landed this year group.**

Applied identically in all four places it appears — showroom tab, home page count, dashboard tile, and the Inventory filter — so they cannot drift apart.

| What | What it counts |
|---|---|
| **Available** (tab *and* dashboard) | Available group **+** Landed this year group |
| **Landed this year** (tab) | Landed this year group only |
| **On Order** | On Order group |
| **Sold** | Cars in the Sold state |

Because Landed this year is already inside Available, **the two are never added together** — that would count a new arrival twice. The dashboard shows Available with a sub-line, *"of which 4 new arrivals"*, so the overlap stays legible. **Total in stock = Available + On Order.** Sold is separate and outside it.

### Incomplete costs are excluded from profit, not from money

A car has **complete costs** only when all six cost types have been entered.

**₦0 is not the same as "not entered."** A cost that genuinely does not apply is typed as ₦0. A cost left blank counts as missing. This is what stops a forgotten cost from quietly inflating a profit figure.

| Quantity | Includes incomplete cars? | Why |
|---|---|---|
| **Projected profit** (unsold) | **No** | A projection built on missing inputs is meaningless |
| **Real profit** (sold) | **No** — also requires a recorded sale price | Same reason |
| **Money tied up** | **Yes** — sums whatever costs *are* entered | That money has genuinely been spent, whether or not the paperwork is finished |

These are different quantities, so they get different rules. A car at sea with only its purchase price entered still has real money tied up in it.

**The dashboard states the omission out loud** — the total never appears on its own. It carries a coverage line (*"from 9 of 14 cars"*) and, where cars are left out, a second figure with a named reason and the missing costs (*"5 cars still building — ₦12,900,000 entered so far"*). Without those lines the total looks wrong with no explanation. Each incomplete car also carries a warning in Inventory so it can be found and fixed.

**The word is "still building", never "excluded."** An excluded car reads as a car that is gone; a car still being built is still on the lot. *(Wording settled in `ui-plan.md` and `ux-plan.md`; this file's example previously said "3 excluded", which is forbidden wording. Change, 2026-10-06.)*

### The showroom shows the group, never the state name

Buyers see exactly three labels: **Available, On Order, Landed this year.** Any custom state the owner adds is a private filing label and never reaches the showroom.

The reason is worth preserving: **buyers are not buying from the showroom — they are going to WhatsApp.** They need the car's facts to decide whether the conversation is worth having, not the owner's internal status system. So the public field list carries the *group*, and the state's own name is private.

### "Landed this year" is a normal state

It is one of four built-in states, alongside Available, On Order and Sold. It has no date behaviour and no automatic expiry. It stays whatever the owner leaves it as. Locked.

### Reference code is generated, not typed

`TS-1001`, `TS-1002` — assigned automatically on creation. Optional VIN remains skippable. The code exists so a WhatsApp message always identifies a car without the owner having to decide anything.

### Accepted demo fixes

The builder accepted these. In priority order:

| # | Fix | Why it is first |
|---|---|---|
| **1** | **Seed data already loaded on first run.** No setup step, no empty state on arrival. | It is the only one hit *every time*, before anything built has been seen |
| **2** | First-run account setup. No seeded or default password. | Closes a security hole and avoids the "default credentials" look |
| **3** | Confirmation on delete, plus undo. | One accidental delete destroys trust in the whole admin |
| **4** | Per-photo upload progress, retry, and per-item failure reporting | The operator is on a phone; silent partial failure is the worst outcome |
| **5** | Store all photos, serve ~10 per car | Reconciles the brief's gallery ambition with mobile performance |
| **6** | Deployment env vars verified before handoff | A site that works locally and breaks for the client is the default failure |

### Car states are free-form, not a fixed workflow

**Decided against a fixed workflow.** No ordered stages, no drag-to-reorder, no "move to next stage," no transition rules.

A car has **one state**, picked from a list the client builds himself. He clicks a car, picks a state, done. Any state he wants he adds once and it stays available.

**No progress bar anywhere.** It only makes sense against an ordered workflow, and there isn't one. A coloured state badge replaces it — same visual weight, no ordering logic.

**Every state belongs to one of three groups, and the group decides which showroom tab shows it.**

| Group | Appears in |
|---|---|
| Available | Available tab |
| On Order | On Order tab |
| **Landed** | **Available tab *and* Landed tab** |

That last row is the important one. **Landed sits inside Available, not beside it** — a car that has just arrived is still a car the buyer can buy, so it appears in both. Buyers get a front door onto the freshest stock, which is the point of the tab.

The three tabs are fixed. The owner can never add, remove or rename them. `Sold` is not a group — **mark as sold is a separate action**, and it removes the car from the showroom while keeping it in the owner's sold list and totals.

**One state, one dropdown, grouped under the three headings** — so a car cannot end up in a contradictory position:

- **Available:** Available · Held for payment
- **On Order:** On order · Bought in USA · At port · On the ship
- **Landed:** Landed · Cleared

> This resolves a flaw in the original brief. The brief specified "Landed (this year)" — a state fused with a date, which left last year's landed cars with nowhere to go. Because Landed is now a group rather than a date, a car that stops being new simply stops appearing in that tab while remaining Available. No date logic, nothing stranded.

**Custom states are private labels.** The showroom shows the group, never the label. A car marked "Held for payment" is still an Available car, and stays visible to buyers, because that label exists so the owner can find it later. The only way to take a car off the showroom is to mark it sold — his decision about his own stock.

### Two state machines, two different subjects — and that is correct

| | Car state | Enquiry state |
|---|---|---|
| **Tracked on** | a physical vehicle | a customer conversation |
| **Answers** | where is this car | how is this deal going |
| **Examples** | Bought · At port · On the way · Landed · Sold | New · Talking · Negotiating · Not serious · Sold · Lost |

Both are free-form. Both are editable by the client. They are separate entities and never collide.

**Two identical cars are two separate listings.** One physical vehicle per listing, each with its own mileage, photos and price. Selling one does nothing to the other. There is no "one of two" anywhere — that only exists if listings were grouped by model, and they are not.

### Auto-move has exactly one direction

> **Admin → showroom. The owner's car state drives what the public site shows.**

The reverse is never true. An enquiry marked *Sold* does **not** move the car. Those are separate decisions the owner makes separately, in the car's own record.

This matters because the showroom must never show something the owner did not put there.

*One optional convenience:* if three customers enquired about one car and one buys it, the other two are still open against a sold car. A single "close the others" action settles that. Not required — a manual fix is fine.

### Enquiries enter through a structured PDF

The site cannot see who tapped WhatsApp, cannot read the message, and cannot know a name or number. So:

1. **Tapped** → the dashboard records *"WhatsApp tap from the Lexus RX 350 page."* No name, no phone. Nothing else is knowable.
2. **Prepared** → the client (or his staff) fills in a fixed template, optionally using any AI he likes **outside the product** — no AI API inside, no cost to the builder.
3. **Uploaded** → the site parses it into a preview table.
4. **Confirmed** → he checks every row, corrects anything, and saves.

**This PDF is the only path by which a customer's name and number ever enter the system.** It is load-bearing, not an extra.

**The template must be rigid** — fixed column names, every time. If an upload doesn't match the template, refuse it and say why rather than importing part of it. Ship a blank downloadable template alongside.

### Notifications

Not built. The dashboard shows **recent WhatsApp taps** — a list, refreshed on load.

---

## The build plan

### Stack

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js + TypeScript | One language throughout |
| Database | Neon (Postgres) | Car records, states, enquiries |
| Auth | Clerk | Accounts and sessions — the 7-day cap is its default; the 12-hour idle is enforced in the app |
| Images + enquiry PDFs | Sanity | Images served through the CDN, PDFs office-only. **Not** the admin |
| Hosting | Vercel | |

**The daily maintenance job** (data cleanup, image pruning, retention sweep) runs **once a day as a Neon scheduled function**, with **Vercel cron as the documented backup** (A8).

### Pages

**Public — 5**

1. Home — hero, tagline, WhatsApp button, sections
2. Available
3. On Order
4. Landed
5. Car detail — full-screen swipeable gallery. One template, all cars

**Admin — 7**

1. Login
2. Dashboard — stat cards, pipeline by state, recent taps, recent activity
3. Inventory — table on desktop, cards on phone. Cost and profit visible here only
4. Add / Edit Car — one template. Details, photos, costs with live profit, state, notes
5. Enquiries — columns per state, cards movable between them. Upload and review PDF
6. Sold / Archive — sold cars, sale price, real profit
7. Settings — WhatsApp number, tagline, full tank default, password, **state management** *(no FX rate — superseded by R3, 2026-10-08: rates live on each cost line)*

**12 total.** The three public tabs could be one page with tabs, but separate pages give shareable links — better for marketing, and someone can send one car rather than the whole inventory.

### Order of work

**There are two orders, and they are deliberately opposite.** One is the order we *settle* things; the other is the order we *build* them. Confusing the two is what put "polish once it works" at the end of the list below, and that is now gone.

**Planning order — business logic → functionality → UX → UI.**

The rules come first, because everything after them answers to them. Then what the product lets people do. Then how each screen behaves. How it looks is planned **last**, because a UI designed before the rules exist has to be bent later to fit them — and by then the design is already on paper.

**Implementation order — UI → business logic → functionality → UX.**

UX is planned early and landed **last** on purpose. If the behavioural layer goes in while the features are still moving, every change to a feature re-breaks the experience built on top of it. One bad feature ruins the UX, so the UX waits until the functionality underneath it is real.

In build terms:

1. **UI** — the surfaces exist and look right, in both modes.
2. **Business logic** — schema + `toPublicCar`, the money and counting rules, state machines, visibility, reference codes. The contract everything hangs off; wrong here means rewriting both sides.
3. **Functionality** — auth, public list + detail gallery, admin CRUD, images + WhatsApp, enquiries and the PDF, dashboard, settings. **Public first still holds inside this stage:** it is what dazzles, and if time runs short the impressive half should already work.
4. **UX** — dialogs, focus, toasts, undo, offline handling, failure wording, keyboard traps. The last thing in, so nothing under it can move.
5. **Deploy + leak check.**

> **Change, 2026-10-06.** This section previously gave a single order — "Public first. It is what dazzles..." with `Polish` at step 6 — which collapsed UI and UX into one "polish" item at the end, never separated business logic from functionality, and gave no planning order at all. Replaced with the two orders above, as the owner ruled.

### Who writes what — the handoff

The product manager owns the whole product, but does **not** write the UI plan or the UX plan. The loop is:

1. **Business logic and functionality are determined here**, with the owner.
2. **From them, this role issues the requirements the UX and UI must satisfy** — what they have to show, handle and hold, so they stay in sync with the rules and the features.
3. **Those requirements go to the designer**, who writes the UI and UX plans.
4. **The plans come back here to be reviewed.** The test is one thing: *do they still sync to the business logic and functionality?* Sync is the entire reason for the loop — UX and UI are downstream of the rules, not the other way round.
5. **During implementation**, once the UI is in, the business logic, the functionality and the UX are re-referenced against what was actually built, and refined.

**Planning stage:** business logic, functionality, UX, UI.
**Implementation stage:** UI, business logic, functionality, UX.

> **Planning closed 2026-10-06.** Every open disagreement, every settled-but-unwritten decision and
> the six implementation plans that come next are held in `planning-close.md`. Nothing here blocks
> the screens going up; that file is where the remaining calls are collected.

### Before handover

```bash
curl -s https://yoursite.com/cars/1 \
  | grep -i "purchase_price\|clearing\|shipping\|trucking\|profit\|full_tank\|landed_cost"
```

Empty output = safe. Run against every public route. Then confirm the deployed URL works, not localhost.

---

## J. Deployment and environment

Added because it is the failure the builder cannot reproduce locally.

| # | Failure | Rule |
|---|---|---|
| J1 | Site works on the builder's machine, breaks for the client | Verify the deployed URL, not localhost, before handoff |
| J2 | Missing or wrong env vars — database URL (Neon), Clerk keys, Sanity project ID and token, session secret | Startup fails **loudly** on a missing key rather than rendering a broken page |
| J3 | Sanity project in a private dataset but images requested anonymously | Confirm the dataset is readable, or requests fail silently with no image |
| J4 | Session secret differs between builds | Sessions invalid on every deploy; fix by setting a fixed secret, not a per-build one |
| J5 | Seed script re-run, duplicating all 15 cars | Seed is idempotent — key on VIN, or make re-running a no-op (§D) |
| J6 | Deleted car's photos left in storage | Delete assets with the record, or accept orphans knowingly |

---

## Failure modes and edge cases

The owner's explicit ask. Each is written as a **rule with a check**, not a thing to remember.

### A. Financial data reaching the public — the highest-severity class

| # | Failure | Rule | Check |
|---|---|---|---|
| A1 | Public endpoint returns the whole row | Public responses built from an explicit allow-list. A field absent from the list cannot be emitted, including by a future edit | Test: fetch every public endpoint and assert no admin key present, at any nesting depth |
| A2 | **Server-rendered payload leaks the record** — the page's HTML/`__NEXT_DATA__`/RSC payload contains the full object even though the component renders only public fields | Inspect the actual HTML response body, not the rendered DOM | Test: `curl` the page, grep the raw response for every admin field name |

### The mechanism, decided

**Next.js Server Components, plus an explicit mapping function as the boundary.**

Server-side rendering moves the filtering decision from the browser to the server, which is the right direction. It does **not** filter by itself. If a full database record is passed into a component as a prop, that object is serialized into the payload sent to the browser — so the page renders correctly while the costs travel with it.

> **The letter and the envelope.** The rendered page is the letter. The serialized payload underneath is the envelope. Sending the letter correctly proves nothing if the folder goes in the same envelope.

**The rule: never pass a database record into a component. Pass the mapped fields.**

```ts
// The single place the public field list exists.
export function toPublicCar(row: CarRow): PublicCar {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    trim: row.trim,
    year: row.year,
    exteriorColor: row.exterior,
    interiorColor: row.interior,
    mileage: row.mileage,
    features: row.features,
    photos: row.photos,
    status: row.status,
    price: row.doorstep_price,
    note: row.note,
  };
}
```

`getCar` still returns the full record — the admin needs it. Every **public** path calls `toPublicCar` first. One function, one place, one thing to get right.

**The gate (C3):** a car appears publicly **iff it has a price and at least one photo** — otherwise it is an office-only draft. Because a priced car is the only kind that's public, a buyer can *never* see a blank price; "Price on request" exists only in the office, for drafts. *(This closes register B1: yes, a listed car is always priced — H1/H3 scope down to office drafts. Landed 2026-10-08 via the system-model plan.)*

**Server Components do not cover route handlers, Server Actions, or browser-side fetches.** All three must use the same boundary.

**Verification — run before the client ever sees it:**

```bash
curl -s https://yoursite.com/cars/1 \
  | grep -i "purchase_price\|clearing\|shipping\|trucking\|profit\|full_tank\|landed_cost"
```

Empty output = safe. Any hit = it leaks, and it names the field. Run against the list page, the detail page, and every other public route.

| A3 | Over-fetching via a generic query endpoint | No endpoint accepts a field selection from the client | Test: request an admin field by name; expect rejection or absence |
| A4 | Error responses echo submitted payloads | Error bodies carry a code and safe message only | Test: force a validation error on an admin route |
| A5 | CDN / ISR cache serves an admin response publicly | Admin responses `private, no-store`; cache keys include auth state | Manual: load admin, then request the same URL logged out |
| A6 | Photo EXIF carries supplier name, location, or device | Strip metadata on upload | Inspect an uploaded file's metadata |
| A7 | Cached admin data in a shared client store survives logout | Clear query cache on sign-out | Log in, sign out, hit back |

**Recommended mechanism:** allow-list serializer (§A1) as the single public response path, so one change governs every public read. Row-level security is a viable alternative but its failure is *silent and total* — a wrong policy exposes the whole table and reports nothing. Given a single admin and one build, the allow-list is the better failure mode: loud and one field at a time.

### B. Authentication

| # | Failure | Rule |
|---|---|---|
| B1 | Client-side-only check | Auth verified server-side on **every** admin request |
| B2 | Admin UI hidden, API open | Hiding a route is not securing it |
| B3 | Token in `localStorage` | `httpOnly`, `Secure`, `SameSite` cookie; sessions expire and rotate |
| B4 | Rate limiting absent or behind a proxy | Limit at the first hop that sees the real client IP |
| B5 | Shipped default credentials | No seeded password. First-run setup, credentials entered by the operator |
| B6 | Reset flow reveals whether an email exists | Uniform response regardless of account existence |
| B7 | Session survives indefinitely | Explicit expiry and idle timeout |

### C. Money correctness

| # | Failure | Rule |
|---|---|---|
| C1 | **Float arithmetic on currency** (`0.1 + 0.2`) | Store and compute in **integer minor units (kobo)**. Never floats, ever |
| C2 | FX rate missing or stale | One configured rate, stored with a fetch timestamp; the age is visible in the UI |
| C3 | Profit computed client-side | Server computes it. The client displays a server value |
| C4 | Negative profit clamped to zero | Underwater cars show a negative profit. Hiding it is how a business sells below cost without noticing |
| C5 | Missing cost field silently treated as zero | Explicit "not entered" state, visually distinct from ₦0 |
| C6 | Rounding display inconsistent | One stated rounding rule, applied once, at the boundary |
| C7 | Editing a car changes profit without the operator noticing | Show the delta when a cost edit moves profit materially |

### D. Duplicates and double submission

| # | Failure | Rule |
|---|---|---|
| D1 | Double-click Save → two records | Disable on submit **and** accept an idempotency key; server dedupes |
| D2 | Retry after timeout creates a second record | Same key on retry |
| D3 | Retry re-uploads every photo | Track per-file upload state; resume, don't restart |
| D4 | No natural uniqueness | VIN where available; otherwise warn on make+model+year+mileage near-duplicate |

### E. Image handling

| # | Failure | Rule |
|---|---|---|
| E1 | Large batch → timeout, partial upload, orphaned files | Per-file progress and retry; upload before DB write, with cleanup if the DB write fails |
| E2 | Wrong or corrupt format accepted | Validate magic bytes, not the extension |
| E3 | Filename path traversal (`../../etc/passwd`) | Generate server-side filenames. Never trust a client filename |
| E4 | No dimension cap | Cap on upload *and* enforce on render |
| E5 | Duplicate files on retry | Content hash, or deterministic per-listing filenames |
| E6 | EXIF retained | Stripped (§A6) |

### F. Concurrency

| # | Failure | Rule |
|---|---|---|
| F1 | Two tabs edit the same car; last write wins silently | Optimistic concurrency via a version field; reject and tell the operator |
| F2 | Optimistic UI shows a save that then fails | Roll back visibly, and say so |
| F3 | Read-after-write shows stale data | Refetch after mutation; no cache served across an edit |

### G. Error states

The brief's own requirement — "no silent failures" — taken literally.

| # | Failure | Rule |
|---|---|---|
| G1 | Save fails, nothing shown | Every operation ends in explicit success or explicit failure. No silent paths |
| G2 | Transient network failure not retried | Automatic retry with backoff on network-class errors only — never on validation errors |
| G3 | Error toast vanishes before it's read | Errors persist until dismissed; failures are not auto-clearing toasts |
| G4 | Operator doesn't know which save failed in a batch | Per-item status in multi-operations |
| G5 | App usable offline in a misleading way | Detect offline and say so, rather than accepting input that will be lost |

### H. Public site behaviour

| # | Failure | Rule |
|---|---|---|
| H1 | Sold car still listed | Status governs listing; sold cars leave the public grid |
| H2 | Empty tab looks broken | A designed empty state on all three tabs — expected on day one |
| H3 | Price renders as 0 or blank | Never render an unset price as a number. Show "Price on request" |
| H4 | Slow images wreck the layout on mobile data | Responsive `srcset`; first image above the fold eager, rest lazy; hard size budget per image |
| H5 | Broken WhatsApp number in settings → dead CTA | Validate the number format; **test the composed link renders** |
| H6 | Special characters in the pre-filled message break the link | URL-encode; keep the message short (§C link limits) |
| H7 | On-order car with no ETA | The optional note field is surfaced, not buried |

### I. Shareability — free, and this is a marketing asset

| # | Failure | Rule |
|---|---|---|
| I1 | **Link renders as bare text in WhatsApp** | OG + Twitter card with the lead image, title, and price. In a prototype whose job is marketing, this is table stakes |
| I2 | No favicon | Ship one |
| I3 | 404 on a stale listing URL | Redirect or a proper 404 that offers inventory |

---

## Assumptions — built to, none requiring client input

The client is withholding business information until he has assessed the work. **Nothing in this design waits on an answer.** Every unknown below is a value in the Settings table, changeable by the operator in seconds, with a sensible default already in place.

| Unknown | Built as | Default |
|---|---|---|
| Business name / tagline | Setting | TrueSpec Automotive |
| WhatsApp number | Setting | placeholder, with a **validated format + a working composed link** |
| FX rate (USD→NGN) | **Superseded by R3 (2026-10-08)** — there is no global rate; each dollar cost line carries the rate that amount was made at | — |
| "Full tank" cost | Setting, per the brief's ₦110,000 | ₦110,000 |
| Status names | Setting (label text) | Available / On Order / Landed |
| Photo limits, image budget | Config constants | sane phone-first defaults |
| Admin credentials | First-run setup screen | no seeded password |

**The Settings page is load-bearing.** It is not a nicety — it is the mechanism that makes every assumption above reversible without a code change. Build it early.

### Nothing here is a question for the client

The document's earlier questions are withdrawn. Where information was wanted, the design supplies a default and a way to change it.

**The one thing worth doing anyway, without asking:** after the demo, let the client click through Settings and change the WhatsApp number himself. It demonstrates the design is meant to be *his*, not a demo he was shown.

---

## Building for an assessment

This is a demo whose purpose is to win work, judged on judgment rather than on screenshots. Two consequences:

**1. The fake data must be complete, not minimal.** A demo with three cars and empty galleries reads as a half-built thing. Seed enough inventory that all three tabs are populated, with multiple photos each and believable detail — mileage that isn't round, features written as a real seller would write them, one on-order car with an arrival note. Padding reads as inexperience.

**2. Show the reasoning, not just the result.** Anyone can produce a dark, gold-accented car site. What demonstrates competence is being able to say *why*:

- why the field split is enforced in one place rather than per-endpoint
- why "prominent WhatsApp button" was deliberately overridden
- why money is stored in kobo and not floats
- what happens when the operator double-clicks Save
- which four things were cut and why

**A one-page rationale handed over with the demo is part of the deliverable, not an extra.** It is the part that answers the question he is actually asking.
