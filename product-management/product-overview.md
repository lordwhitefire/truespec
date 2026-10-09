# TrueSpec Automotive — Product Overview

A plain-language description of what this software is and how it works. No code, no technical detail — just what the product does and why each part is there.

---

## What it is

Two halves that never meet.

- **The showroom** — the part buyers see. Cars, photos, prices.
- **The office** — the part only the owner sees. What each car really cost, and what he made on it.

One rule governs the whole thing: **what the owner paid is never visible in the showroom.** Not hidden, not blurred — simply not sent out to the browser at all. Everything else in the design follows from keeping that rule true.

---

## Who uses it

**Buyers** — anyone, no login. They look, they read, they message on WhatsApp. That's it.

**The owner** — one person. He logs in, adds cars, tracks them, and sees his money.

That's the entire cast. Two types of person.

---

## The showroom

**Home page.** The brand, a tagline, and a prominent way to message on WhatsApp. Below that, the three sections of inventory so he can see at a glance what exists.

**Three sections, always the same three.** The owner can never change, rename or remove them:

- **Available** — everything the buyer can buy right now
- **On Order** — bought but not yet here, each with an expected date
- **Landed** — the newest arrivals

**Landed sits inside Available, not beside it.** A car that has just arrived is still a car you can buy — so it appears in **both** tabs. This is the point of the tab: buyers like new stock, so the freshest cars get their own front door. It also means no car can get stranded in the wrong section — when an arrival stops being new, it simply stops being highlighted and remains Available.

**A car's page.** This is the important one. A large photo the visitor can swipe through, the brand, model, year, colours, mileage, price, and the features. A WhatsApp button that opens a message already naming that car.

**The rule of the showroom:** everything needed to decide is on the page. A buyer should never have to ask "is it still available" or "what's the price" — both are already visible.

**Buyers only ever see the three section names.** The owner's own labels — anything he adds in Settings, like "held for payment" — are for his filing, and never appear. Buyers are going to WhatsApp to talk; they need the car's facts, not the owner's internal system.

---

## How it feels to use

It has to work on three screens: **phone, tablet, laptop.**

Most of it behaves the same everywhere. The parts that don't are listed here rather than buried.

**The same on all three:**

- **Toast** — delete with Undo, and confirmation when something saves
- **Dropdown** — picking a car's state, an enquiry's state, filtering the list
- **Alert** — costs incomplete, a save that failed
- **Empty states** — no cars yet, no enquiries, a filter that matched nothing
- **Inline validation** — catching a missing rate before it saves, not after

**Where it changes:**

| | Phone | Tablet | Laptop |
|---|---|---|---|
| Editing a car | Full page | Drawer | Inline on the page |
| Changing a car's state | Bottom sheet | Bottom sheet | Inline dropdown |
| The gallery | Swipe | Swipe | Arrows and swipe |
| Filtering | Full-screen sheet | Sheet | Dropdown in the bar |

**Two things cannot work on all three.**

**Hover.** On a laptop the edit and delete icons appear when the pointer reaches a row. A phone has no hover — so there they either sit there permanently, or need a long press. **Undecided.**

**Swipe.** Swipe-to-reveal and swipe-to-delete feel natural on a phone and a tablet. On a laptop, with a mouse, they don't exist — so a visible button is needed there instead.

**Deliberately not used:**

- **Command palette** — one user, a small list, and a dropdown already covers it
- **Right-click menus** — a desktop habit, wrong for a product used mostly on a phone
- **Tooltips** — good on a laptop's icon buttons, dead weight on touch. One decision, not per button

**Still open:** the office navigation. Desktop gets a sidebar, a phone gets a bottom bar. **Tablet was never decided** — both would fit.

---

## The office

**Login.** One page. Email and password. Nothing loads until he signs in.

**Dashboard.** How many cars he has, how much money is tied up, how much profit he is sitting on. Recent WhatsApp taps. Recent activity.

It never changes shape, whatever he adds in Settings. **Available counts everything buyable** — the Available cars plus the new arrivals, since a newly landed car is still a car someone can buy. It says so underneath: *"of which 4 new arrivals."* Those are never added twice. Sold cars sit on their own, outside the stock total.

**If some cars are missing costs, the profit total says so** — *"Projected profit ₦48M from 9 cars. 3 excluded: costs incomplete."* Otherwise the number would look wrong with no explanation. Money tied up still includes those cars, because that money has genuinely been spent.

