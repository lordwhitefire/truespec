# TrueSpec Automotive: UX plan

**Status:** adopted, with your changes. **A tap is not an enquiry**, so the board counts taps and nothing is ever claimed about who tapped. **The offline showroom and the offline outbox are cut**; the local draft stays. Session length, password reset, the photo-and-price rule, one main WhatsApp button per screen, and the sign-in delay are settled. The remaining open numbers are in section 7. Every change is in the change log at the end.

**What this file is.** The behaviour part of the product model — what each screen *does*, step by step, and why. It does not cover how things look (that is `ui-plan.md`), what the owner is allowed to do (functionality), or the rules about money, states and visibility (business logic).

**Words used.**
- *Showroom* = the public site. *Office* = the owner's admin.
- *Group* = one of the four fixed car groups: Available, On Order, Landed this year, Sold.
- *State* = where the owner has actually put a car. A custom state belongs to a group.
- *Tap* = a tap on a WhatsApp button. **The site records that a tap happened — the car, the time, the page. Nothing more.** It never becomes a message, and it never becomes an enquiry.
- *Enquiry* = a record of a real conversation, and the only way one enters is the PDF import (Q31). It carries a name and a number, because a human typed them in.
- *VDP* = vehicle detail page. The industry term for a single car's page. It is what "car page" means here.
- *Dirty* = the form holds changes the owner would be upset to lose.
- *Blocking pop-up* = a dialog, sheet, drawer or full-screen viewer. It stops the page behind from scrolling or being clicked, and it holds focus until it closes. Toasts, banners, dropdowns and tooltips never do.
- *Confirmed / in progress* = the two money figures from `ui-plan.md` section 8, decision 4.

---

## 1. I could not read the built pages — read this first

**You asked me to take account of what we already have on the ground. I could not verify it.**

The four pages named in `ui-plan.md` (`truespec.html`, `car.html`, `inventory.html`, `admin-inventory.html`) **are not on this machine.** I searched the whole home directory. The only inventory page I can find is in a throwaway sandbox I am not allowed to touch, and I did not open it.

So every answer below is written against:

1. **What `ui-plan.md` documents about the built pages** — and it is specific: the gallery is described as "already built and work", the hero slider as "as built" with auto-advance every 5.5s, the three tabs as "as built", the floor and about sections, the class names `.tab.on`, `.stt button.on`, `.p2`, `.rc .pr`, `.steps .num`, the `summary()` function on the office draft.
2. **The product model and data model** in `truespec-product-design.md` and `system-model.md`.
3. **Published UX research and how the Nigerian used-car market actually behaves** (section 5).

**What this means for you.** Any answer below that says "as built" is me trusting `ui-plan.md`, not confirming it. Section 6 lists exactly which answers carry that risk so you can check them in five minutes with the files open. Nothing here guesses at behaviour the documents do not describe — where a behaviour is unknown, the answer says so and names what to decide.

---

## 2. The behaviour in one page

1. **One job for a buyer: judge a car, then message the owner.** Everything on a car page exists to make that judgement faster or safer. There is no cart, no booking, no account for buyers.
2. **The path is four taps: land, see cars, open one, WhatsApp.** Not one tap, because in this market the deal does not close on a photo — serious buyers inspect. But four, not ten.
3. **Coming from a shared link must work as if there were no site.** The most common arrival is a WhatsApp link to one car. That page must be complete and actable on its own, with no menu diving required.
4. **One WhatsApp button per screen size, in reach.** Never three at once. The header gets a small link, not a second button. It never covers anything.
5. **Photos are the product.** Everything else on a car page is a caption for them. **A car with no photo and no price is not listed at all** — it stays a draft in the office.
6. **A tap is only a tap.** The site cannot see who tapped, and it never pretends to. The office counts taps per car and names them taps.
7. **Numbers that count something say how many things they counted.** A money total never quietly drops a car. A tap count never quietly becomes a list of customers.
8. **The owner's work is never lost to a timeout or a mis-click, and never claimed to be saved when it is not.** Drafts survive on the device; failures say what to do.
9. **Every question asks what happens when it goes wrong**, because on a phone in Lagos it will.

---

## 3. What I checked, and where I was wrong

### What I checked
- Read `ui-plan.md` in full, plus the product model, the data model and the system model, so this file contradicts none of them.
- Looked up vehicle-detail-page behaviour across the dealer trade (Dealer.com, Autotrader, Cars.com, Carvana-derived guidance) rather than inventing it.
- Looked up how Nigerian used-car buyers actually contact sellers — Jiji.ng, Instagram, WhatsApp — because that determines what the showroom is *for*.
- Looked up the loading-pattern literature properly, including the studies that disagree with each other.
- Looked up the unsaved-changes and offline patterns, which are the two places where naive UX loses a sale or an afternoon's typing.

### Where the sources disagree, and what I chose

**Skeleton screens versus spinners is genuinely unsettled.** Three studies, three answers:
- Viget, 136 people: skeletons performed **worst** on every measure. 59% said loading felt quick, against 74% for a spinner. People *guessed* the skeleton wait was longer (2.82s vs 2.41s).
- ACM (Långström 2018): skeletons scored **higher** on perceived speed and ease of navigation — but people shown a spinner were **faster** at actually finding the article.
- Üzüm 2026: **progressive rendering** — content appearing as it arrives — was rated most effective overall. Notably, developers *and* AI models both predicted users would prefer skeletons. They did not.

I chose **progressive rendering** (Q34), because the most recent study tested it against the alternatives on all metrics at once, and because it is also the honest answer for a grid of cars that arrive at different speeds. I am recording the disagreement rather than hiding it, because "use skeletons" is advice you will hear again from someone who has not read Viget.

**Where the sources agree, I did not have a choice to make.** Skeletons are wrong for uploads (NN/g is explicit: use a progress bar for anything in progress, not a page-shaped placeholder). Beforeunload must be attached only while dirty, because leaving it attached costs every reader a slower back button. Escape must close every dialog or it is a keyboard trap under WCAG 2.1.2. Those are not preferences.

### My own mistakes, corrected
1. **I nearly answered Q12 from the data model instead of from the market.** The data model says Sold cars stay in the database. True, and beside the point — the question is what a *buyer* meets. In this market a sold car is a dead end, and the honest move is to be honest immediately and offer the next car.
2. **I nearly put an enquiry form on the showroom.** Research on the Nigerian market is blunt: buyers escalate to WhatsApp and abandon forms. The data says forms complete at 2–3%; WhatsApp click-to-chat clears double digits. A public form would be a worse version of the thing we already have.
3. **I nearly used a spinner for photo uploads.** It is the most common mistake in this category and NN/g specifically rules it out. Caught before writing.
4. **I nearly left the unsaved-changes warning on `beforeunload` permanently.** It must come off when the form is clean, or it degrades navigation for everyone including people with nothing unsaved.
5. **I called a WhatsApp tap an enquiry, and wrote that the tap logger "needs no spam handling". Both were wrong.** A tap is the site observing that a button was pressed — the same idea the product design already had as *"the site cannot see who tapped"*. Calling it an enquiry invites the whole office to treat a number as a customer. And "no spam handling" was simply untrue: the logger is a public endpoint that anyone can call. It is rate-limited now (Q30).
6. **I merged repeat taps into one enquiry within 24 hours, to keep the board tidy.** That would merge two different buyers who both want the same car — and the site cannot tell them apart, which is exactly why it should not try. The board counts taps per car instead (Q32).
7. **I built an offline showroom and an outbox.** They were good answers to questions this build is not asking, they contradicted Q91, and they were too big to ship. Cut, with the local draft kept (Q36, Q84).

### What I am still unsure of
- **Whether the built `summary()` function already distinguishes complete cars** (Q49, Q64). It sums "costs entered so far", so it does not. That is confirmed by the document, not the code.
- **The slider** (Q15 to Q18). Pause on hover, swipe, reduced motion and the failed-photo case are **the owner's to handle separately now**, so they are no longer on this file's list of things to do. Q15 also could not be verified against the built code, which is why it was the weakest of the four.
- **Two numbers are still yours**: whether the dashboard needs a manual Refresh (Q53), and whether taps need an alert beyond a badge (Q77).

---

## 4. The 91 answers

Each answer: **the decision**, then *why*.

### A. Journeys

1. **In the first 30 seconds a buyer must answer three questions: is there a car I like, what does it cost, and can I reach this person right now.** The page therefore leads with photo, name, price — not with brand copy. *Why: 74% of car shoppers compare vehicles online before visiting, and the Nigerian pattern is to shortlist in two hours on a phone rather than visit fifty lots. The showroom's job is to survive that comparison, which means price and honesty up front, not persuasion.*
2. **One path: land, see cars, open one, WhatsApp.** Four steps. No account, no form, no checkout. *Why: the market's own playbook is spec message → photo burst → price → inspection. Our site does the photo and price leg so the conversation can start informed. Anything we add before the message is friction with no payoff.*
3. **Most arrivals are a shared WhatsApp link to one car, then Instagram, then search.** *Why: WhatsApp is over 90% of Nigerian internet users, and sellers routinely post a link to a specific car into a group or a buyer's thread. Instagram functions as the dealer's showroom — one Lagos dealer attributes roughly 60% of sales to it. Search is real but last, because a buyer who searches "Toyota Camry Lagos" is already partway through and arrives with intent. **We build for the shared link first, which is the opposite of building a homepage.***
4. **From a shared car link the buyer can go to: the gallery, the specs, WhatsApp about this car, similar cars, or back to the full list.** Nothing else. *Why: a shared link must work standalone. If arriving on it drops the buyer into a menu, we have made them navigate a site they did not choose to visit.*
5. **In his first 5 minutes the owner should see: his stock count, his money, and one button that adds a car.** *Why: the two questions that make a dealer open the office in the morning are "what have I got" and "am I into this car yet". An empty dashboard with no obvious next action is how an admin gets abandoned in week one.*
6. **Three tasks, in order: add or edit a car, change a car's state, read an enquiry.** *Why: these are the only things that change what a buyer sees. Marking sold and restoring a photo are rarer. Everything else in the office is settings.*

### B. Showroom browsing

7. **Available opens first, and the site does not remember the last tab.** A link that names a tab (`?tab=on-order`) is honoured. *Why: buyers arrive with a purpose, usually from a message about a specific car or a price bracket. Remembering where someone browsed last week means landing them somewhere they did not ask for. Honouring an explicit link is different — that is an instruction.*
8. **Switching tabs replaces the grid in place. No jump, no scroll to top.** *Why: a jump reads as a page change and loses the buyer's place. If they were three rows down comparing prices, yanking them to the top is the single most irritating thing a grid can do.*
9. **Filters apply immediately, and there is one visible "Clear all".** On phones, filters open in a sheet with Apply and Clear. *Why: live filtering is what buyers expect from a car list — they narrow while scanning. But a phone cannot show a filter panel and results at once, so the sheet needs explicit Apply. One Clear, not a reset per filter, because nobody clears six filters one at a time.*
10. **No matches: "No cars match those filters." plus Clear all, plus "Tell us what you want and we will find it" with a WhatsApp button.** *Why: an empty result with no way forward is where a browsing session dies. The WhatsApp route is also the market's actual behaviour — buyers ask dealers to find a spec when a listing site comes up short.*
11. **Empty tab: the wording from `ui-plan.md` Q42, unchanged** — "No cars here right now. Tell us what you want and we will find it", plus a WhatsApp button. *Why: already settled in the UI plan; the UX adds only that the tab's count shows 0, so the buyer learns the state before switching.*
12. **Sold cars are not in any showroom list. A buyer on a sold car's page gets the not-available page from `ui-plan.md` Q43, with similar cars and "Ask for a similar car".** *Why: this is the market's own solved problem. Jiji sellers flip a sold listing's reply to "This has been sold — similar items: [link]" to stop wasting buyers' time. A dead end with a redirect is more honest and more useful than a sold car sitting in a grid looking available. **Showroom tabs are Available, On Order, Landed this year — three tabs, exactly as `ui-plan.md` Q35 settled. Sold is a group in the office, not a showroom tab.***
13. **The grid is paged, 24 cars a page, numbered pagination.** *Why: already settled in `ui-plan.md` Q70 and it is right for this market — pagination keeps the footer and the WhatsApp button reachable, and buyers compare across pages. Autotrader's own guidance warns against loading whole galleries at once.*
14. **Back from a car page returns to the same tab, same filter, same scroll position, and the same page of results.** *Why: the buyer's place in a comparison is the value. Browsing research is consistent that losing scroll position on back is one of the fastest ways to make someone leave and not come back. This needs the filter and page in the URL — noted in section 8 as a build requirement.*
15. **The slider pauses on hover, on focus, and on touch.** *Why: `ui-plan.md` says the built slider pauses on hover or focus. **Unverified against the code** — confirm in `truespec.html`. Auto-advance must also stop while a tab is hidden, or it burns through slides for a buyer who is in another app. **Status: Q15 to Q18 are the owner's to handle separately, so these four answers are on record and not on the list of things to build.***
16. **Arrows and dots, and swipe on a phone.** *Why: built and settled in `ui-plan.md` Q31 and Q33. Swipe is not optional on touch — a carousel that needs precise taps on a phone loses users.*
17. **With reduced motion on, the slider does not auto-advance at all.** It becomes manual. *Why: `ui-plan.md` Q91 requires reduced motion to be respected. Auto-advancing content is exactly the motion that setting exists to stop.*
18. **A failed hero photo is skipped, and the slider advances to the next one.** If every photo fails, the graphite "Photo coming soon" tile from `ui-plan.md` Q29, with the car name over it. *Why: a broken image icon in the largest element on the page reads as a broken site. Autotrader's guidance is to replace placeholder imagery quickly — the cover photo is what earns the click.*

### C. The car page and gallery

19. **Without scrolling: the cover photo, the year/make/model, the price, and the WhatsApp button.** Then specs, then the gallery. *Why: transparent pricing on the vehicle page is the single most consistent finding in dealer research — with clear pricing, "Confirm Availability" style actions outperform opaque ones. Price at the top also matches `ui-plan.md` Q34's hero badge being the abbreviated exception, not the page's rule.*
20. **The gallery moves by swipe, by arrows on hover, by always-visible arrows on phones, and by left/right arrow keys when it has focus.** *Why: built and settled in `ui-plan.md` Q31. The keyboard path is the addition here — it is required by WCAG 2.1.1 and costs nothing once focus is managed.*
21. **Tap opens full screen. Close by the on-screen close button, by Escape, or by tapping outside.** *Why: `ui-plan.md` Q31 says full-screen on tap. Escape is required for keyboard and is free. Tapping outside is the phone gesture people try first without being told.*
22. **One main WhatsApp button per screen size, and a small link in the header.** Laptop: the sticky price sidebar. Phone and tablet: one sticky bottom bar. **Everywhere, the header carries a small text link, not a second button.** *Why: your decision, and the dealer-trade research agrees with it — one repeated primary action beats several competing ones, and more than one prominent CTA reduces conversion. Three buttons at once (header, sticky bar, sidebar) is the version that reads as indecision. The sticky part is the research finding: a single action at the bottom of a long mobile page is missed by most readers. It must not cover content, the failure mode named repeatedly in the WhatsApp button literature.*
23. **One photo: the photo, full width. No thumbnails, no arrows, no counter.** *Why: a one-item carousel with disabled arrows is a control that does nothing. Remove the affordance rather than show it inert.*
24. **A car with no photo, or no price, is not on the showroom at all.** It stays a draft in the office, where it is perfectly usable — it saves, it holds its costs, it can be finished later. The moment it has **at least one photo and a price**, it appears. *Why: your decision, and it removes the two weakest states a car page can be in. A car page with no photo is a spec sheet pretending to be a car; a car page with no price is worse, because the buyer's first question is the one the page refuses to answer. Both look broken, and both cost the owner a click. The office still shows the "Photo coming soon" tile (`ui-plan.md` Q29), so nothing is hidden from the person who has to fix it. **The visibility rule itself — what makes a car public — is business logic and belongs in the product design; mirror it there.***
25. **A bad or missing link gets the not-available page from `ui-plan.md` Q43** — friendly wording, similar cars, WhatsApp for a similar car. *Why: shared links outlive sales. Nigerian buyers forward car links freely; the link will be opened long after the car is gone.*
26. **Back to the list: a visible "All cars" link in the car page header, plus the browser back button, both restoring position per Q14.** *Why: relying on the browser back button alone fails for anyone who arrived from a shared link — there is no list to go back to.*
27. **Yes: three similar cars at the bottom, same group first, then nearest price, each linking to its own page.** *Why: `ui-plan.md` Q43 already promises similar cars. Same-group-then-price keeps a buyer who wanted an SUV looking at SUVs, which is the comparison they are actually making.*

### D. Contacting the owner