**Inventory.** Every car in one list. Name, state, price, what it cost, what he made. On a phone it turns into cards instead of a table. **This is the only place costs and profit appear.**

**Add / edit a car.** One page, used both for adding and for changing. Sections: the car's details, its photos, its costs, its current state, and private notes. As he types the costs, **the profit updates beside him while he types** — so he sees immediately whether the price he was thinking of works.

**Sold / Archive.** Cars already sold. Kept, with the sale price and the real profit. Not shown to buyers, but still counted in his totals.

**Enquiries.** Customers who tapped WhatsApp. Each one is a card showing the name, number, which car they asked about, and notes. Cards move across columns as the conversation progresses. New → Talking → Negotiating → Sold or Lost.

**Settings.** His WhatsApp number, the tagline, the full-tank default, and his password. *(The dollar-to-naira rate is not here — there is no global rate; each dollar cost carries its own. Removed 2026-10-08, ruling R3.)*

---

## How he handles inventory

He clicks **Add Car**. Fills in the brand, model, year, colours, mileage, features. Drops in photos. Types what he paid — purchase price, shipping, clearing, the two trucking costs, the full tank.

As he types, **the car's total cost and the profit appear beside the form** (labelled "estimated" until the car has landed — a car on order has no landed cost yet). He is not guessing. He can see that buying at that price and selling at the price he typed leaves him ₦7.6 million.

He picks a state, presses save, and the car appears in the showroom immediately.

**Editing** works the same way — open the car, change what needs changing, save.

**Deleting** asks him first, and he can undo it. One accidental delete loses all trust in the office.

---

## How car tracking works

Every car sits in a **state**. Not a fixed sequence — just a state, chosen from a list he controls.

*Available. On the way. At port. Cleared. Landed. Sold.*

He can add his own at any time. If he needs "held for payment," he types it once and it stays available forever. Each state sits under one of the three showroom sections, so a car can never end up in a contradictory place.

He sets the state in the office, and **the showroom follows.** Mark a state as a new arrival and those cars show up under Landed as well as Available. **Mark as sold** is a separate action: the car vanishes from the showroom entirely — but stays in his sold list and still counts in his totals.

He never moves things between showroom tabs by hand. He sets one state and the site does the rest.

---

## How inquiry tracking works

Someone taps **Chat on WhatsApp**. The site records *that* it happened, and *which car's page* they were on.

**Nothing more than that.** The site cannot see the customer's name, their number, or anything they said inside WhatsApp. That conversation happens on WhatsApp, not in the software.

So the details are brought back manually. The owner or his staff prepare a **PDF from a fixed template** — using any tool they like, entirely outside the software. They upload it.

The software reads the PDF, shows it as a **preview table**, and lets him check every row and correct anything before saving. Nothing is saved until he confirms.

Each enquiry then sits in a column — New, Talking, Negotiating, Sold, Lost — and he moves it as the conversation goes.

**Two separate things being tracked, on purpose:**

- **Car state** tracks the *vehicle* — where it is in its journey
- **Enquiry state** tracks the *customer* — how the conversation is going

They are different questions, so they are tracked separately and never force each other. Marking a customer "Sold" does not move the car. That is a separate decision he makes separately.

---

## How he logs in, and how the office stays private

**Login** is one page — email and password. There are no default passwords and no shared logins. He creates his own account the first time he opens it.

**Once he is inside**, every page of the office requires that login. Signing out locks all of them.

**The lock is on the door, not on the curtain.** Hiding the office link is not what protects it — anyone who has seen the URL could type it in. Instead, **the server checks who is asking on every single request** and refuses to answer anyone it doesn't recognise. The pages and the data are one thing, not two.

**The costs get the same treatment.** The showroom and the office are built from separate lists of information. The public side is handed an explicit list of what a buyer is allowed to see — brand, year, mileage, price — and nothing else is ever included, even by accident.

**Why this matters so much:** if the costs ever reached the showroom, every buyer would know exactly what he paid, and the price would be worthless. So this is treated as the one thing that must never break — and there is a check for it before the software is handed over.

---

## The whole thing in one paragraph

A buyer browses cars, reads everything he needs on the page, and messages on WhatsApp already knowing which car he wants. Meanwhile the owner — and only the owner — logs in, adds each car with what it really cost, watches his profit calculate as he types, moves the car along as its journey progresses, and keeps track of every customer who asked. The two sides never share anything except the car's public details.