28. **The message names the car, the price, the car's page and its reference code, and the buyer can edit it before sending:** `Hi, I'm interested in the 2018 Toyota Camry — ₦12,500,000 (TS-1001): truespec.ng/car/TS-1001 — is it still available?` Under fifteen words before the link, written from the buyer's side. *Why: the WhatsApp click-to-chat guidance is consistent on every point — `wa.me/<number>` in full international digits with no `+`, spaces or leading zero; `?text=` URL-encoded; the message prefilled but editable; specific to the page it sits on; from the user's perspective; short. **A generic "Hi" tells the dealer nothing, and the point of prefilling is that the owner's first reply can be an answer instead of "How can I help?"** Per-page messages are how the owner learns which cars people are actually asking about. **The link and the code are what make a tap countable**: the code is generated on creation and never typed (so it cannot be wrong or ambiguous), the link is the same page the buyer is already on, and together they let the owner tie a conversation to a car without asking the buyer anything. The full price goes in the message, matching the showroom's price rule (`ui-plan.md` Q82) — the dealer's first reply should never have to guess the figure the buyer is looking at.*
29. **On a laptop with no WhatsApp, the link opens WhatsApp Web. If that fails, the page offers a copyable phone number and a call link.** *Why: WhatsApp's own help centre confirms click-to-chat works on phone and WhatsApp Web, and the integration guidance is explicit that desktop is the weaker path — many desktop visitors are not logged into Web, which is why a QR code is recommended there. **We do not use a QR code; a copyable number is better for a single-car business** because it also serves a visitor on a second device.*
30. **Yes: a tap-to-call link beside the main WhatsApp button. No public enquiry form.** *Why: in this market the phone is the second channel, not a fallback — dealers report many leads still begin as a call, and click-to-call should be visible rather than buried. The form is deliberately absent: buyers escalate to WhatsApp and abandon forms, and a form on a car page would be a slower path to the same conversation. **The tap logger is a public endpoint, so it is rate-limited** — a small request budget per IP per minute, over-budget requests dropped silently, and the page itself never waits on it. *Why that matters here: I earlier wrote that the tap logger "needs no spam handling". That was wrong. It is an unauthenticated endpoint anyone can call, and left open it fills the counts with junk until "9 taps today" means nothing. **And a tap may never become a message: the site sends nothing into the buyer's WhatsApp and writes nothing the owner did not do.***
31. **The board holds two kinds of card and never confuses them. A *tap*: which car, when, which page — no name, no number, because none is knowable. An *enquiry*: a real conversation, entered through the PDF import, carrying the name, number and notes a human typed in.** Both move across the same customer-state columns. *Why: `truespec-product-design.md` already settled this — the site cannot see who tapped, cannot read the message, and cannot know a name or a number, so the dashboard records "WhatsApp tap from the Lexus RX 350 page" and stops there. **The PDF is the only path by which a customer's name ever enters the system, and that is load-bearing, not an extra.** Keeping both on one board is right; calling both the same thing is not, because an owner who reads a tap as a waiting customer will chase someone who only ever pressed a button.*
32. **No merging. Each car carries a tap count — "9 taps today" — with the taps themselves listed underneath.** *Why: the site does not know who the buyer is, so "the same car within 24 hours" would merge two different people who both want the same car, and the owner would silently lose one of them. A count says only what is knowable, and loses nothing, because nobody is destroyed by not being merged. **Repeat interest on one car is itself the signal** — nine taps today on one car is worth more to a dealer than nine taps spread across the lot, and it is the signal this market actually trades on.*
33. **If the tap fails to open anything, a line appears directly under the WhatsApp button — not a toast — reading: "We could not open WhatsApp. Call or text us on 0800 000 0000." The number stays visible and copyable.** *Why: the failure mode is real — a malformed link, a desktop with no Web session — and a dead button with no explanation is the worst outcome. It sits under the button because that is where the eye already is, and it is not a toast because a message about a button the owner is looking at does not need to announce itself from a corner. The number is shown, not hidden behind another tap, and stays selectable so it can be copied.*

### E. Speed, loading and errors

34. **Cards render progressively as they arrive. Before a card's data lands, its slot holds a grey block in the exact shape of a card — photo area, two text lines. No spinner.** *Why: this is the one place the research was decisive. Üzüm 2026 found progressive rendering rated most effective across every metric, and found that both developers and AI models wrongly predicted users would prefer skeletons. A card-shaped placeholder is progressive rendering *and* gives the structure benefit without the skeleton's failure mode, because the layout does not jump when content arrives.*
35. **Slow connection: the same card-shaped placeholders, plus a quiet line after 3 seconds — "Still loading." Give up at 15 seconds.** *Why: NN/g puts spinners at 2–10 seconds and progress bars beyond 10, but that is for an unknown duration. Here the wait is nearly always the network, so the honest move is to say so, name a limit, and stop. Fifteen seconds is past the point where a Nigerian mobile buyer on a metered connection will wait at all — but longer than a normal fetch, so a slow success still renders rather than erroring.*
36. **The showroom does not work offline, and nothing is queued.** If the network drops, one quiet line appears — "You are offline. Reload to see the site." — whatever is already on screen stays there, and the actions that need the network are disabled with the reason attached. **There is no cached showroom and no outbox.** *Why: you cut both as too big for this build and as contradicting Q91, and both reasons hold. A cached car list goes stale in exactly the way this product refuses to let a figure go stale, and "sending your changes later" is a promise about data the site does not own. What survives offline is the local draft, because that is the owner's own typing and keeping it costs nothing (Q84). Losing the connection mid-browse has a natural answer in this market anyway: the conversation is on WhatsApp, and a phone with no data still makes calls.*
37. **Yes — a small blurred version first, sharp after.** *Why: progressive image loading is the standard answer and pairs with Q34: the shape is already correct, so the blurred fill prevents a flash of empty space while the sharp file arrives. Applied to the cover photo first, then the rest of the gallery, never above the fold for the rest of the page.*
38. **If the page itself fails, a plain page: "We could not load this page." with Retry, and a WhatsApp link.** *Why: the fallback guidance is that the retry must be built in and should also fire automatically when the connection returns. Nothing clever — a car site whose error page is clever has wasted the buyer's time.*

### F. Light and dark mode, sharing

39. **The toggle sits in the showroom header and at the top of the office sidebar, and switching needs no page reload.** *Why: `ui-plan.md` Q7 places it and requires the tiny head script so the mode applies before paint with no flash. The no-reload part is behaviour, and follows from a client-side token swap.*
40. **The choice is remembered indefinitely, in local storage, and it is the only thing that decides the mode — the device setting is never consulted** (Q7). *Why: `ui-plan.md` Q7 settles the override and dark as the default. Indefinite is right because a theme preference is not personal data, and re-asking someone on every visit is pure friction.*
41. **A shared car link shows the cover photo, "2018 Toyota Camry — ₦12,500,000", and "TrueSpec Automotive" in the WhatsApp preview.** *Why: `ui-plan.md` Q3 already builds a 1200×630 share image for the site. Per-car it must be generated from that car's own cover photo and price, because the link being pasted into WhatsApp and Instagram *is* the first impression — research on this is blunt that a link with no preview looks unfinished and costs clicks.*
42. **Browser tab: "TrueSpec" on the home page, "2021 Honda Accord — TrueSpec" on a car page, and the section name elsewhere ("Available cars — TrueSpec", "Settings — TrueSpec").** *Why: plain and specific. On a phone with twelve tabs open, the section name is what tells a buyer whether they are looking at the car they clicked.*

### G. Office: signing in

43. **First-ever visit: the office is not linked from the showroom at all. He opens the office URL and gets the create-account card from `ui-plan.md` Q46.** *Why: there is no public sign-up for a single-owner admin. One account, created once. Any "sign up" link on the showroom is an invitation to attack the login.*
44. **A wrong password gives one generic message — "Email or password is not right." — every time. Wrong attempts get slower rather than being locked out: the delay grows with each failure inside a window, and there is a per-IP limit on how many attempts are even looked at.** *Why: `ui-plan.md` Q45 already specifies one generic message, and the reason is that a message distinguishing "no such email" from "wrong password" enumerates accounts to anyone who tries. **I proposed locking the only account for 15 minutes, and you are right to refuse it:** with one account in the whole product, a lockout is a denial-of-service that anyone on the internet can trigger against the owner, who then has no way in except the email he may not have. Growing delays cost a genuine typist a few seconds and cost an attacker an evening; the per-IP limit is what stops a distributed guess without ever closing the door on the owner. **The shape is settled — delay, never lock. The numbers are still a risk appetite and yours to set** (section 7).*
45. **Session lasts 12 hours, or 7 days with "keep me signed in". Confirmed.** *Why: the timeout has to be long enough not to interrupt a real task and short enough to protect a shared device, and this office is intermittent work — check the stock, photograph a car, check again — so twelve hours covers a working day without leaving a signed-in office on a shared machine. **Auth is Clerk since the owner's stack ruling of 2026-10-08 (A8):** the seven-day cap is **Clerk's default setting**, and the twelve-hour inactivity timeout is **enforced in our own code** — which is exactly what this spec already required. Nothing in this design changes.*
46. **His work is kept. A draft is written locally as he types and to the server when he saves.** If the session expires, he lands on sign-in with a plain message: "Your session expired. Sign in again — your work is saved." *Why: this is the strongest argument in the unsaved-changes research for autosaving rather than warning: `beforeunload` is unreliable on mobile browsers, so a dialog cannot protect the case it exists for. The warning in Q58 is the second line of defence, not the first.*
47. **~~A "Forgot password" link on the login card, sending a reset link to the account email. The link is single-use and expires. In scope now.~~** **Superseded 2026-10-08 by F2: no in-app reset** — recovery for the one admin is via the database, stated in settings (`planning-close.md` F2; system-model J89; functionality §2.6). *Why it was here: an owner with one account and no second account has no other route back in — that need stands, F2 just answers it differently. The mechanism this answer worked out was Supabase Auth's built-in reset email (its recovery template, its deliberate non-disclosure of whether an address exists, its 2-emails-per-hour project cap, its 60-second per-address window); **that vendor is out of the stack (A8)**, so none of that detail carries anywhere. Q44's generic sign-in message stands either way. If an in-app reset is ever reopened, it is Clerk's flow to specify, with Clerk's own limits verified at that time — nothing here is a promise.*
48. **He lands on the Dashboard.** *Why: `ui-plan.md` Q47 makes it fixed. The dashboard answers "what have I got" first, which is the right first question, and it does not change between visits so nothing shifts under him.*

### H. Office: the dashboard

49. **The first three things: Available stock, Money tied up, and Recent WhatsApp taps.** *Why: in that order — what have I got, where is my money, is anyone waiting. These are the three questions that make him open the office, in the order he asks them. **Money tied up shows the confirmed figure with its coverage line and the in-progress line, exactly as `ui-plan.md` section 8 decision 4 requires** — never a single total with cars quietly dropped.*
50. **Day one, no cars: every count reads 0, every money figure reads ₦0, and one panel says "No cars yet" with an Add car button.** *Why: an empty dashboard full of zeroes and no next action is the failure mode in Q5. One button, plainly worded, and no pretending the numbers mean something.*
51. **"Needs attention" means one thing: cars with incomplete costs.** It links straight to those cars. *Why: incomplete costs are the same condition the money cards report on, so the owner meets the same idea in the same words in both places, and it is the one condition the office can actually fix. **The 24-hour unanswered rule is gone, because a tap is not an enquiry** (Q30, Q31) — counting taps as something awaiting a reply would put a number in front of the owner that he is expected to act on, when the only thing behind it is a conversation already happening in WhatsApp without us. An alert that cannot be acted on is noise on a one-person dashboard.*
52. **Every number card is a link to the list that produced it.** "Available 24" opens Inventory filtered to Available. *Why: the dashboard is a summary of the lists, so each figure should be a doorway into that list. Making him re-apply the filter he just read is wasted motion on the two or three clicks he has a phone for.*
53. **Numbers are live on load. They refresh when he returns to the tab, and never poll on a timer.** *Why: a dashboard that is stale is worse than one that updates on demand, because he cannot tell which it is. Refreshing on tab focus is the cheapest honest option — no background traffic on a metered connection, and no stale figure while he is actually looking at it. **A manual Refresh control is not needed** if focus-refresh is reliable; the empty state in Q50 covers the rest.*

### I. Office: adding and editing a car

54. **The fewest he must fill in to save: year, make, model, state and price.** Name is strongly encouraged but not required; photos and all six costs are not required. *Why: this is the same rule as the data model's minimum, and it is what makes Q59 work — a car can exist half-finished. **A car with missing costs still saves, and simply does not count toward profit or money tied up.** The consequence is already decided: the in-progress figure names it. **And a second, newer rule sits on top of it: he can save a car with no photo at all, but the car is not listed on the showroom until it has at least one photo and a price** (Q24). Price is already required to save, so in practice the gate is the photo, and it costs him nothing to keep working.*
55. **The order is Car details, Photos, Costs, Private notes — one page, no wizard, exactly as `ui-plan.md` Q51 settles.** *Why: identify, show, price, note — the order he already thinks in, and the order the data depends on. Costs last because they are the part he does while standing at the car with a phone.*
56. **It saves when he presses Save. A local draft also writes as he types, for safety only.** *Why: autosave-as-you-type is wrong for a record someone else will act on — half-typed prices would become real prices on the showroom. The draft is protection against loss, not a save. This is the split the unsaved-changes guidance ends up at: continuous saving for drafts, explicit commitment for the record.*
57. **He stays on the car, with "Car saved." and the summary panel refreshed.** A "Back to inventory" link sits next to it. *Why: he is mid-task and usually has more to enter. Sending him back to a list after every save is the standard admin behaviour and it is wrong here — the summary panel updating in place is the feedback that tells him the price and costs landed (see `ui-plan.md` Q52).*
58. **Leaving with unsaved changes asks — but only for real changes.** In the office, the dialog names what is at stake and offers **Save and leave**, **Discard and leave**, and **Stay editing**, with Stay as the default and the safe choice on Escape. *Why: the pattern is well documented and the details matter. The dirty flag is computed against a normalised baseline, so a trailing space does not trigger it — a warning that cries wolf gets dismissed by reflex, which destroys the one thing it was for. In-office navigation gets *our* dialog because we can word it; browser tab close gets the browser's, which we cannot word, so the in-page dirty state has to explain itself first. Offering Save turns a warning into a service. **A programmatic redirect, such as the session expiring, bypasses this guard entirely** — never interrupt someone with a question they cannot act on.*
59. **Yes. A half-finished car saves at any point and stays in the list with whatever is missing named.** *Why: this is what the incomplete-costs pattern in `ui-plan.md` exists to serve. A car with no costs is a normal state, not an error, and the system is built to show it honestly rather than block it.*
60. **"Duplicate" in the row's ⋯ menu copies the car into a new draft, with a new reference, no photos, and state reset to Available.** *Why: dealers stock the same model repeatedly — three Camrys, different years and colours. Copying beats retyping, and resetting the state stops a finished car being duplicated as already sold.*
61. **Validation appears when he leaves a field, not as he types.** Format — thousands separators, currency, rate — applies live as he types. *Why: scolding someone mid-word is how forms get abandoned. Correcting on blur catches the real error while it is still in mind. The formatting exception is deliberate: money separators and a currency symbol are assistance, not criticism.*
62. **On a phone: one column, labels above fields, the correct keyboard for each field, sticky Save at the bottom, and the keyboard never covering the field being typed in.** *Why: the form guidance is specific and consistent — labels above on small screens, `inputmode` so money brings up a numeric keyboard, `enterkeyhint` so the key says the right thing, and layout or scroll padding so the on-screen keyboard does not hide the input. `type="number"` is avoided for money because its spinners and leading-zero stripping cause real entry errors.*

### J. Office: costs

63. **There is no "add a cost line" — the six cost types are always six rows, in a fixed order.** He fills a row to add a cost; he edits the row to fix one. *Why: the data model has a fixed set of six cost types per car. Making them fixed rows means he never has to remember the type names, never picks a near-duplicate, and the running total can always be laid out the same way. This is a data-model consequence expressed as behaviour.*
64. **Yes. The landed cost and profit in the summary panel update as he types in any cost row.** *Why: `ui-plan.md` Q52 already promises profit updating beside him while he types, and this is the behaviour that makes it true. It is also the fastest feedback loop in the office — he is checking whether a car still makes money.*
65. **A blank line reads "Not entered — clearing", in gold with a warning icon, naming the cost. A dollar line with an amount but no rate reads "Rate needed".** *Why: this is `ui-plan.md` Q53 and Q65 exactly, and the reason is the one that started it — a missing line must never be able to read as ₦0. Naming which cost is missing, in words, in the row, is what stops it being counted as nothing, and attention is gold plus an icon plus words rather than an amber tint alone.*
66. **The summary panel shows the arithmetic: every cost line's naira equivalent, then the total, right-aligned with tabular numerals.** *Why: he is checking his own work, not trusting it. Showing the lines lets him see *which* line is wrong; showing only the total makes him go back through six rows with a calculator. Tabular numerals are settled in `ui-plan.md` Q18.*
67. **Yes — 8 seconds, same as the delete window.** *Why: `ui-plan.md` Q73 already sets the toast timer at 8 seconds. A deleted cost line is the same class of mistake as a deleted photo: recoverable, and a toast-undo is kinder than a confirmation dialog for something this small.*

### K. Office: photos

68. **Both. Drag-and-drop on a desktop; tap to choose on a phone, which is also the only route that opens the camera.** *Why: the tap route is the one that matters here — adding a car with photos from the camera is named in `ui-plan.md` Q80 as a task that must work well on a phone, and Nigerian owners photograph cars on their phones. Drag is a convenience layered on top, never the only route.*
69. **Each thumbnail shows its own progress bar.** One photo failing gets "Upload failed" on that thumbnail with a Retry, and **the rest of the upload and the save both continue.** *Why: per-item progress is what makes a five-photo upload legible. Failing the whole car because one file had a bad connection is the wrong trade in a market with intermittent mobile data — and the failed photo is recoverable by Retry, so there is nothing to gain by blocking.*
70. **The first photo is the cover by default and is badged "Cover". Any thumbnail can be made the cover, which moves it to first.** *Why: `ui-plan.md` Q54 settles the drag-reorder-and-badge behaviour. The addition here is that the cover is the thing that earns the click on a shared link (Q18, Q41), so changing it must be easy from any position.*
71. **Drag on desktop. On touch, "Move to start" and "Move left/right" in the ⋯ menu — drag is not the only route.** *Why: drag-and-reorder is unreliable with a thumb and often unusable on a phone. The enquiry board in `ui-plan.md` Q55 already takes this position for the same reason, so this is consistent rather than a new rule.*
72. **Rejected before upload, with the reason named:** over 10MB, or not a JPEG, PNG or WebP. *Why: rejecting on type before upload saves the owner's data allowance on a metered connection — the failure would otherwise happen after the whole file has crossed the network. Naming the reason is what makes it actionable rather than a dead end.*

### L. Office: states and moving cars

73. **The state pill in the inventory row opens a dropdown of states in the car's group. One tap to open, one to choose — two taps, no confirmation.** *Why: changing a state is the most frequent office action after editing, and it is trivially reversible, so a confirmation would be pure friction. Change a state while typing a car, not in a modal — see I and `ui-plan.md` Q51.*
74. **Confirmation before the two things that are not cheaply reversible: deleting a car, and marking a car sold.** Nothing else asks. *Why: deleting is recoverable by Restore (`ui-plan.md` Q67) so it could be a toast-undo — but a car is the owner's inventory and the record a buyer may already be holding a link to, so it asks first. Marking sold creates a sale record and moves the car out of the showroom, so it asks. Everything else in the office is either undoable or trivially re-typed.*
75. **The car's history is on the car page and in the activity log: who changed what, when, and the old value beside the new.** *Why: `ui-plan.md` Q57 already has the activity log with time, who, what and record. Showing old → new is what makes it useful when a price was typed wrong; "price changed" alone leaves him guessing.*
76. **When a change moves a car between groups, or completes its costs so it starts counting, the car page says so in a line — not a toast, because it changes what a number means.** *Why: the same rule as the money cards: a figure silently changing its reach is how a wrong number travels. If completing the clearing cost moves a car into profit, he should be told that his totals just changed and why.*

### M. Office: enquiries

77. **A badge count on Enquiries in the sidebar, and the tap on the dashboard's Recent WhatsApp taps list. No push notification, no email alert.** *Why: he is one person, usually with the office open in a tab, and the tap list is already on the first screen of the dashboard. A push notification on a browser he may have closed is noise. If enquiries start arriving faster than he checks, that is a later change — recorded in section 7 as open rather than pre-built.*
78. **Drag the card to another column on a laptop; use the state dropdown on the card on a tablet or phone.** *Why: `ui-plan.md` Q55 settles this — dragging between columns is hard on touch. The behaviour question here is only what "handled" means: it is a customer state, editable in Settings, not a fixed flag.*
79. **The enquiry row links to the car's page. On the car page, a drawer lists that car's enquiries and taps.** *Why: the conversation started about a car, so the car is the natural place to find it later. This is the join that makes the two lists worth having.*

### N. Safety and feedback

80. **Ask: delete a car, mark sold, and discard unsaved changes.** **Do not ask: any field edit, photo reorder, photo delete, cost edit, marking an enquiry handled, restoring a deleted car, and removing a state that cars are using — that one is a disabled button with the reason beside it, not a question.** *Why: the test is whether the action is cheaply reversible, not whether it feels important. Every "do not ask" item above is either undone with a toast or fixed by typing the old value back. A confirmation on a reversible action trains people to click through confirmations, which is exactly what makes the two that matter get clicked through too. **Corrected on your ruling:** this answer previously listed removing a state in use as something that asks. It does not — `truespec-product-design.md` settles that a state in use cannot be deleted, so `ui-plan.md` Q59 wins and the button is disabled with "3 cars use this state. Move them first." beside it. The office has three dialogs, not four.*
81. **Undoable:** photo delete, cost line delete, photo reorder — 8 seconds, toast with Undo. Deleting a car asks first, then offers Restore for 8 seconds. **Not undoable:** marking sold (correct it by editing the sale record), anything already sent in WhatsApp. *Why: the toast window is settled at 8 seconds in `ui-plan.md` Q73. The distinction that matters is that an undo window is for mistakes you do not notice, and a confirmation is for mistakes you do.*
82. **Success is a toast reading what happened — "Car saved." Success is silent when nothing was at stake.** Failure is inline and specific: a field error sits under its own field naming the problem; anything else is "We could not save this car. Check your connection and try again." *Why: wording is settled in `ui-plan.md` Q87. The behaviour rule added here is that a success toast is reserved for an action he took deliberately — a reorder saving itself should not interrupt with noise.*
83. **It cannot happen: there is one account, created once, with no second user.** If a second session is ever added, the later save wins and the other session is told "This car was changed somewhere else. Reload to see the latest." *Why: answering this honestly matters more than engineering for it. The single-account rule is settled in `ui-plan.md` Q46, so concurrent editing is not a live case. The fallback is recorded so that if that decision ever changes, the behaviour is written down rather than invented.*
84. **In the office, a quiet line at the top: "Offline, your draft is kept on this device." Save is disabled with the reason attached, not greyed out silently. Nothing is queued, and nothing sends itself.** *Why: two of the offline rules survive your cut, because they are about honesty rather than about offline capability — never claim a server save succeeded while offline, and label local work as saved on this device. What goes with the outbox is "Back online — sending your changes", the per-item pending marks, and the permanent-failure recovery: those were the queue, and the queue is what needed the machinery. `navigator.onLine` still lies on a Wi-Fi network with no upstream internet, so the banner must be slow to appear and quick to withdraw. When the connection comes back the draft is still sitting there, waiting for him to press Save.*

### O. Phone, tablet, laptop

85. **Must work on a phone: read the dashboard, search and filter inventory, change a state, mark sold, check an enquiry, add a car with photos from the camera** — taken from `ui-plan.md` Q80, unchanged. **Laptop-only: the context menu, the PDF import preview, drag-reordering photos, the activity log's filters, and tooltips.** *Why: `ui-plan.md` Q80 is already the right split. The additions here are the explicit laptop-only list, because "it needs a mouse" is not currently written anywhere and will otherwise be rediscovered as a bug on a phone. **The command palette was on this list and is now cut**, so it and its shortcut are not built; it can come back later.*
86. **Tablet is a width, not a design** (`ui-plan.md` Q79): the sidebar becomes a 56px icon rail at 820–1100px, the enquiries board stays a board at 1100px and wider, and tables stay tables down to 820px. Everything else is the laptop layout or the phone layout, with nothing existing only because the device is a tablet. *Why: the reasoning holds — a tablet is a laptop with a touchscreen, so the only things that must change are the parts a finger cannot reach. One main WhatsApp button per screen size applies here too (Q22): the bottom bar on tablet, the small header link.*
87. **Nothing depends on hover.** Hover reveals become always-visible or tap-to-reveal. *Why: `ui-plan.md` Q24 already requires this — "nothing depends on hover, because touch has none." The behaviour question is only what replaces it, and the answer differs by control: a card's hover detail is shown on the card permanently, an icon tooltip becomes inline text per Q74, and a hover-only menu becomes the ⋯ button that is always there (`ui-plan.md` Q76).*
88. **Tab order follows the visual order, top to bottom, left to right.** Enter activates the focused control and submits a form. Escape closes any dialog or drawer and returns focus to whatever opened it. Left/right arrows move the gallery when it has focus. **Focus is always visible, and the focused element is never hidden behind a sticky bar.** *Why: the dialog behaviour is the W3C ARIA pattern, and using the native `dialog` element with `showModal()` gets the focus trap, the Escape handling and focus restoration for free — hand-rolled traps are where accessibility bugs live. Two rules from the research are load-bearing: **Escape must work from anywhere inside a dialog or it is a keyboard trap** under WCAG 2.1.2, and **Enter must never be wired to a destructive action.** Focus-not-obscured by a sticky footer is WCAG 2.4.11 and is called out separately in the UI plan's Q52 sticky panel, so it applies to the office's sticky summary bar too.*

### P. Wording and scope

89. **Plain, short and direct. Say what happened and what to do next.** No warmth-for-warmth's-sake in the showroom, no business speak in the office. *Why: `ui-plan.md` Q87 settles the tone and its examples are the pattern. The behaviour this file adds: the WhatsApp prefilled message is written from the buyer's side, in their voice, because they are the one who has to read it and edit it.*
90. **Exact words are in the table below.** *Why: settled in `ui-plan.md` Q87, extended here for every case the UI plan did not reach, and extended again for the three dialogs whose wording you settled.*

| Situation | What the site says |
|---|---|
| Nothing here | "No cars here right now. Tell us what you want and we will find it." |
| Filters match nothing | "No cars match those filters." |
| Car gone | "This car is no longer available." |
| Sold, similar cars exist | "This car has been sold. Here are similar ones." |
| Car saved | "Car saved." |
| Car deleted | "Car deleted. Undo" |
| Delete a car, title | "Delete this car?" |
| Delete a car, text | "It will leave the showroom. You can undo for 8 seconds." |
| Delete a car, buttons | "Delete car" (red) and "Cancel" — focus on Cancel |
| Mark a car sold, title | "Mark this car as sold?" |
| Mark a car sold, text | "It will leave the showroom. Next you'll enter the sale price." |
| Mark a car sold, buttons | "Mark as sold" (red) and "Cancel" — focus on Cancel |
| State in use | "3 cars use this state. Move them first." — beside a disabled button, no dialog |
| Save failed | "We could not save this car. Check your connection and try again." |
| Field problem | Named under the field, e.g. "Enter the year as four digits." |
| Photo failed | "Upload failed." with Retry on that photo |
| Photo failed in the full-screen viewer | "Photo couldn't load" on a graphite tile, with Retry |
| Photo too big | "That photo is over 10MB." |
| Wrong file type | "Use a JPEG, PNG or WebP photo." |
| No WhatsApp on this device | "We could not open WhatsApp. Call or text us on 0800 000 0000." — a line under the button, number visible and copyable |
| Enquiry PDF unreadable | "We couldn't read any rows from this file. Check it's the enquiry PDF and try again." with "Choose another file" |
| Enquiry PDF has no rows | "This file has no rows." |
| Offline in the office | "Offline, your draft is kept on this device." |
| Back online | "You're back online. Your draft is still here — press Save." |
| Offline on the showroom | "You are offline. Reload to see the site." |
| Slow page | "Still loading." |
| Page failed | "We could not load this page." |
| Session expired | "Your session expired. Sign in again — your work is saved." |
| Wrong sign-in | "Email or password is not right." |
| Slowed down after wrong tries | "Too many wrong attempts. Wait a moment, then try again." |
| Unsaved, staying | "You have unsaved changes." |
| All costs entered | "All 14 cars have every cost entered." |
| Costs incomplete | "5 cars are still building. ₦12,900,000 entered so far." |
| Needs attention | "3 cars have costs incomplete." |
| Taps on a car | "9 taps today" |
| Changed elsewhere | "This car was changed somewhere else. Reload to see the latest." |

91. **Left out of the UX for now:** booking a test drive or viewing appointment, a finance or repayment calculator, a public enquiry form, buyer accounts or saved cars, comparison between two cars on one screen, chat or live messaging on the site, push and email notifications, multi-user accounts and roles, offline-first as a full PWA, video walkarounds and 360 spins, a language switch, image galleries beyond the fixed three thumbnails, and social sharing buttons. *Why: each of these is a real request from somewhere in the dealer market. Each is also a feature that needs a field, a screen, or a rule this model does not have, and several would change what the showroom is for. They are listed so they are visibly out of scope rather than quietly missing.*

---

## 5. Where the answers came from

**Nigerian used-car market behaviour.** BossBot's playbook for Nigerian car dealers on WhatsApp; BossBot on how Jiji and OLX sellers close; OneXportal on classifieds and the Nigerian car buyer; BusinessDay NG on Jiji, Carmart and Cars45 in Nigeria; Punch NG on Instagram as a dealer's showroom. The consistent findings: WhatsApp is over 90% of Nigerian internet users; buyers escalate from any platform to WhatsApp; buyers message several sellers at once, so reply speed wins; a 15-minute acknowledgement stops them messaging three dealers in parallel; deals above roughly ₦2–3M do not close on photos alone and physical inspection is expected; 8–12 photos is the standard package; dealers leave 5–15% negotiation room; Instagram functions as the primary showroom for many small dealers; and sold listings are actively re-pointed at similar inventory rather than left as dead ends.

**Vehicle detail pages.** Dealer.com's VDP guidance (a single repeated primary action beats many competing ones — too many CTAs *reduces* conversion; transparent pricing on the page matters; "Confirm Availability" led at 4% click-through for dealers showing clear pricing); Autotrader's merchandising relevance factors (ten or more quality photos aid both ranking and engagement; always show a price; replace placeholder imagery promptly; the first photo decides the click); Carbide Digital's VDP guidance (repeat the same action near the top, after the gallery and near the specs rather than only at the bottom; a specific description beats an auto-generated one; put trust signals where the decision happens); Cars.com's merchandising guidance on listing clarity; Space Auto and cartradewebsites on sticky mobile action bars and one-handed mobile use.

**WhatsApp click-to-chat.** WhatsApp Help Centre on click-to-chat; VASUYASHII and Sri Hayavadhana on prefilled messages, placement, mobile safety and the `wa.me` format; Chatmitra and Forgelo on desktop behaviour, fallback routes and the fact that a click is not a confirmed enquiry. Consistent on: digits only with no `+` or leading zero; URL-encoded `?text=`; editable; short and specific; written from the user's perspective; never put personal data in the URL because it lands in browser history, logs and screenshots; label the button; never cover content; keep space from other floating elements; and state realistic reply hours.

**Loading and perceived speed.** Viget's 136-participant test (skeletons worst on every measure; spinners fastest at 2.41s perceived against 2.82s); Långström 2018 in ACM proceedings (skeletons better *perceived*, spinners faster at the *task*, no significant difference); Üzüm 2026 (progressive rendering most effective, and both developers and AI models wrongly predicted skeleton preference); Nielsen Norman Group on when each indicator suits which wait, and that skeleton screens are wrong for uploads and other in-progress operations. This is the one question where the sources genuinely disagree — see section 3.

**Unsaved work and drafts.** vocab.design's unsaved-changes guard pattern; UX Patterns Guide's exit-warning boundaries; client-side-form.com on dirty-flag normalisation and the two separate guards; Cloudscape; MDN on `beforeunload` (text cannot be written, the listener should be attached only while dirty, and leaving it attached suppresses the back-forward cache). The load-bearing points: normalise before comparing, guard the in-app route separately because that dialog is ours to word, offer Save rather than only Discard, make the safe choice the default and what Escape does, and let programmatic redirects bypass it.

**Offline and connection.** Expensify's OFFLINE_UX guide (optimistic responses, with and without feedback, and what must never be queued); vocab.design's offline indicator (a condition, not an event — persistent, and it must say what still works, what is queued and how stale); UX Patterns Guide's offline-state boundaries; ProgressiveWebApps on outboxes, lie-fi and retry; Next.js's offline support documentation, including why `navigator.onLine` is unreliable.

**Forms and mobile input.** Google Chrome's modern web guidance on `type`, `autocomplete`, `inputmode` and `enterkeyhint`; web.dev's OTP guidance for why `type="number"` is wrong for numeric entry; CSS-Tricks on `inputmode="decimal"` over `type="number"`; Baymard's touch-keyboard cheat sheet; the US Department of Labor's mobile form guidance on labels above fields, correct keyboards, tap over type and auto-formatting.

**Dialogs and keyboard.** W3C ARIA Authoring Practices on the dialog and alertdialog patterns (focus moves in, Tab cycles inside, Escape closes, focus returns to the invoker, and focus the least destructive action for an irreversible step); accessibility.build on the native `dialog` element, why a closing dialog's outcome needs a live region, and why Escape must never be disabled; W3C's own dialog role guidance.

---

## 6. The five answers that depend on files I could not read

Open these with the built pages and check them. Everything else stands on the documents and the research. Q15 has left this list — the slider is the owner's to handle separately (Q15 to Q18).

| # | What to check | If it is wrong |
|---|---|---|
| Q34/37 | Do the built pages reserve the photo space before a photo loads? | If space is not reserved, the grid jumps as photos arrive. This is the single highest-value fix in the file. |
| Q8 | Does switching tabs preserve scroll position? | Needs scroll restoration per tab. |
| Q14 | Does browser-back from a car page restore the filter and page number? | Needs the filter and page in the URL — build requirement, section 8. |
| Q41 | Is there a per-car share image, or only the site-wide one from `ui-plan.md` Q3? | Per-car needs generating from the car's cover photo and price. |
| Q49/64 | Confirm `summary()` in the office draft has no partial-car logic. | The document says it sums costs entered so far, so it does not. This one is confirmed by document, not code. |

---

## 7. Decisions settled here, and what is still open

### Settled by this file
1. **The buyer path is four steps and no more** — land, see, open, WhatsApp. No buyer account, no cart, no public form.
2. **A shared car link must work standalone.** It is the most common way in, so the page cannot require navigation to be useful.
3. **Sold cars leave the showroom and redirect to similar stock** with a WhatsApp route, following the market's own pattern.
4. **Sold is a group in the office, not a showroom tab.** The showroom has exactly three tabs.
5. **Grids load progressively with card-shaped placeholders. No spinners, no skeleton page.** Uploads use progress bars per photo, never placeholders.
6. **Every money figure carries its coverage and its in-progress line**, exactly as `ui-plan.md` section 8 decision 4 requires. Behaviour here confirms it in every place a figure appears.
7. **Drafts autosave on the device; the record saves only on Save.** The unsaved-changes dialog is the second line of defence, not the first, and it never fires on a clean form.
8. **A tap is a tap.** Never an enquiry, never a message, never a customer the site claims to know. The board counts them — "9 taps today" — and the tap endpoint is rate-limited because it is public.
9. **A car needs at least one photo and a price to be listed.** Without them it is a draft, and the office still works on it.
10. **One main WhatsApp button per screen size**, with a small link in the header. Never three at once.
11. **Ask before two things only** — deleting a car, marking it sold. Everything else is undoable or re-typeable.
12. **Nothing depends on hover. Escape closes every dialog. Enter never triggers a destructive action.**
13. **Validation on blur, formatting live.**
14. **Offline is not a feature here.** No cached showroom, no outbox, nothing queued. The local draft is kept, and it is labelled as kept on the device rather than saved.
15. **A wrong sign-in slows down; it never locks the owner out.** Growing delay plus a per-IP limit, because there is exactly one account to attack.

### Open — these need your number, not my pattern
| # | Question | Why it is yours |
|---|---|---|
| Q44 | The numbers on the growing delay and the per-IP limit | The shape is settled — delay, never lock. How fast it grows and how many attempts one IP gets is a risk appetite against someone guessing your password. |
| Q53 | Whether the dashboard needs a manual Refresh | I left it out because focus-refresh should cover it. If you distrust that, say so. |
| Q77 | Whether taps need an alert beyond a badge | I left it out for one owner with a tab open. If taps start arriving faster than you check, it changes. |

---

## 8. Build requirements this file creates

Not decisions — consequences. Each needs doing for the behaviour to work.

1. **Filter, tab and page number live in the URL** on showroom list pages, so back from a car page restores position (Q14) and a link can name a tab (Q7).
2. **Photo space is reserved before load** in every card and in the car page gallery, or the layout jumps (Q34, Q37).
3. **A local draft store** in the browser, written as the owner types, plus server-side drafts (Q46, Q56, I). **Nothing queues itself to send** (Q84).
4. **A route guard separate from `beforeunload`,** with the bypass a programmatic redirect needs (Q58).
5. **Every upload is resized on arrival into the sizes the pages actually use** — card, gallery, thumbnail, share image — so no page downloads a full-size file, and the resized set is what gets served (Q54, Q37).
6. **Per-car share metadata** generated from the car's cover photo, name and price (Q41).
7. **A tap logger with a per-IP rate limit**, and a per-car per-day tap count the board can read cheaply (Q30, Q32). Nothing it records is treated as a customer.
8. **A failed-sign-in counter per IP with a growing delay, and no account lock** (Q44).
9. **Password recovery: none in-app (F2)** — recovery is via the database, stated in settings; Q47's reset-email build was superseded when F2 landed, and its vendor has since left the stack (A8). **Session limits:** the 7-day cap is Clerk's default setting; the 12-hour session (Q45) is enforced in our own code — verify Clerk's configuration at implementation, its default carries the cap and our code carries the idle timeout.
10. **Correct `inputmode`, `autocomplete` and `enterkeyhint` on every field,** and scroll padding so the keyboard never covers the focused input (Q62).
11. **`dialog` with `showModal()` for every modal,** so focus trapping, Escape and focus restoration come from the browser (Q88).
12. **Per-photo upload progress and independent retry** (Q69), and file size and type checked before upload (Q72).
13. **The public showroom query carries the visibility rule**: a car is listed only if it has at least one photo and a price (Q24, Q54). *The rule itself is business logic and belongs in the product design — this is only the note that the build must apply it.*

---

## 9. Every pop-up in one place

The answers above were written per question, so the pop-ups ended up scattered. This section collects every one of them, with the behaviour in the same order each time, so the whole overlay layer can be read and built as a single thing.

**First, what is not a pop-up.** **The car page is a full page, not a modal.** Every car has its own address — `truespec.ng/car/TS-1001` — so a car can be shared, bookmarked, re-opened tomorrow and found by WhatsApp's link preview, and the back button means something. An old mockup opened a car over the grid; that is gone, and nothing in this section puts a car back into a dialog. The same is true of the not-available page, the privacy page, the sign-in card and the create-account card — each is a page you can link to. Only things that sit *over* a page belong below.

### The rules that apply to all of them

- **One blocking pop-up at a time.** A second request to open a dialog, sheet or drawer while one is open is ignored, not queued — two stacked modals mean two focus traps and no way to tell which one Escape belongs to. Toasts and banners are exempt: they stack with a blocking pop-up and never take focus.
- **Toasts: a maximum of 3 on screen** (Q73). **When a fourth arrives, the oldest goes first — unless it carries an Undo button, in which case it stays until its own 8 seconds run out.** The rule protects the one toast that still owes the owner a way back; a plain "Car saved." is the one that can be dropped, because the car page already says it.
- **What blocks the page.** Dialogs, sheets, drawers and the full-screen viewer all block: the page behind does not scroll, cannot be clicked, and the background does not move under reduced motion. Toasts, banners, dropdowns and tooltips never block.
- **Tapping outside closes a full-screen viewer, and nothing else.** For a dialog or a confirmation it does nothing at all — a scrim tap must never be able to discard unsaved work or answer a question nobody answered. For the filters sheet, tapping outside is the same as Escape.
- **Every blocking pop-up uses the native `dialog` element with `showModal()`** (build requirement 11), which is where the focus trap, the Escape handling and focus restoration come from.
- **Focus goes in, and comes back out.** Focus lands on the safest control, and closing returns focus to whatever opened it (Q88). Escape must work from anywhere inside a blocking pop-up or it is a keyboard trap.
- **Focus always lands on the safe choice, and Enter never triggers a destructive action** (Q88). In both confirmation dialogs, Cancel takes the focus, so a reflex Enter dismisses rather than destroys.
- **Button layout by width.** Laptop and tablet keep the buttons in a row, main action rightmost (Q71). **On a phone the buttons stack full width — the safe choice on top, the destructive one at the bottom**, so the destructive button is never the one under a thumb that has just arrived at the screen.
- **No pop-up is the only place a figure's meaning is stated.** Anything material also exists in the page, and no tooltip carries a figure's reach (Q74, Q65).
- **Nothing important lives in a tooltip.** The reason a control is unavailable is always plain text beside the control, where it is read without hovering and read on every device. **A tooltip is only ever an extra hint, and only on an icon-only button on a laptop** — the one place a mouse exists to hover with. On a phone there is no tooltip at all, so nothing may depend on one.

### A. Modal dialogs and confirmations

**Three dialogs, and no more.** A disabled button with the reason beside it is not a dialog — see *Remove a state that cars are using* under section I.

**Unsaved changes — office, add/edit car, and any page with real changes**
1. **Opens on:** navigating away from a dirty page. The dirty flag is computed against a normalised baseline, so a trailing space does not trigger it (Q58).
2. **Kind:** modal dialog, 440px (Q71).
3. **Says:** "You have unsaved changes." (Q90).
4. **Buttons:** **Save and leave**, **Discard and leave**, **Stay editing** — Stay editing is the default and the rightmost button, so it is both the default and the main action (Q58, Q71).
5. **Closes by:** the three buttons, or Escape, which resolves to Stay editing. **Tapping outside does nothing** — this dialog has no scrim close.
6. **Focus in:** Stay editing. **Focus out:** the field he was last in.
7. **The page behind:** blocked, no scroll, no click.
8. **Phone / tablet / laptop:** **on a phone the three buttons stack full width — Stay editing on top, Discard and leave at the bottom**, because Discard is the one that cannot be undone. Laptop and tablet keep the row, main action rightmost (Q71).
9. **If it fails or is interrupted:** **a session expiry bypasses this guard entirely** — no question the owner cannot act on. The dialog closes, he lands on sign-in, and "Your session expired. Sign in again — your work is saved." with the draft intact (Q58, Q46).
10. **Status:** **settled**.

**Delete a car — office, inventory row or car page**
1. **Opens on:** Delete on a car row, or Delete in the ⋯ menu (Q74, Q80).
2. **Kind:** modal dialog, 440px (Q71).
3. **Title:** **"Delete this car?"** **Text:** **"It will leave the showroom. You can undo for 8 seconds."**
4. **Buttons:** **"Delete car"** — Danger, red (Q60) — and **"Cancel"**. **Focus lands on Cancel, and Enter never deletes.**
5. **Closes by:** either button, or Escape, which cancels. **Tapping outside does nothing.**
6. **Focus in:** Cancel. **Focus out:** the Delete control that opened it.
7. **The page behind:** blocked.
8. **Phone / tablet / laptop:** row on laptop and tablet. **On a phone the buttons stack full width, Cancel on top and "Delete car" at the bottom** — the destructive action is furthest from the thumb that just arrived.
9. **If it fails or is interrupted:** the dialog is a question, not a transaction — if the save fails nothing is deleted and the undo toast is not offered. After a successful delete, Restore stays available for 8 seconds (Q81).
10. **Status:** **settled**.

**Mark a car sold — office, inventory row or car page**
1. **Opens on:** Mark sold (Q74, Q80).
2. **Kind:** modal dialog, 440px (Q71).
3. **Title:** **"Mark this car as sold?"** **Text:** **"It will leave the showroom. Next you'll enter the sale price."** *The second sentence is the one that earns the dialog: it tells him what happens after he agrees, so the confirmation is a step rather than a warning.*
4. **Buttons:** **"Mark as sold"** — Danger, red — and **"Cancel"**. **Focus lands on Cancel.**
5. **Closes by:** either button, or Escape, which cancels. **Tapping outside does nothing.**
6. **Focus in:** Cancel. **Focus out:** the Mark sold control that opened it.
7. **The page behind:** blocked.
8. **Phone / tablet / laptop:** row on laptop and tablet. **On a phone the buttons stack full width, Cancel on top and "Mark as sold" at the bottom.**
9. **If it fails or is interrupted:** **this one is not undoable** — it creates a sale record, and the correction is editing that record (Q81). That is why it asks. The dialog says so by pointing at the next step rather than by warning about the last one.
10. **Status:** **settled**.

**Remove a state that cars are using — office, settings. There is no dialog.**
1. **Opens on:** nothing. Nothing opens, because there is nothing to open.
2. **Kind:** **not a pop-up.** A disabled button with the reason written beside it in plain text — for example **"3 cars use this state. Move them first."**
3. **Why:** `truespec-product-design.md` settles it — only a state attached to no car and no enquiry may be removed, and in use means blocked with the reason shown. `ui-plan.md` Q59 already builds it that way, so **Q59 wins and Q80 changes**: the earlier line in Q80 that listed this among the things that ask was wrong, and it is corrected.
4. **Buttons:** none. **There is no confirmation, because there is no action to confirm.**
5. **Closes by:** nothing to close. The reason is always visible on the row.
6. **Focus:** none, and the button is unreachable by Tab in a way that matters — a disabled control takes no focus, which is why the reason cannot live in a tooltip.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** the same disabled button and the same plain-text reason on all three. **No tooltip anywhere**, because a phone has no hover and nothing important may live in one.
9. **If it fails or is interrupted:** nothing can fail. The rows that use the state are the reason, and they are named in the text — "3 cars use this state. Move them first." — so he knows what to do rather than merely what went wrong.
10. **Status:** **settled.** This is why the office has three dialogs rather than four.

### B. Bottom sheets

**Filters — showroom list, phones only**
1. **Opens on:** the Filters control, on phones (Q9).
2. **Kind:** bottom sheet.
3. **Contains:** the same filters the tablet and laptop show inline — status, make, year, price, colour (Q41) — plus **Clear all** (Q9). No sentence; it is controls.
4. **Buttons:** **Apply** and **Clear all**. Apply is the default and rightmost.
5. **Closes by:** Apply, Clear all, Escape, or a scrim tap — and **Escape and the scrim do the same thing: they close the sheet. Filters already applied stay applied; picks he had not applied are dropped.** *He gets back exactly the list he had before opening the sheet, which is what "close without applying" has to mean.*
6. **Focus in:** the sheet's heading, so the first Tab reaches the first filter. **Focus out:** the Filters control.
7. **The page behind:** blocked. This is the sheet the full-width rule exists for.
8. **Phone / tablet / laptop:** **phone only.** Tablet and laptop show filters inline and apply immediately (Q9), so on those widths there is no sheet and no Apply button at all.
9. **If it fails or is interrupted:** nothing here talks to the network, so there is no failure state. Filters live in the URL (build requirement 1), so a phone that loses signal mid-sheet keeps what he has chosen.
10. **Status:** **settled**.

### C. Side drawers and panels

**That car's enquiries and taps — office, car page**
1. **Opens on:** the enquiries control on a car's page (Q79).
2. **Kind:** drawer from the right — 480px on laptop and tablet, full width on phones (Q72).
3. **Contains:** that car's enquiries and taps, kept apart. Taps carry no name and no number; enquiries carry what a human typed in (Q31). The tap count reads "9 taps today" (Q32).
4. **Buttons:** none. It is a list, and Escape or the close control closes it.
5. **Closes by:** close button, Escape, or tapping outside (Q72, Q88).
6. **Focus in:** the drawer's heading. **Focus out:** the control that opened it.
7. **The page behind:** blocked — this is the car page, and the buyer-facing content behind it must not scroll under an overlay the owner opened by accident.
8. **Phone / tablet / laptop:** 480px on laptop and tablet, full width on phone (Q72).
9. **If it fails or is interrupted:** the tap count and the list are separate reads. If the count fails, the list still renders; a missing count is not shown as zero.
10. **Status:** **settled**.

**PDF import preview — office, enquiries, laptop only**
1. **Opens on:** choosing a file to import enquiries (Q56).
2. **Kind:** wide side panel, 720px (Q56). This is wider than the 480px drawer and is its own width — worth noting, because Q72's drawer width does not cover it.
3. **Contains:** a table of the rows read from the file. Rows needing attention are marked in gold **with the reason written beside them**, never a lone symbol (Q65). Summary line: **"12 rows ready, 2 need attention"** (Q56).
4. **Buttons:** **Confirm** — nothing is saved until he presses it (Q56) — and **Cancel**, which matches every other dialog in the office. **On a file that could not be read at all, the button is "Choose another file".**
5. **Closes by:** Confirm, close button, Escape, or outside tap. **Confirm on Escape would be a data-loss bug**, so Escape cancels.
6. **Focus in:** the summary line, so the first thing read is how much of the file was understood.
7. **The page behind:** blocked.
8. **Phone / tablet / laptop:** **laptop only** (Q85). A 720px table of rows does not survive a phone, and the import is not a phone task in Q80.
9. **If it fails or is interrupted:** two failure sentences, and **nothing is saved either way**. **No rows read: "We couldn't read any rows from this file. Check it's the enquiry PDF and try again." with a "Choose another file" button.** **A file that read but held none: "This file has no rows."** *The first says what went wrong and how to fix it and offers the next move; the second says only what is true, because an empty enquiry file is not an error and should not look like one.*
10. **Status:** **settled**.

### D. Full-screen viewers

**Photo gallery — showroom, car page**
1. **Opens on:** tapping any photo in the gallery (Q21).
2. **Kind:** full-screen viewer — not a dialog, though it behaves like one.
3. **Contains:** the photo, and the arrows and counter the gallery has (Q20).
4. **Buttons:** a close button; arrows to move.
5. **Closes by:** **the close button, Escape, or tapping outside** — all three, deliberately, because Escape is required for keyboard users and outside-tap is the gesture a phone user tries without being told (Q21). **This is the only pop-up in the product that a tap outside closes.**
6. **Focus in:** the close button, so a keyboard user can leave immediately. **Focus out:** the thumbnail that opened it. Left/right arrows move between photos when the viewer has focus (Q88).
7. **The page behind:** blocked.
8. **Phone / tablet / laptop:** swipe on phone; arrows always visible on phone; hover arrows on laptop (Q20). A single-photo car has **no viewer and no counter at all** — the photo is simply full width (Q23), which also means this viewer does not exist for that car.
9. **If it fails or is interrupted:** **a photo that will not load shows the graphite tile reading "Photo couldn't load", with a Retry on it** — the same graphite placeholder family as "Photo coming soon" (Q29). **It is not skipped silently.** *The hero skips a failed photo and advances, because a broken image in the largest element reads as a broken site (Q18). Inside the viewer the opposite is right: the buyer asked for this specific photo, so silently jumping to a different car would show them something they did not ask for. One photo is one car, and saying so is the honest answer.*
10. **Status:** **settled**.

### E. Toasts

**Every toast in the product, in one entry** — they differ only in words and what the button does.
1. **Opens on:** an action completing. The whole list is fixed: **"Car saved."** (Q82, Q57); **"Car deleted. Undo"** (Q67, Q81); the Restore window for 8 seconds after a delete (Q81); cost-line delete, photo delete and photo reorder, each 8 seconds with Undo (Q81). A success is silent when nothing was at stake — a reorder saving itself does not announce itself (Q82).
2. **Kind:** toast.
3. **Says:** the sentence above, and nothing else. No figure appears in a toast without its coverage line (Q49, Q65).
4. **Buttons:** **Undo** on the five undoable ones. None on "Car saved."
5. **Closes by:** **an 8-second timer with a gold progress line** (Q73). Undo closes it early. A toast does not close by Escape — it has no focus.
6. **Focus:** never takes it. The owner's hands are on the keyboard; stealing focus for an 8-second message is the thing Q88 rules out.
7. **The page behind:** never blocked. Fully scrollable and clickable underneath.
8. **Phone / tablet / laptop:** **bottom-right on laptop; bottom-centre above the bottom bar on phones** (Q73). On a phone it must clear the sticky WhatsApp bar and the sticky Save bar — the failure mode of a bottom bar covering content is named in Q22.
9. **If it fails or is interrupted:** a failed save does not get a toast — failure is inline and specific: "We could not save this car. Check your connection and try again." (Q82). **A toast whose page navigates away is lost, and nothing re-raises it.**
10. **Status:** **settled**.

### F. Dropdowns and menus

**State dropdown — office, inventory row**
1. **Opens on:** tapping the state pill in a row. One tap to open, one to choose — **two taps, no confirmation** (Q73).
2. **Kind:** dropdown.
3. **Contains:** the states in that car's group.
4. **Buttons:** none — the states themselves are the options.
5. **Closes by:** choosing one, Escape, or tapping outside.
6. **Focus in:** the selected state. **Focus out:** the pill.
7. **The page behind:** never blocked. It is one control replacing itself.
8. **Phone / tablet / laptop:** on all three — this is the row's control at every width.
9. **If it fails or is interrupted:** changing a state moves the car between groups. **The car page says so in a line — not a toast, because it changes what a number means** (Q76). If the save fails, the pill returns to what it was.
10. **Status:** **settled**.

**State dropdown on an enquiry card — office, tablet and phone**
1. **Opens on:** tapping the card's state dropdown, where there is no board to drag across (Q78, Q55).
2. **Kind:** dropdown.
3. **Contains:** the customer states, which are editable in Settings — a customer state, not a fixed flag (Q78).
4. **Buttons:** none.
5. **Closes by:** choosing, Escape, or outside tap.
6. **Focus in / out:** the dropdown in, the card control out.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** **tablet and phone only.** Laptop uses the board, where the card is dragged between columns (Q78).
9. **If it fails or is interrupted:** marking an enquiry handled is deliberately **not** confirmed (Q80) — it is undoable by choosing the other state.
10. **Status:** **settled**.

**The ⋯ row menu — office, every table row**
1. **Opens on:** the ⋯ button (Q76).
2. **Kind:** menu.
3. **Contains:** **Duplicate** on a car row (Q60) — a new draft with a new reference, no photos, state reset to Available. **"Move to start", "Move left" and "Move right"** on a photo (Q71) — the touch route to reordering, because drag is unreliable with a thumb. Delete, Restore and Mark sold also live here rather than being bare icons.
4. **Buttons:** none beyond the items; the menu may carry a close button.
5. **Closes by:** choosing an item, Escape, or tapping outside.
6. **Focus in:** the first item. **Focus out:** the ⋯ button.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** **all three widths**, and on phones it is the *only* route to reorder a photo (Q71).
9. **If it fails or is interrupted:** each item is independently undoable or re-typable — Duplicate is a new draft, a reorder gets 8 seconds of Undo (Q81).
10. **Status:** **settled**. **One naming point:** `ui-plan.md` Q76 calls this desktop-only, and the right-click context menu is genuinely laptop-only. The ⋯ menu itself must exist on touch, or Q71 has no route on a phone. I am reading Q76 as "the context menu is desktop-only" rather than "the ⋯ menu is"; flag it if you meant otherwise.

**Tooltips — laptop only, and never load-bearing**
1. **Opens on:** hovering an **icon-only** button on a laptop (Q74).
2. **Kind:** tooltip — near-black with light text in both modes, thin border in dark mode (Q74).
3. **Contains:** an extra hint, and nothing that has to be understood. **Nothing important lives in a tooltip.** The reason a control is unavailable is always plain text beside the control — which is why the disabled delete button on a state in use writes "3 cars use this state. Move them first." on the row rather than hiding it in a hover.
4. **Buttons:** none.
5. **Closes by:** the pointer leaving, or Escape.
6. **Focus:** never takes it. It is a convenience for a mouse, not a keyboard route.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** **laptop only. On a phone and on tablet there is no tooltip at all**, so nothing may depend on one — Q87 forbids depending on hover, and this is what that means in practice.
9. **If it fails or is interrupted:** irrelevant; it carries no state.
10. **Status:** **settled**, and it is now consistent with `ui-plan.md` Q74 and Q87 instead of sitting between them.

### G. Banners and page-level lines

**Offline — office**
1. **Opens on:** the connection dropping (Q84).
2. **Kind:** banner, quiet line at the top of the office.
3. **Says:** "Offline, your draft is kept on this device." (Q90). **Save is disabled with the reason attached, not greyed out silently** (Q84).
4. **Buttons:** none.
5. **Closes by:** the connection returning — never by dismissal. Dismissing it would hide the reason Save is disabled.
6. **Focus:** takes none. It is announced politely to a screen reader rather than focused.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** same line on all three; on a phone it sits above the sticky Save bar.
9. **If it fails or is interrupted:** `navigator.onLine` still lies on a Wi-Fi network with no upstream internet, so **the banner must be slow to appear and quick to withdraw** (Q84). Nothing is queued — when the connection returns the draft is still sitting there, waiting for him to press Save.
10. **Status:** **settled**.

**Back online — office**
1. **Opens on:** the connection returning.
2. **Kind:** banner, same slot as the offline line.
3. **Says:** "You're back online. Your draft is still here — press Save." (Q90).
4. **Buttons:** none — **not** a Send button. Nothing sends itself (Q84).
5. **Closes by:** dismissal, or being replaced by the next action's outcome.
6. **Focus:** none.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** same on all three.
9. **If it fails or is interrupted:** this is the banner that used to head a queue. The queue is cut, so the honest version has no work to do beyond telling him the draft survived (Q84).
10. **Status:** **settled**.

**Still loading — showroom**
1. **Opens on:** 3 seconds into a load that has not finished (Q35).
2. **Kind:** banner — one quiet line, not a pop-up over the page.
3. **Says:** "Still loading." (Q90).
4. **Buttons:** none.
5. **Closes by:** the page arriving, or the 15-second give-up (Q35).
6. **Focus:** none. **This is not a spinner** — cards hold card-shaped placeholders and this line sits beside them (Q34, Q35).
7. **The page behind:** never blocked. He can keep scrolling what has arrived.
8. **Phone / tablet / laptop:** same on all three.
9. **If it fails or is interrupted:** at 15 seconds it gives up and becomes the page-failed state: "We could not load this page." with **Retry**, plus a WhatsApp link (Q38).
10. **Status:** **settled**.

**Costs still building — office, dismissible**
1. **Opens on:** a page where cars have incomplete costs (Q65).
2. **Kind:** dismissible gold banner.
3. **Says:** **"5 cars are still building. ₦12,900,000 entered so far."** with a **"Show them"** button that filters the list to those cars (Q65, Q90).
4. **Buttons:** **Show them**. Dismiss.
5. **Closes by:** dismissal, or Show them, which replaces the list.
6. **Focus:** none on appearing; **Show them** takes focus only if he activates it.
7. **The page behind:** never blocked.
8. **Phone / tablet / laptop:** same on all three.
9. **If it fails or is interrupted:** the figures come from the same rule as the money cards, so this banner and those cards cannot disagree (Q49).
10. **Status:** **settled**.

**Attention box inside the drawer — office, add/edit car**
1. **Opens on:** a cost line being blank while editing (Q65).
2. **Kind:** attention box inside the summary drawer — **not** a pop-up over it, and it never blocks Save.
3. **Says:** **"Still building — clearing, trucking not entered."** (Q65).
4. **Buttons:** none. **A missing line must never read as ₦0** (Q53), so the box names the cost in words, in gold with a warning icon.
5. **Closes by:** nothing — it disappears when the costs are entered.
6. **Focus:** none. It is never focused, because focusing it would move him out of the field he is typing in.
7. **The page behind:** never blocked. A half-finished car saves (Q59).
8. **Phone / tablet / laptop:** same content everywhere; the drawer is a sticky right panel on laptop and tablet and a sticky bottom bar on phone (Q52).
9. **If it fails or is interrupted:** none — it reports local state.
10. **Status:** **settled**.

### H. Laptop-only

Everything in this group is unavailable below 1100px, and none of it has a phone substitute: the **PDF import preview** (C, above), **drag-reordering of photos** — which has the ⋯ menu as its touch route (Q71) — the **activity log's filters** (Q85), and **tooltips** (F, above).

**The command palette is cut.** It was in the office draft and in `ui-plan.md` Q75 as something to build, and it is now out: no palette, no keyboard shortcut, no pop-up entry here. `ui-plan.md` Q75 already said it could be cut if the owner would not use it, and the answer is no. It can come back later without disturbing anything else in this file — nothing else depends on it.

### I. Things that look like pop-ups and are not

Recording these because they were asked about and because each one used to be a dialog in an earlier draft.

| Thing | What it actually is | Why |
|---|---|---|
| **A car** | **A full page at its own address**, `truespec.ng/car/TS-1001` | Shareable, linkable, bookmarkable, and the WhatsApp preview needs a URL. **This replaces the old mockup, which opened a car over the grid.** Nothing here puts a car back in a dialog. |
| The privacy notice | **A page, reached by a link** in every footer and as a small link under the single main WhatsApp button on the car page (Q44) | **There is no consent or cookie pop-up anywhere in either plan, and this model needs none** — no buyer accounts (Q91), so the site holds no buyer data and sets no tracking. If analytics are ever added, this becomes a real question. |
| "This car is no longer available." | **A page**, with similar cars and "Ask for a similar car" (Q12, Q25) | A dead end with a redirect beats a sold car sitting in a grid looking available. |
| The sign-in card, the create-account card | **Pages** — a centred 380px card on the page background (Q45, Q46) | They are where the owner lands, and a link must reach them. |
| **Delete a state that cars are using** | **A disabled button with the reason in plain text beside it** — "3 cars use this state. Move them first." | The product design settles it: only a state attached to no car and no enquiry may be removed. There is no action, so there is nothing to confirm. |
| Field errors | **Inline, under their own field** — red border, warning icon, named problem (Q62, Q61) | "Enter the year as four digits." Nothing is scolded mid-word. |
| "Upload failed." with Retry | **On the thumbnail that failed**, and the rest of the upload continues (Q69) | Failing five photos over one bad connection is the wrong trade on metered data. |
| "Not entered — clearing" | **In the cost row's amount cell** (Q53, Q65) | A blank line reading ₦0 is a wrong number, not a dialog. |
| "We could not open WhatsApp…" | **A line directly under the WhatsApp button, not a toast** | The number stays visible and copyable, so a phone with no WhatsApp is not a dead end. A dead button with no explanation is the worst outcome. |

### Open — needs your call

**Nothing.** All thirteen pop-up questions are answered and settled above. The only items still open anywhere in this file are the three in section 7, and none of them is a pop-up: the Q44 delay numbers, the Q53 manual Refresh, and the Q77 tap alerts.

---

## 10. Where this plan stops

This plan covers **how each screen behaves**. It does not cover:
- **How things look.** That is `ui-plan.md`, including contrast, tokens, type scale and spacing.
- **What the owner is allowed to do,** and the feature list. Functionality.
- **The money, state and visibility rules** themselves. Business logic. This file only says where a figure is shown and what it says alongside it.
- **Screen-reader markup and focus handling as an implementation spec.** The behaviour is fixed here (Q88); the markup belongs in the system model.
- **Anything needing a data-model field I did not have.** Where I hit that wall I said so and stopped, the same as the UI plan.
- **The visibility rule itself** — what makes a car public. Your decision that a car needs one photo and a price to be listed is business logic; it is recorded here as behaviour (Q24, Q54) and mirrored as a build requirement, and the rule belongs in the product design.

---

## Change log

| Date | Change | Sections touched |
|---|---|---|
| 2026-10-08 | **Stack change folded in (owner's three rulings — `planning-close.md` A8).** Supabase is out; **Neon (data) + Clerk (auth/sessions)** are in; **enquiry PDFs move to Sanity**; the **daily maintenance job moves to a Neon scheduled function** (Vercel cron documented as the backup). Vendor names and vendor-specific reasoning updated: **Q45** now rests on Clerk's default 7-day cap with the 12-hour idle still app-enforced (unchanged rule); **Q47 is marked superseded by F2** (no in-app reset — that decision predates today and was never written back into this file); build requirement **9** rewritten to match. **No product rule changed** — session lengths, C2 delays, the listing gate, R3 and the retention defaults stand as closed. The 2026-10-05 rows below keep the words used on the day, including their Supabase references. | Q45, Q47, section 8 item 9, this change log |
| 2026-10-05 | **Your ruling on all thirteen pop-up questions, adopted — the pop-up list is now fully settled and its open list is empty.** **Removing a state that cars are using is not a dialog.** The delete button is disabled and the reason is written beside it — "3 cars use this state. Move them first." — with no tooltip anywhere, because a phone has no hover. **The product design settles this** (only a state attached to no car and no enquiry may be removed), so `ui-plan.md` Q59 wins and **Q80 changes**: it had listed this among the things that ask, and that was wrong. **The office has three dialogs, not four.** Both confirmations now carry your exact wording: **"Delete this car?" / "It will leave the showroom. You can undo for 8 seconds."** with "Delete car" (red) and "Cancel", and **"Mark this car as sold?" / "It will leave the showroom. Next you'll enter the sale price."** with "Mark as sold" (red) and "Cancel". **Focus lands on Cancel in both and Enter never destroys.** On a phone the buttons **stack full width — the safe choice on top, the destructive one at the bottom** — so the destructive action is never under the thumb that just arrived; on laptop they stay in a row. **Tapping outside closes the full-screen photo viewer and nothing else** — for a dialog it does nothing, because a scrim tap must never discard unsaved work or answer a question nobody answered. **Escape on the phone filters sheet closes it, keeping applied filters and dropping unapplied picks.** **The command palette is cut**, with its shortcut and its pop-up entry; it can come back later without disturbing anything. **Tooltips are now laptop-only and never load-bearing** — only an extra hint on an icon-only button, with the reason always in plain text beside the control, which is what finally makes `ui-plan.md` Q74 and Q87 agree instead of sitting in tension. **The fourth toast pushes out the oldest, unless that one carries an Undo**, which stays until its own 8 seconds end. **An unreadable enquiry PDF says "We couldn't read any rows from this file. Check it's the enquiry PDF and try again." with "Choose another file"; an empty one says "This file has no rows."** Nothing is saved either way. **A photo that fails in the full-screen viewer shows a graphite "Photo couldn't load" tile with Retry — never skipped silently**, because the buyer asked for that specific car. **"We could not open WhatsApp…" is a line under the button, not a toast**, with the number visible and copyable. | Q33, Q80, Q85, Q90 wording table (nine new rows), section 9 general rules, A (three dialogs plus the state-in-use note), B, C, D, E, F (tooltips added, command palette removed), H, I (two new rows), section 9 open list (now empty) |
| 2026-10-05 | **Your request, adopted: every pop-up in one place.** The pop-up behaviour was scattered across many answers, so section 9 collects all of it — four dialogs, the filters sheet, two drawers, the full-screen viewer, toasts, three dropdowns and menus, six banners and attention boxes, and the laptop-only items — each written the same ten ways: what opens it, its kind, its exact words, its buttons and default, how it closes, focus in and out, whether the page behind still works, how it differs by width, and what happens when it fails or is interrupted. **General rules added:** one blocking pop-up at a time and a second request is ignored rather than stacked, toasts and banners exempt; maximum 3 toasts; and what blocks the page versus what never does. **The car page is recorded as a full page at its own address, not a modal** — each car has a shareable link, and this explicitly replaces the old mockup that opened a car over the grid. **A separate table lists eight things that look like pop-ups and are not** — the privacy notice, the not-available page, the sign-in cards, field errors and the failed-upload message are all pages or inline text — including the finding that there is no consent or cookie pop-up anywhere in either plan and this model needs none, because there are no buyer accounts and no tracking. **One direct conflict between the two plans surfaced while collecting them:** Q80 says removing a state in use asks for confirmation, `ui-plan.md` Q59 says the delete button is disabled with a tooltip; both cannot be built, and it is first on the new open list of 13 items. Also flagged: the command palette may be cut by the owner's own ruling, Q75 has no keyboard shortcut recorded, and the ⋯ menu must exist on touch even though Q76 calls it desktop-only, or the touch route to reordering a photo has nothing. | Words used, new section 9 (renumbering the old section 9 to 10), new open list |
| 2026-10-05 | **Your ruling, adopted: taps are not enquiries, and offline is cut.** **A tap is a tap** — never an enquiry, never a message; the board carries tap counts ("9 taps today") and no merging, because the site does not know who tapped and merging would lose a real buyer. The 24-hour unanswered alert is gone and "needs attention" now means incomplete costs only. **The tap logger is rate-limited**, because it is a public endpoint and my earlier claim that it needed no spam handling was wrong. **Sign-in slows down and never locks** — growing delays plus a per-IP limit, because locking the only account in the product is a denial-of-service anyone can trigger. **The prefilled WhatsApp message now carries the car's page link and its generated reference code**, which is what makes a tap countable. **One main WhatsApp button per screen size**, with a small header link. **A car needs at least one photo and a price before it is listed**; without them it is a draft. **Every upload is resized into several sizes at upload** (new build requirement). **Password reset is in scope, and yes — Supabase Auth covers it**: `resetPasswordForEmail` with its own recovery template, no account enumeration, a 60-second per-address window and a 2-emails-per-hour project cap on the built-in provider. **Session length confirmed at 12 hours, or 7 days** — note that Supabase's time-box and inactivity limits are Pro-plan features. **The offline showroom and the outbox are cut** (Q36, Q84) because they contradicted Q91 and were too big; the local draft and a named offline banner stay, and nothing queues itself to send. Three mistakes of mine are recorded in section 3, including calling a tap an enquiry. Q15 to Q18 are now the owner's to handle separately. | Words used, section 1, section 2, section 3, Q15, Q22, Q24, Q28, Q30, Q31, Q32, Q36, Q44, Q45, Q47, Q51, Q54, Q84, Q86, Q90, section 6, section 7, section 8, section 9 |
| 2026-10-05 | **First version.** All 91 UX questions answered against the UI plan, the product model, the data model, and published research on dealer VDPs, the Nigerian used-car market, WhatsApp click-to-chat, loading patterns, unsaved work, offline behaviour, mobile forms and dialog accessibility. Six answers flagged as depending on built files that could not be read (section 6). Six numbers left open for the owner (section 7). Eleven build requirements recorded (section 8). | All |