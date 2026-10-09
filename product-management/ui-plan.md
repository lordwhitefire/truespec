# TrueSpec Automotive: UI plan

**Status:** adopted, with your changes. **Dark is the default mode, and the toggle is adopted** — a visitor's saved choice always wins, and the device's own setting is not consulted. The approved mixed design is kept as the design: **its dark strip, dark inventory band and dark footer stay dark in both modes**, so the light theme is the approved design recoloured at the surfaces that were already light. One **shared design token set** (sizes, spacing, corners, shadows) serves both the showroom and the office. **Shadows are kept** — v1's shadows and hovers are the approved look, including the hover lifts. **Full prices everywhere on the showroom**, with the hero badge as the one exception. Every decision is in section 8; every change is in the change log at the end.

> **Superseded answers, 2026-10-06.** The owner's rulings below reverse parts of this file. Where the two disagree, the change log wins: **Q8** (one gold, v1's `#c8a24a`, not two) · **Q11, Q12, Q64** (states carry owner-chosen colours; the `colour` field stays) · **Q23, Q24** (shadows kept, hover lifts kept) · **Q35** (the active tab keeps v1's gold) · **Q37** (the Special ribbon and crossed-out price are permanent) · **Q6, Q81** (tap targets follow v1's built sizes, not a flat 44px) · **Q19** (v1's type sizes stand; no snapping to a shared scale) · **Q33** (the hero keeps v1's price sort) · **Q38** (v1's mileage row is dropped; the arrival chip stands).

**What this file is.** The UI part of the product model. It answers all 95 UI questions, gives the reason for each answer in plain words, and lists exactly what to change in the pages we already built.

**Where the answers come from.**
- The showroom you approved (`truespec.html`, `car.html`, `inventory.html`) is the source of truth for its structure, content **and its look**. Nothing here changes what the pages do or how they are laid out, and nothing here restyles them. What changes is that the hard-coded colours become tokens and the theme toggle is added. **The approved design keeps its dark strip, dark inventory band and dark footer in both modes** — that mix is the approved look, not a defect. Dark mode and light mode are two colourways of the same approved design, and they differ at the surfaces that were already light, not by turning the dark ones light.
- The office (admin) has not been seen by you yet. `admin-inventory.html` is a first draft. This file sets the compact, professional direction for it.
- Two agents reviewed an earlier recommendation (the Product Management agent's dispatch and the design agent's decision). I kept what held up against the built pages and dropped what did not. The reasons are in section 2.
- The rule for how incomplete costs are shown was researched against published guidance on incomplete data in aggregates (AHRQ, Oregon Health Authority missing-data guidelines, EasyCivil construction dashboards, IFRS PS2 on materiality). The sources and what they agree on are in the change log.

**Words used.**
- *Showroom* = the public site. *Office* = the owner's admin.
- *Shared design tokens* = the one set of type sizes, spacing values and corner radii that both the showroom and the office draw from. It is called shared design tokens, **not Polaris**: Polaris covers admin screens only, and this is a showroom with an office attached.
- *Token* = a named design value (a colour, a size) defined once and reused everywhere.
- *Attention* = a system message about something the owner must act on. Gold, a warning icon, and words — never gold on its own.
- *Group* = one of the four fixed car groups: Available, On Order, Landed this year, Sold.
- *Contrast ratio* = how readable text is against its background. 4.5:1 is the minimum for normal text (WCAG 2.2 AA). 3:1 is the minimum for large text and for UI parts like input borders.
- *Confirmed* = a figure that counts only cars whose costs are all entered.
- *In progress* = the cost already entered on cars that are not finished yet.

---

## 1. The design in one page

1. **One system, two complete themes.** One shared design token set serves both sides. **Dark is the default mode**, and light is a full theme as well. No screen is ever part dark and part light.
2. **Colour is gold and grey, plus four system colours used only for messages.** Gold is the brand accent. **Red** is for errors and critical problems, and it is the only new colour. **Green** is for success, reusing the WhatsApp green. **Attention** ("costs incomplete") is gold with a warning icon and words. **Info is grey text with an icon** — there is no blue. **Never colour alone:** every message carries an icon and words.
3. **Two typefaces, as in your spec:** Oswald for headings and prices, Inter for everything else.
4. **Showroom is roomy and photo-led. Office is compact and calm.** One scale for both. They differ in density, not in tokens.
5. **Car states carry the owner's chosen colour.** The state editor gives each state a colour, set by the owner with a colour picker; the showroom and the office both read it. Special is always gold. **The written label is still what carries the meaning** — the colour is a scanning aid beside it, never the message on its own.
6. **Tap targets follow the sizes the approved pages already use.** A primary action is at least 44px on phone and tablet; a smaller control the approved design already ships stays as it is, and 32 to 36px is the range on laptop.
7. **A number always says what it counts.** Every money figure states its reach in the same display — "from 9 of 14 cars" — and anything left out is named, never hidden behind a symbol or a hover. *Why: a total that silently drops cars is wrong, and so is one that quietly adds unfinished cars. Saying which is which is what avoids both.*
8. **One price rule: the full price everywhere on the showroom** — ₦34,500,000, not ₦34.5M. **The hero badge is the single exception** (Q34), because a 96px box physically cannot hold nine digits.
9. **The approved shadows are kept.** The dark theme needs a lighter shadow colour and the light theme a darker one, so shadows are defined **per theme as tokens**, and v1's shadows, hover lifts and glows are the approved look. Borders still do the ordinary separating. *Why: the shadow's colour is the only part that has to differ between modes, and a token per theme is the whole fix — there is no reason to delete an approved effect to solve a one-value problem.*
10. **Three widths: phone, tablet, laptop.** Tablet is its own width, not its own design — everything it does is a consequence of the width it has.

---

## 2. Introspection: what I checked, what I got wrong, what I am unsure of

You asked me to look hard at my own work. This is that.

### What I checked
- I computed every contrast ratio in this file from the actual colour values (tables in section 4). I did not estimate them.
- I measured the built showroom pages: about 20 to 22 different font sizes, 3 font weights, square 3 to 5px corners on the showroom, rounded 6 to 12px corners on the office draft.
- I compared the two agents' claims with the pages we built.
- I looked up how incomplete data in an aggregate is reported where it matters — health quality reporting (AHRQ), Oregon Health Authority missing-data guidelines, construction project dashboards, and materiality guidance (IFRS Practice Statement 2). Five independent sources, all agreeing. The rule they give is section 8, decision 4.
- I recomputed every contrast ratio affected by the new gold values, and checked both system colours (red, green) in both modes. Section 4 carries the results, including the one pair that fails.

### Claims from the agents that did not hold against the built pages
| Claim | What the pages show |
|---|---|
| "Nothing has been drawn" | Four screens are built. The showroom card grid on a phone already exists. |
| "Go all-dark in the showroom" | Ruled out. The approved mixed design stands as the design, in both modes. Only the toggle is added. |
| "The demo mixes miles and km" | Every built page uses km, including "0 km" for On Order. |
| "Prices abbreviate and don't abbreviate" | Already settled in the build: full price everywhere except the hero badge. |
| New breakpoints 490/768/990/1200 | No benefit over the built 560/820/1100. A 768 breakpoint would put 810 to 834px-wide iPads in portrait on the desktop layout. (Device widths are from memory, so test on a real tablet.) |

### Things the agents got right that I am keeping
- Accessibility rules are standards and are adopted in full.
- "Status" on a showroom card must be the group name only, never the owner's own state name.
- Polaris is an admin system. It is not the showroom reference. The Motors theme and your own HTML are.
- The typeface question is yours, not a standard's.

### My own mistakes, corrected
1. **I treated the shadow's colour as a reason to delete all shadows.** That was wrong. A shadow's colour is the one value that differs between modes, and a token defined per theme solves it in two lines. Deleting the approved effect was not required by the problem, so **the shadows stay** (Q23).
2. **I deleted the State `colour` field on accessibility grounds.** The real accessibility point is narrower: colour must never be the *only* thing carrying the meaning. It can sit beside a written label. So **the colour field stays and the owner picks it**, and every state keeps its written label (Q12).
3. **The `admin-inventory.html` draft is not compact enough.** Rows are about 66px tall and money is left-aligned. This file fixes those points.
4. **I built a command palette and context menu in the office draft.** The agents advised against them. You asked for them, so I kept them. Section 3 (Q75, Q76) records them as optional.
5. **The State table in the data model has a colour field.** Section 3 (Q12) recommends removing it.
6. **I wrote "N cars excluded: costs incomplete" as the only warning on a money total.** That is a bare count: it names nothing, and research on incomplete data is clear that a count alone is read by almost nobody and quietly discredits the figure above it. It is now a named second line, and the coverage sits in the display rather than a tooltip (section 8, decision 4).

### What I am still unsure of
- **Neither mode has been seen.** The toggle does not exist yet. Both modes have to be checked on a real phone and a real laptop before launch, in each mode, on every screen. That is a build task, not a design decision, and it is in section 6.
- **Whether "₦0 because this cost does not apply" should read differently from "₦0 because it genuinely cost nothing".** Today they are the same in the data model, so the UI cannot show them differently, and it shows three states: entered, zero, not entered (Q53). Separating zero from not-applicable would need a new field on the cost line — that is the data model's business, not this plan's, and it is flagged rather than decided here.

### Decisions
The four decisions that were open are settled, decision 4 has been rewritten, and decisions 5 to 14 are the ones you have now added. See section 8.

---

## 3. The 95 answers

Each answer: **the decision**, then *why*.

### Brand and identity
1. **Logo file.** Not yet. Use the text logo: "TrueSpec" in Oswald 700 with 0.05em letter spacing and the gold gauge icon. *Why: no file exists, and one component makes the swap easy later.* When it arrives, ask for an SVG in two versions (for dark surfaces and for light surfaces) plus a square mark.
2. **Same logo on both sides.** Showroom header 32px; office sidebar 22px. *Why: your spec asks for consistency.*
3. **Yes: favicon and share image.** Favicon: gold gauge on graphite. Share image: 1200×630, graphite background, wordmark and tagline. *Why: the link will be pasted into WhatsApp and Instagram, so this is a first impression.*
4. **Tagline** shows on the home hero, in the footer, and in the page description. It does not sit under the logo. The owner edits it in Settings. *Why: header space is tight on phones.*

### Colour
5. **Showroom, both modes, and the approved design is kept as it is.** The two modes are two colourways of the approved design. The top strip, the inventory band and the footer **stay dark in both modes** — they are dark in the approved design and that is part of what was approved. Light mode is the approved design with the surfaces that were already light swapped for their light values; dark mode is the approved design with those same surfaces swapped for their dark values. *Why: the mix is the approved look. Rewriting it into an all-light theme would be a redesign of a design that was already signed off.*
6. **Office.** Both modes, built on the same tokens. *Why: one system is less work than two, and the toggle should behave the same everywhere.*
7. **Both modes, and dark is the default.** The site opens in **dark mode on every device** unless the visitor has already chosen light; their choice is remembered and always wins. **The device's own light/dark setting is not consulted** — dark is the default, so dark is the default even on a phone set to light. The visitor can switch at any time with one sun/moon button in the header (showroom) and at the top of the sidebar (office), 44px target. A tiny script in the page head applies the mode before painting, so there is no flash. Its rule: **use the saved choice if there is one; otherwise use dark.** **Every screen is checked in both modes before it ships.** *Why: this overrides the earlier "follow the device" decision. Defaulting to dark is a bigger commitment than defaulting to light, so every screen has to be seen on a real phone and a real laptop in both modes — a dark theme judged from values alone is where contrast mistakes hide.*
8. **One gold, in both modes: `#c8a24a`, v1's value.** It is the brand gold and the approved pages use it. Gold fills, gold text on the dark surfaces, gold on the gold button — all unchanged. *Why: one value is what the approved design uses and changing it would be restyling. **Known constraint: `#c8a24a` as text on a light background is 2.41:1 and fails.** So gold is never used as *text* on a light surface — see Q88 and the section 4 note — and on the grey panel it is not used as text at all.*
9. **Gold is the only brand accent.** WhatsApp green is only for chat. *Why: your "no other colours" rule.* State colours (Q12) are the owner's own choices, and system colours (Q10) are system colours, neither of which is a brand accent.
10. **System colours,** by mode. **Red** is for errors and critical problems, and it is the only new colour. **Green** is for success, reusing the WhatsApp green. **Attention** is gold. **Info is grey with an icon — there is no blue.**

| Role | Light mode | Dark mode | Where it appears |
|---|---|---|---|
| Error / critical | `#b3261e` | `#ef5b52` | Field errors, failed saves, negative profit, critical problems |
| Success | `#1b7a4b` | `#3fb27f` | "Car saved.", restored, completed |
| Attention | `#8a6d1f` — the light gold | `#c8a24a` — the dark gold | "Costs incomplete", "Rate needed", "Not entered" |
| Info | `#5d636a` grey | `#9aa0a6` grey | Neutral information, always with an icon |

    **Red and green each have two shades, one per mode, and both pass.** Ratios are in section 4. **The WhatsApp green `#25d366` is a fill colour only**, always with dark text on it: 8.52:1 for that text, and nowhere near readable as text on white — which is exactly why success text uses the darker shade of the same green.
    **Never colour alone.** Every one of these carries an icon and words (Q62, Q65, Q90).
11. **Every car state carries a colour, chosen by the owner.** The showroom ribbon and the office label both take the state's colour, with a written label beside it. **Special is always gold** and is not editable. Available, On Order and Landed each have a default colour set in the state editor. *Why: a colour is a scanning aid, not the message — so it must never be the only thing there. The written label carries the meaning (Q90); the colour sits beside it so a buyer can find "On Order" at a glance without depending on it.*
12. **The owner picks the state colours, in the state editor.** One colour per state, set with a colour picker on the Car states settings page (Q59). **No random generator** — the picker is the only way in. **The `colour` field stays on the State table**, and the showroom reads it through the public layer so the public pages never load private office data. Every state needs a readable label colour: the ink is chosen per state by contrast, so a colour the owner picks can never make its own label unreadable. *Why: with the written label always present, colour is free to be useful rather than dangerous.*
13. **Dark text on gold buttons: final.** `#1a1405` on `#c8a24a` is 7.61:1. White on gold is 2.41:1 and fails.
14. **Flat colours only.** Allowed exceptions: the dark overlay over hero photos and the grey tile behind photos that are loading. *Why: a gradient used for readability is functional.*

### Typography
15. **Oswald (headings, prices) and Inter (body): final,** with `Impact, sans-serif` and `system-ui, sans-serif` fallbacks. *Why: your build spec names both, and the approved pages use them. The "one family, one weight, two sizes" idea came from an agent's recommendation, not from the client's brief, so it is dropped. The type-scale cleanup in Q19 is a tidy-up, not that rule.*
16. **Uppercase** for Oswald headings, showroom tabs and showroom buttons. **Sentence case** for body text and for all office buttons. *Why: uppercase looks right on the showroom; a compact office reads faster in sentence case.*
17. **Smallest size 12px** (captions, badges, table headers). Body text is 14px or larger. *Why: below 12px is hard to read on phones.*
18. **Money.** Showroom prices and stat numbers: Oswald 600. Office table money: Inter 600 with tabular numerals, right-aligned. *Why: aligned digits make columns scannable.*
19. **The approved pages' type sizes are kept.** There is no shared scale to snap to and nothing provisional. Both sides use Oswald for headings and prices and Inter for body; 12px is the floor; the ~22 sizes the showroom already uses are the sizes. *Why: those sizes were approved as drawn. Replacing them with a named scale is a redesign of type, and it buys nothing on a two-page site.**

### Layout, spacing and shape
20. **Widths.** Showroom: 1250px content with 24px side padding. Office: fluid, up to 1440px.
21. **Spacing.** One 4px base scale, shared by both sides: 4, 8, 12, 16, 24, 32, 48, 64, 96. The showroom uses the larger steps (section padding 64 to 96); the office uses 8 to 24. *Why: shared values, different density. That is the whole difference between the two sides — one scale they both draw from, not two scales to keep in step.*
22. **Corners. One shared set:** control 4px, card 4px, modal 8px, pill 999px. Both sides use these, so the showroom's approved 3 to 5px look survives — 4px is inside it — while the office's 6/8/12 collapses onto the same numbers. *Why: one set of corners is what makes two screens look like one product. Keeping the showroom square is a matter of choosing the small end of the shared scale, not of keeping a second scale.*
23. **Depth: the approved shadows, in both themes.** v1's shadows stay exactly as approved — the gold and green info boxes, the floating WhatsApp circle, the gallery arrows, the related-card hover shadow and the WhatsApp button's green glow. **Shadows are defined per theme**, because a shadow's colour is the one value that has to differ between modes. Ordinary separation between a card and the page still comes from a 1px border and one surface step (`--surface` → `--surface-2`). *Why: a shadow drawn in v1 is part of the approved design, and the colour difference between modes is solved by a token — not by removing the effect.*
24. **Hover, as approved.** v1's hovers are kept, including the lifts: related cards rise 8px, the WhatsApp button rises 2px and gains its green glow, thumbnails rise 3px, chips rise 2px. Hovered photos may zoom to 1.05. **Hover is progressive** — a touch screen has no hover, so every hover effect also has a non-hover equivalent that already reads correctly on its own. *Why: the lifts are the approved feel, and a touch device still gets the border and surface change.*
25. **Fixed elements.** Showroom: sticky menu bar and (on phones) the floating WhatsApp button. Office: fixed sidebar. Nothing else sticks, except the add/edit summary panel (Q52).

### Icons and imagery
26. **Font Awesome Free is acceptable for now.** *Why: it works and is already used. Plan to self-host later so the site does not depend on an outside server.*
27. **Icons sit beside labels by default.** Icon-only buttons are allowed in toolbars if they have an accessible name and a tooltip. *Why: icons alone are ambiguous.*
28. **Photo shapes stay as approved:** grid cards 290:135, featured cards 350:200, car page gallery about 5:3, thumbnails 16:9, office thumbnails 3:2. All crop to fill. *Why: you approved them. Photos are shot landscape with the car centred.*
29. **No photo, or a photo that failed.** A graphite tile with a car icon and "Photo coming soon". **A car with no photo is not listed on the showroom at all** — it stays a draft in the office — so this tile now appears in exactly two places: in the office, and on a listed car whose photo fails to load.
30. **Hero images are cars from the inventory,** not stock photos. *Why: no mismatch between what you show and what you sell.*
31. **Gallery:** large photo, three thumbnails below, gold underline on the active one, a photo counter, arrows (hover on desktop, always visible on phones), swipe, and full-screen view on tap. *Why: all of these are already built and work.*
32. **No watermark.**

### Showroom screens
33. **Home hero. It stays a slider — your decision, and that settles it.** The built slider is kept as it is (auto-advance every 5.5s, arrows and dots). **Which cars: v1's rule, the 3 most expensive listed cars.** *Why: it is what the approved page does, and it needs no new data — the data model has no "featured" field and no `landedOn` date on Available cars, so a "newest first" rule would have to invent a sort key the data does not have. Price is real data and needs no proxy.*
34. **Hero badge price — the one place the showroom shortens a price.** Millions with no trailing zero ("₦52M", "₦34.5M" where the fraction matters), or billions above ₦999M ("₦1.2B"). The number never wraps. The words "doorstep price" sit on their own line below it. *Why: a 96px number cannot hold nine digits, and this is the single exception to the full-price rule in Q82 — stated in both answers so the two cannot be read as contradicting each other. Everything else on the showroom shows ₦34,500,000 in full.*
35. **Three tabs** as built, Available selected by default, with a count in each label. **The active tab keeps v1's treatment** — the gold active tab, as the approved pages draw it.
36. **Landed this year** cars inside Available carry a "Landed" label; **On Order** cars carry their state label; **Available** carries no label at all (Q11). **Every state label takes that state's owner-chosen colour**, with the written label always present. Landed's default is gold.
37. **Special ribbon and crossed-out price.** Kept as a permanent part of the showroom, as built. A car is **Special when it has a `was` price and that price is above its current price**, and the ribbon is then always gold. The `was` field stays on the car, so the saving and the crossed-out price are real data rather than decoration. **No owner control over this** — it follows from the two prices.
38. **On Order cards** show an arrival chip ("Expected: January") in place of the mileage row. v1's "0 km" is dropped. *Why: "0 km" says nothing to a buyer.*
39. **Card shows** photo, state label, year and name, price tag, mileage and exterior colour. **Car page adds** interior colour, the full gallery, features, the note, and the WhatsApp button. *Why: the card gives enough to decide whether to click, as in the built pages.*
40. **WhatsApp button: one main button per screen size, and a small link in the header.** On the car page: the sticky price sidebar on laptop, and a sticky bottom bar on phone and tablet. In the header on every page, a **small text link only** — never a second full button beside it. *Why: your decision, and it matches what the dealer-trade research found about repeated CTAs — more than one prominent action on a screen reduces conversion rather than raising it, and a page with a header button, a sticky bar and a sidebar button reads as three equal choices when there is one action.*
41. **Filters.** Home has tabs only. The inventory page has search, filters (status, make, year, price, colour) and sorting, as built.
42. **Empty tab.** "No cars here right now. Tell us what you want and we will find it." plus a WhatsApp button.
43. **Link to a sold or deleted car.** A friendly "This car is no longer available" page with similar cars and an "Ask for a similar car" WhatsApp button. *Why: shared links live on long after a sale.*
44. **Privacy.** A "Privacy" link in the footer of every page and as a small link directly under the single main WhatsApp button on the car page (Q40). *Why: your data-law note says the notice belongs where the tap happens.*

### Office screens
45. **Login.** A centred 380px card on the page background, logo above, email and password, one gold "Sign in" button, a theme toggle bottom-right. A wrong login gives one generic message.
46. **First run.** The same card, titled "Create your account", with a confirm-password field and one line: "This is the only account. Keep these details safe."
47. **Dashboard** (fixed, nothing the owner can customise):
    - Row 1, four number cards: **Available** (with "of which N landed this year" underneath), **On Order**, **Sold**, **In stock** (Available + On Order).
    - Row 2, three money cards: **Money tied up**, **Projected profit** and **Sold profit**. Each card has three lines:
      1. the **confirmed figure**, counting only cars whose six costs are all entered — Sold profit also needs the sale price;
      2. a coverage line directly under it, in words: **"from 9 of 14 cars"**;
      3. where cars are left out, a second line that names them: **"5 cars still building — ₦12,900,000 entered so far"** — and, where the same few costs are missing across most of them, which ones: **"missing clearing on 3, trucking on 2"**.
      When nothing is left out, line 3 is replaced by **"All 14 cars have every cost entered."** and the card sits one line shorter.
      *Why: a total that silently drops cars is a wrong number, and so is one that quietly adds unfinished cars. These two lines make the figure's reach visible without hovering, and nothing is hidden. The same research says a bare count is worse than useless here — people read past it and stop trusting the figure above it.*
    - Row 3, two lists: **Recent WhatsApp taps** and **Recent activity**.
    *Why: this matches the product model and holds nothing the client can change.*
48. **No charts.** Numbers and lists only. *Why: the dashboard is fixed, and there is no history data yet to chart honestly.*
49. **One compact density,** no density switch. Phone and tablet get larger controls automatically, by width (Q81). *Why: one less setting to build and test.*
50. **Inventory columns,** always visible: select, car, state, price, landed cost, profit, actions. "Added" is hidden below 1100px. No hide/show columns control.
51. **Add/Edit car.** One long page in sections, in this order: Car details, Photos, Costs, Private notes. Not a wizard. *Why: editing is the common case, and a wizard hides what you want to change.*
52. **Live panel.** On laptop and tablet: a sticky right panel with price, state, landed cost, profit, a completeness checklist and Save/Cancel. On phones: a sticky bottom bar showing profit and Save. *Why: your product model says profit updates beside him while he types.*
53. **Cost lines.** A table with one row per cost type: type, amount, currency (₦ or $), rate (shown only for $), and the naira equivalent. Every line sits in exactly one of **three states**, and the state is written in words:
    - **entered** — a value is present, shown as the amount;
    - **zero** — the owner typed ₦0, meaning the cost does not apply here, shown as ₦0 with no warning;
    - **not entered** — the line is blank, meaning it is missing. Gold text with a warning icon reading **"Not entered — clearing"**.
    *Why: each cost carries its own rate (your decision), and a missing line must never read as ₦0. Naming the missing cost in the row is what stops a blank being counted as nothing.*
54. **Photos.** A drop zone plus a grid of thumbnails. Drag to reorder; the first is the cover (badged); each photo has a remove button and "Set as cover". Upload progress shows on each thumbnail. **Every upload is resized on arrival into the several sizes the pages use** — card, gallery, thumbnail — so no page ever downloads a full-size file (build requirement, `ux-plan.md` section 8).
55. **Enquiries.** A board with one column per customer state on laptops (1100px and wider); a list with a state dropdown on each card on tablets and phones. *Why: dragging between columns is hard on touch.*
56. **PDF preview.** A wide side panel (720px) with a table of the rows read from the file. Rows that need attention are marked in gold with the reason written beside them. A summary line reads "12 rows ready, 2 need attention". Nothing is saved until he presses Confirm.
57. **Activity log.** A table: time, who, what, record. Filters for type and date. Times are in Nigerian time (WAT).
58. **Settings.** One page with a left sub-menu: General (WhatsApp number, tagline, full-tank cost, hours, social links), Car states, Customer states, Account.
59. **State editor.** A table with a drag handle, name, group dropdown, **colour picker**, "Show as a tab" switch, number of cars using it, and a delete button that is disabled (with a tooltip) while the state is in use. **The colour picker sets the state's label colour, and there is no random generator** (Q12). Each picker sits next to a live sample of the label, so the owner sees the state colour and its readable ink together before saving. **The "Show as a tab" switch is an inventory filter only.** It does not add a tab to the showroom, which always has exactly the three built tabs (Q35). *Why: the showroom's tabs are approved and cannot be customised; the state's own colour is not part of that.*

### Components
60. **Buttons.** Five kinds: **Primary** (gold fill, dark text), **WhatsApp** (green fill, dark text), **Secondary** (surface fill, border), **Ghost** (text only), **Danger** (red). Heights follow the approved design (Q81): the showroom's primary is **44px on phone and tablet** and 48 on laptop; the header link keeps its own size; office buttons keep their compact sizes.
61. **Inputs.** Filled style (soft background) with a visible border.
62. **Field errors.** Red border, a warning icon and the message directly below the field, in text. Never colour only.
63. **Required marking.** Mark the *optional* fields with "(optional)". *Why: nearly every field is required, so marking the exceptions is cleaner.*
64. **Labels.** A state's written label, always, with its owner-chosen colour behind or beside it (Q11). **Special is always gold.** A coloured dot alone is never the label.
65. **Incomplete costs.** The missing costs are named in words, and visible without hovering. Gold, with a warning icon, in every one of them:
    - **Table row:** the amount cell reads **"Not entered — clearing"** in gold text, with the warning icon.
    - **Drawer:** a gold attention box reading **"Still building — clearing, trucking not entered."**
    - **Page:** a dismissible gold banner reading **"5 cars are still building. ₦12,900,000 entered so far."** with a **"Show them"** button that filters the list to those cars.
    - **No lone warning symbol, and no tooltip carries any of this.** *Why: a symbol with no legend is misread — an open circle is taken for a zero — and a message shown only on hover is read by nobody, because hover does not exist on a phone. This is the one place the rule is absolute.*
66. **Sold cars.** Normal-contrast row with a "Sold" pill and the sale price and date under the price. Not greyed. *Why: greyed text loses contrast and sold cars are still read.*
67. **Deleted cars.** Normal contrast with a "Deleted" label and a "Restore" button on the row.
68. **Negative profit.** A minus sign, red text and the words "below cost" under the number.
69. **Tables.** Lines between rows, hover highlight, sticky header, no stripes.
70. **Pagination.** Numbered buttons with previous and next, on every list. No infinite scroll. *Why: footer stays reachable and the back button keeps its place.*

### Pop-ups (looks only; behaviour is in the UX section)
71. **Modal 440px** (confirm/form), **wide modal 640px** where a table is needed. 12px corners, scrim at 65% black, buttons on the right with the main action rightmost.
72. **Drawer** slides from the right, 480px on laptop and tablet, full width on phones. *Why: simpler than a bottom sheet and the same pattern on every size.*
73. **Toasts:** bottom-right on laptop; bottom-centre above the bottom bar on phones. Max 3 at once. Gold progress line for the 8-second timer. **A toast is separated by a border, not a shadow** (Q23).
74. **Tooltips:** near-black with light text in both modes (with a thin border in dark mode). They explain; they never carry essential information. **A figure's reach — how many cars it counts and what was left out — is never tooltip-only.** *Why: hover does not exist on touch, so anything only shown on hover is read by nobody.*
75. **Command palette:** office only, centred near the top. It is built, cheap to keep and not required for launch. Cut it if the owner will not use it.
76. **Context menu:** keep, desktop only, with the "⋯" button as the visible route to every action.

### Responsive behaviour
77. **Three widths, and three devices they stand for: phone, tablet, laptop.** Phone below 560px, tablet 560 to 1099px, laptop 1100px and up — the built 560/820/1100, unchanged. *Why: they already work, and Shopify's numbers add nothing here. What changed is the naming: these are three devices to be designed for, not four arbitrary breakpoints, and 820 is a sub-step inside the tablet width rather than a fourth width of its own.*
78. **Office on phones:** a bottom bar with five items (Dashboard, Inventory, Enquiries, Activity, Settings). "Add car" is a button on the Inventory page. *Why: thumb reach.*
79. **Tablet (560 to 1099px).** Tablet is **its own width, not its own design** — everything it does is a consequence of the width it has, and nothing on it exists only because the device is a tablet. Showroom: 2 and 3-column grids as built. Office: the sidebar shrinks to a 56px icon rail; tables stay tables down to 820px. *Why: a separate tablet design doubles the number of screens to check and is the first thing that goes stale. A tablet is a laptop with a touchscreen, so the only things that genuinely must change are the parts a finger cannot reach.*
80. **Phone tasks that must work well in the office:** read the dashboard, search and filter inventory, change a state, mark sold, check an enquiry, and add a car with photos from the camera.
81. **Tap size, by width rather than by input type.** A **primary action is 44×44px on phone and tablet**, on both sides. **Anything else keeps the size the approved design already ships**, and 32 to 36px is the range on laptop, which is where a mouse makes a 44px target feel oversized. *Why: the earlier rule detected touch by input type, which gets a tablet with a keyboard wrong. Width is the honest signal for how big a primary action should be; it is not a reason to resize controls that were approved at another size.*

### Formats and wording
82. **Naira: the full amount with commas (₦34,500,000) everywhere on the showroom — with exactly one exception, the hero badge.** The dashboard money cards also show full amounts, even though each card carries two figures and a coverage line. *Why: the two rules that used to sit side by side and appear to clash are now one rule with one named exception, and each answer says so: Q34 is the exception and says why (a 96px box cannot hold nine digits); this is the rule and says why (abbreviating six figures at once makes a card unreadable, and putting the exact figure behind a hover is the same mistake as hiding the coverage behind a hover). If another place ever needs a short price, it goes in here as a named exception — not as a quiet decision on the page.*
83. **Dollars and rates:** `$23,000 @ ₦1,520/$`, with the naira result beside it.
84. **Dates:** "4 Oct" this year, "4 Oct 2025" otherwise. The activity log adds the time in 24-hour Nigerian time ("4 Oct, 14:32").
85. **Mileage:** "12,000 km" on every built page. On Order cars show the arrival note instead (Q38).
86. **English only.**
87. **Tone:** plain, short and direct. Say what happened and what to do next.
    - Success: "Car saved."
    - Undo: "Car deleted. Undo"
    - Error: "We could not save this car. Check your connection and try again."
    - Empty: "No cars here right now."
    - Confirm: "Delete this car? You can undo this right after."
    - Costs complete: "All 14 cars have every cost entered."
    - Costs incomplete: "5 cars are still building. ₦12,900,000 entered so far."
    - Nothing missing yet: "No cars have costs entered yet."

### Visual accessibility
88. **Yes: every text at 4.5:1 or better, large text and UI parts at 3:1.** Tokens in section 4 are already checked. This fixes the grey text on white (`#8a8f95` is 3.26:1 and fails) and the grey on the light panel (2.91:1). **Gold is never used as text on a light background**, because the single gold `#c8a24a` is 2.41:1 on white — so on the light surfaces gold appears as a fill, a rule or an underline, and the text beside it is the ink token. **Where an owner picks a state colour, its label ink is chosen by contrast (Q12)**, so no colour the owner chooses can make its own label unreadable.
89. **Focus ring:** 2px, with a 2px gap, in the gold-text colour on light and gold on dark. Always visible; never removed.
90. **Never colour alone.** Every system message carries an icon and words; every car state carries its written label, with its colour beside it rather than instead of it. **Red is only ever for an error or a critical problem, green only for success, gold only for attention, grey only for information** — and each one is written out beside the icon. *Why: colour helps people who can see it and must never be the only carrier for people who cannot, so every colour is paired with words.*
91. **Reduced motion:** respected. Animation off, except instant state changes.
92. **Text resize:** sizes in `rem`. Test that the page works at 200% zoom.

### Scope
93. **Showroom pages stay as approved** with the change list in section 6. **Office draft is redone** per sections 5 and 7.
94. **Reference:** the Motors theme and your own HTML only. No other site is a reference.
95. **Left out of the UI for now:** charts, gradients, density switch, saved cars, comparison tool, language switch, hero video, chat widget, filters on the home page. **No longer left out:** state colours (the owner picks them, Q12) and the `was`-price Special ribbon (it is permanent, Q37).

---

## 4. Tokens (exact values)

All pairs below were computed. Ratio = contrast against the surface named.

### Light mode
```css
:root, [data-theme="light"] {
  --bg:#ffffff;       --bg-alt:#f1f2f4;    --surface:#ffffff;  --surface-2:#f1f2f4;
  --ink:#23272b;      --muted:#5d636a;     --line:#e2e4e7;     --line-strong:#80868c;
  --gold:#c8a24a;     --on-gold:#1a1405;
  --strip:#212529;    --band:#222629;      --footer:#212529;   /* v1's dark surfaces stay dark */
  --wa:#25d366;       --on-wa:#06220f;
  --danger:#b3261e;   --success:#1b7a4b;   --attention:#8a6d1f;
  --shadow-card:0 18px 34px rgba(0,0,0,.14);
  --shadow-float:0 12px 30px rgba(0,0,0,.35);
  --shadow-btn:0 8px 18px rgba(37,211,102,.35);
}
```
| Pair | Ratio |
|---|---|
| ink on white / on grey panel | 15.04 / 13.42 |
| muted `#5d636a` on white / on grey panel | 6.07 / 5.42 |
| gold `#c8a24a` as text on white | **2.41 — fails. So gold is never text on a light surface** |
| danger `#b3261e`, success `#1b7a4b` on white | 6.54, 5.34 |
| input border `#80868c` on white / on grey panel | 3.68 / 3.29 |
| dark text on gold button | 7.61 |

**The one pair that fails, and how it is handled.** There is now a single gold, `#c8a24a`, and as *text* on a light background it is 2.41:1. So **gold is not used as text on any light surface.** On light surfaces gold appears only as a fill (the button, the badge, the price tag, the ribbon), as a rule or an underline, and the text beside it is the ink token. That is a usage rule, not a second gold. On the dark surfaces — the strip, the band, the footer, which stay dark in both modes — the same gold is 7.46:1 and is used as text freely.

### Dark mode
```css
[data-theme="dark"] {
  --bg:#15171a;       --bg-alt:#1b1e22;    --surface:#1e2125;  --surface-2:#272b30;
  --ink:#e8eaed;      --muted:#9aa0a6;     --line:#30353b;     --line-strong:#767c83;
  --gold:#c8a24a;     --on-gold:#1a1405;
  --strip:#212529;    --band:#222629;      --footer:#212529;   /* unchanged from v1 */
  --wa:#25d366;       --on-wa:#06220f;
  --danger:#ef5b52;   --success:#3fb27f;   --attention:#c8a24a;
  --shadow-card:0 18px 34px rgba(255,255,255,.09);
  --shadow-float:0 12px 30px rgba(0,0,0,.55);
  --shadow-btn:0 8px 18px rgba(37,211,102,.35);
}
```
| Pair | Ratio |
|---|---|
| ink on page / on surface | 14.90 / 13.41 |
| muted `#9aa0a6` on page / on surface-2 | 6.80 / 5.39 |
| gold `#c8a24a` on page / on surface-2 | 7.46 / 5.92 |
| danger `#ef5b52`, success `#3fb27f` on surface | 4.84, 6.07 |
| input border `#767c83` on surface / on surface-2 | 3.83 / 3.38 |

**The shadow tokens are the only values that differ between the modes for depth.** `--shadow-card` flips to a faint white in dark mode, because a dark blur on a dark page is invisible. `--shadow-float` stays black in both modes and simply gets stronger in dark mode, because the floating button and the info boxes sit over a *photo*, and a shadow over a photo reads in either mode. `--shadow-btn` is unchanged, because it sits on the green fill in both.

### The same in both modes
These do not change with the theme, because they are text on a fill that stays put:
| Item | Light mode | Dark mode |
|---|---|---|
| Text on the gold button | `#1a1405` on `#c8a24a` — 7.61 | same — 7.61 |
| Text on the WhatsApp button | `#06220f` on `#25d366` — 8.52 | same — 8.52 |
| Text on a danger button | white on `#b3261e` — 6.54 | `#1a1405` on `#ef5b52` — 5.49 |
| Gold call-to-action box, hero badge, about box | gold fill, dark text | gold fill, dark text |

### Every surface, both modes
Each mode is one theme. The built showroom is mixed — dark strip, dark band, dark footer — so **light mode needs new values for those three**, and that is the main colour work in the whole change.
| Section | Light mode | Dark mode |
|---|---|---|
| Page background | `#ffffff` | `#15171a` |
| Alternating band / panel | `#f1f2f4` | `#1b1e22` |
| Card surface | `#ffffff` | `#1e2125` |
| Raised surface (popover, drawer, modal) | `#f1f2f4` | `#272b30` |
| Top strip | `#f1f2f4` — was `#212529` | `#0f1113` |
| Menu bar | `#ffffff` with a bottom border — was `#eceef0` | `#1c1f23` |
| Inventory band | `#f1f2f4` with a top and bottom border — was `#222629` | `#1b1e22` |
| "Why choose us" | `#f1f2f4` | `#1b1e22` |
| Featured cards | `#f1f2f4` with a 1px border — was `#383d42` | `#272b30` |
| Footer | `#f1f2f4` with a top border — was `#212529` | `#0f1113` |
| Gold and green call-to-action boxes, hero badge, about box | unchanged | unchanged |
| Photo loading tile | `#d7d9dc → #c3c6ca` | `#2a2e33 → #23272b` |

*Why the light values change: a light theme with a dark band through the middle of the page is the mixed look, and that is the thing being removed. A band in light mode is a grey band with a border, and it reads as a section rather than as a stripe.*

### State labels (office and showroom)
Every state has a colour, and the owner sets it (Q11, Q12).

| State | Default colour | Words |
|---|---|---|
| Available | green `#1b7a4b` / `#3fb27f` | "Available" |
| On Order | gold `#c8a24a` | "On Order" |
| Landed this year | gold `#c8a24a` | "Landed" |
| Special | gold `#c8a24a` — **fixed, not editable** | "Special" |
| Sold, and every custom state | the owner's choice | the written label |

**The written label is always present.** The colour is a scanning aid beside it, never instead of it, and never a bare dot on its own (Q64, Q90).

**The label ink is computed, not chosen.** For whatever colour the owner picks, the label text is whichever of the two ink tokens — `--on-gold`'s near-black or white — has the higher WCAG contrast against it. That is a build requirement, so a colour the owner picks can never make its own label unreadable.

**On the light theme, a state colour is a fill or a border, not text.** Gold at 2.41:1 as text on white fails, so on a light surface the state colour goes behind the label as a fill with computed ink on top.

### Type — as approved
- **Families:** Oswald 500/600/700 for headings and prices, Inter 400/500/600 for body. Final (Q15).
- **Sizes:** the approved showroom's own sizes, kept (Q19). Body 16 on the showroom, 14 in office tables. **12px is the floor** for captions, badges and table headers, and nothing goes below it (Q17).
- **Prices:** Oswald 600. Office table money is Inter 600 with tabular numerals, right-aligned (Q18).
- **Case:** uppercase for showroom headings, tabs and buttons; sentence case for body text and all office buttons (Q16).

### Radius, depth, motion — shared
| Token | Value | Used by |
|---|---|---|
| Control radius | 4px | both sides |
| Card radius | 4px | both sides |
| Modal and drawer radius | 8px | both sides |
| Pill | 999px | both sides |
| Separation | 1px `--line`, `--line-strong` on a raised surface | both sides |
| **Shadow** | **`--shadow-card`, `--shadow-float`, `--shadow-btn` — one value per theme** | both sides |

Depth comes from the surface stepping one level plus a border, and from the approved shadows. A popover, drawer or modal is `--surface-2` plus a `--line-strong` border. A hover is a border change to `--line-strong`, a surface change to `--surface-2`, and **v1's lifts and glows where the approved pages have them**.

Motion: 150ms for small changes, 250ms for popovers and hovers, 400ms for drawers, 700 to 900ms only for showroom reveals and the hero. Curve: `cubic-bezier(.2,.7,.2,1)`.

### Type — v1's sizes stand (Q19)
**The approved pages' type sizes are kept as they are.** There is no snapping step and no provisional scale. Both sides still use Oswald for headings and prices and Inter for body, and 12px is still the floor, but the ~22 sizes the showroom already uses are the sizes. *Why: they were approved as drawn; a shared scale would be a redesign of type.*

---

## 5. Office design direction: compact and professional

You have not seen the office. This is how I would make it feel professional.

1. **Quiet colour.** Neutral greys and one gold. Colour appears only for primary actions, the owner's own state colours, and system messages — red, green, gold or grey, each with an icon and words (Q10). **A state's colour always sits beside its written label, never alone (Q64, Q90).**
2. **Tight but readable.** 14px body, 14px tables with 12px headers, table rows about 48px with a 56×38 thumbnail, compact controls on laptop and **44px on phone and tablet for primary actions**, side padding 20 to 24px.
3. **Numbers line up.** All money columns are right-aligned with tabular numerals. The profit column is coloured (green, red) and always carries a minus sign or a label.
4. **One header pattern per page:** page title, a short summary line, and the actions on the right.
5. **Sidebar.** 208px wide with five items and an "Add car" gold button at the top. Inside the tablet width (820 to 1100px) it becomes a 56px icon rail — a consequence of the width, not a tablet design (Q79). On phones it becomes a bottom bar.
6. **Nothing decorative.** No gradients, no big illustrations, no animated backgrounds. Motion is limited to feedback (hover, popover, drawer, toast).
7. **Every list has the same four parts:** summary strip, filters, table, pagination.
8. **Every office screen is reviewed in both modes as it is built**, because dark is the default (Q7). A screen that has only been seen in light mode is not finished.

Pages to build in the office (none besides the first draft exist yet): Login, Create account, Dashboard, Inventory (redo), Add/Edit car, Enquiries (with PDF preview), Activity log, Settings (with state editors).

---

## 6. Change list for the pages already built

### Showroom (`truespec.html`, `car.html`, `inventory.html`)
1. **Two modes, and the approved design kept.** Replace hard-coded colours with the tokens and add the toggle, with **dark as the default** (Q7). **The top strip, inventory band and footer stay dark in both modes** — they are dark in the approved design. The mode change is confined to the surfaces that were already light: the page background, cards, muted text, borders and shadows (Q5, section 4).
2. **Shadows stay, and become per-theme tokens.** Move v1's `box-shadow` values into `--shadow-card`, `--shadow-float` and `--shadow-btn`, with a different colour per mode (Q23). **Keep v1's hover lifts and the WhatsApp button's green glow** (Q24).
3. **Muted text.** Replace `#8a8f95` with `--muted` where it is used for text on light surfaces (card specs, "Why choose us" paragraphs, spec labels, notes).
4. **Gold as text on a light surface.** There is one gold now, so gold is **never text on a light background** (2.41:1, fails). On light surfaces gold is a fill, a rule or an underline only. Known places to change to the ink token: the modal price (`.p2`), related-car prices (`.rc .pr`) and the step numbers (`.steps .num`). **The active tab keeps v1's gold treatment** (Q35). On the dark surfaces — strip, band, footer — gold text is fine at 7.46:1.
5. **Gold icons on light surfaces** next to text are decorative and may stay. An icon that stands alone next to text on a light surface takes the ink token's colour.
6. **Type sizes stay as built.** No snapping (Q19).
7. **Tap sizes stay as built** (Q6, Q81). Raise only a control that is genuinely below the approved size and is a primary action.
8. **WhatsApp button: one main button per screen size.** The header keeps a small text link, not a second button (Q40). **This is accepted.**
9. **State colours are wired up.** Each state takes the owner-chosen colour from the state editor, with the written label always present and the label ink chosen by contrast (Q11, Q12, Q64). The showroom reads the colour through the public settings layer and never loads private office data.
10. **Gold where it was amber.** "Not entered — clearing", attention boxes, banners and PDF attention rows (Q53, Q56, Q65).
11. **Add:** the not-available page (Q43), a privacy page, and the footer privacy link.
12. **On Order cards** show the arrival chip instead of v1's "0 km" (Q38). **The hero keeps v1's price sort** for its 3 cars, and the slider itself stays as built (Q33).
13. **A car with no photo, or no price, is not listed** (behaviour in `ux-plan.md` Q24 and Q54; the visibility rule itself belongs in the product design).
14. **The Special ribbon and crossed-out price stay**, as built and as permanent (Q37). A car is Special when its `was` price is above its current price; the ribbon is always gold.
15. **Add** the four `was` values to the data as real data, so the saving is not decoration (Q37).

### Office (`admin-inventory.html`)
1. Tokens and the dark/light toggle, **dark as the default**.
2. Wire the per-state colours to the owner's choices from the state editor, with the written label always beside the colour and the label ink chosen by contrast (Q11, Q12, Q64).
3. Make it compact (Q50, section 5), right-align money, use tabular numerals, and match the showroom's tap sizes (Q81).
4. Strengthen input and field borders to `--line-strong`.
5. **Summary strip rule.** "Money tied up" now counts only cars whose six costs are all entered, the same rule as profit. Change the label from "Money tied up (costs entered so far)" to **"Money tied up"**, and put two lines under it: **"from 9 of 14 cars"**, and where cars are left out **"5 cars still building — ₦12,900,000 entered so far"**. The built `summary()` function currently adds up costs entered so far across every car, so it must change: the headline figure sums complete cars only, and the partial figure is summed separately as its own number. Show full amounts, not abbreviations (Q82).
6. **Cost rows.** Where a cost line is blank, the amount cell reads "Not entered — clearing" in gold with a warning icon rather than showing an empty cell (Q53). No triangle icon, no tooltip.
7. **Per-theme shadow tokens** in popovers, drawers, modals and toasts (Q23, Q73).
8. **Resize every upload into the sizes the pages use**, at upload, not on request (Q54; `ux-plan.md` build requirement).
9. Keep the pop-up patterns (modal, dialog, popover, dropdown, tooltip, drawer, toast, alert). Mark the command palette and context menu optional.

---

## 7. Where this plan stops

This plan covers **what everything looks like**. It does not cover:
- How each screen *behaves* step by step (UX).
- What the owner *can do* on each screen (Functionality).
- The rules about money, states and visibility (Business logic).
- Screen-reader markup, focus handling and testing (these belong in the system model; the visual accessibility rules above are decided here).
- **Any new field in the data model.** Where this plan hit a wall that only a new data-model field could clear — telling "₦0, does not apply" apart from "₦0, cost nothing" — it says so in section 2 and stops, rather than deciding it here.
- **The `was` price field.** The Special ribbon is permanent now, so it has to read a real price rather than be decoration. Whether `was` lives on the car or inside a discounts structure is the data model's call, not this plan's. The showroom needs the field either way (Q37).

---

## 8. Decisions (settled)

1. **Dark is the default, and the toggle is adopted.** The site opens in dark unless the visitor has already chosen light; the device's own setting is not consulted. **The approved design is kept as it is in both modes** — the top strip, inventory band and footer stay dark, and the mode change covers the surfaces that were already light: page background, cards, muted text, borders and shadows. Every screen is checked in both modes before it ships. (Q5, Q7, section 4.)
2. **The approved showroom wins on look.** v1's shadows, hover lifts, gold, type sizes, tab treatment, tap sizes and Special ribbon are all kept. This file no longer proposes replacing them. (Q8, Q19, Q23, Q24, Q35, Q37, Q6, Q81.)
3. **Two new capabilities, both owner-driven: state colours and shadows per mode.** Every state takes a colour the owner picks in the state editor, with its written label always present and its label ink computed by contrast (Q11, Q12). Shadows stay and are tokenised per theme, because a shadow's colour is the only depth value that has to differ between modes (Q23).
4. **Typography: follow the build spec.** Oswald for headings and prices, Inter for body, and the approved pages' own sizes. The "one family, one weight, two sizes" idea is dropped because it was an agent's recommendation. (Q15, Q19)
5. **Office look: still being worked on.** The office pages are reviewed in both modes as they are built. Any change is recorded in the change log below and in the sections it touches.
6. **Incomplete cars are shown — not dropped, and not merged in.** Every money figure is stated with its reach, in the display itself:
   - the **confirmed figure**, counting only cars whose six costs are all entered (Sold profit also needs the sale price);
   - a **coverage line**, "from 9 of 14 cars";
   - and where cars are left out, a **second figure and a named reason**: "5 cars still building — ₦12,900,000 entered so far", plus which costs are missing when that is a short list.

   The wording is **"still building"**, never "excluded" — an excluded car reads as gone, and a car that is still building is still on the lot. Neither figure ever claims to be the other. The coverage and the shortfall sit in the display, never in a tooltip and never behind a symbol. (Q47, Q53, Q65, Q74, Q82, Q87, section 6.)

   *Where this came from.* The rule is not invented. Five published sources on reporting incomplete data in an aggregate agree on it: AHRQ's guidance on displaying data that is missing or incomplete (do not omit the records that lack data — group them separately and below; a bare symbol gets misread, an open circle as a zero; the explanation belongs inside the display, not in a footnote); the Oregon Health Authority's missing-data guidelines (always report missingness alongside the figure; never treat missing as "no"); EasyCivil's construction-dashboard guidance (show coverage beside the metric, never silently assign zero to what has not arrived; label a partial sum as reported-to-date); gtstats on how missing values are handled (they are never silently treated as observations with a value); and IFRS Practice Statement 2 on materiality (if omitting or misstating a figure could change a decision, the figure is material and its limits have to be stated).

   This also changes the business-logic and data-model note that previously said money tied up was the landed cost of all unsold cars. Update it there too.

7. **Shared design tokens — one set of spacing, corners and shadows on both sides.** The showroom and the office draw from the same 4px spacing scale, the same corner radii and the same shadow tokens; they differ in density, not in tokens. It is called **shared design tokens, not Polaris**, because Polaris only covers admin screens and this is a showroom with an office attached. (Q21, Q22, Q23, section 4.)
8. **One gold, `#c8a24a`, in both modes** — v1's value. **The one constraint it creates:** gold as *text* on a light background is 2.41:1 and fails, so on light surfaces gold is used only as a fill, a rule or an underline, with the text beside it in the ink token. On the strip, band and footer — dark in both modes — gold text is fine at 7.46:1. (Q8, Q88, section 4.)
9. **Four system colours, and no more.** **Red** for errors and critical problems — the only new colour. **Green** for success, reusing the WhatsApp green, with a readable shade per mode. **Gold, a warning icon and words** for attention. **Grey text with an icon** for information — **info blue is gone.** Red and green each have two shades, one per mode, both passing. **Never colour alone: every message carries an icon and words.** (Q10, Q62, Q65, Q90.)
10. **Every car state carries a colour the owner picks**, in the state editor, with the written label always beside it. **The `colour` field stays on the State table.** Special is always gold and is not editable. **The label ink is computed by contrast, never hand-picked**, so no owner-chosen colour can make its own label unreadable. **There is no random generator** — the colour picker is the only way in. (Q11, Q12, Q36, Q59, Q64, Q90.)
11. **Shadows stay, and are per-theme tokens.** v1's shadows, hover lifts and the WhatsApp button's green glow are all kept. `--shadow-card`, `--shadow-float` and `--shadow-btn` carry a different colour per mode, which is the only depth value that has to differ. Ordinary separation is still a 1px border plus one step of surface. (Q23, Q24, Q73.)
12. **Tap targets follow the approved sizes** the showroom already ships, with 44px on touch where the control is a primary action and 32 to 36px on laptop. Detection is by width, not by input type. (Q6, Q60, Q81, section 5.)
13. **Three widths, for phone, tablet and laptop.** Tablet is its own width and not its own design — everything it does follows from having that width. The built 560/820/1100 stay unchanged. (Q77, Q79.)
14. **The approved type sizes stand.** No shared scale, no snapping, nothing provisional. Oswald and Inter, 12px floor, the sizes the showroom already uses. (Q19, section 4.)
15. **Full prices everywhere on the showroom, with the hero badge as the single named exception.** Q34 is the exception and says why; Q82 is the rule and says why. Neither can be read alone and get the wrong answer. (Q34, Q82, section 1.)
16. **The hero stays a slider** and picks its 3 cars by v1's price sort. (Q33.)

---

## Change log

| Date | Change | Sections touched |
|---|---|---|
| 2026-10-06 | **Your ruling, adopted: the approved showroom wins on look, and two capabilities are added.** This reverses six of the 2026-10-05 rulings. **The approved mixed design is kept as the design** — the dark top strip, dark inventory band and dark footer **stay dark in both modes**, and light mode is that design with only the already-light surfaces swapped. The two modes are two colourways of the approved design, not a redesign of it. **Shadows stay and become per-theme tokens** (`--shadow-card`, `--shadow-float`, `--shadow-btn`) — the shadow's colour is the only depth value that has to differ between modes, and a token per theme is the whole fix, so deleting an approved effect was not required by the problem. **v1's hover lifts and the WhatsApp button's green glow are kept**, not replaced by a border change. **Every state carries a colour the owner picks** with a colour picker in the state editor; the `colour` field stays on the State table; the written label is always present beside the colour and the label ink is **computed by WCAG contrast**, never hand-picked; there is **no random generator**. This reverses "car states carry no colour" and the proposed removal of the field, and it rests on a narrower and correct accessibility claim: colour must never be the *only* carrier, which says nothing about colour being present beside a label. **The Special ribbon and crossed-out price are permanent**, a car is Special when its `was` price exceeds its current price, and the `was` values become real data. **One gold, `#c8a24a`, in both modes** — v1's value; the two-gold split is dropped. The constraint that creates is handled as a **usage rule**: gold is never text on a light background (2.41:1 fails), so on light surfaces it is a fill, a rule or an underline with ink text beside it. **The approved type sizes stand** — no snapping, no provisional Tailwind scale. **Tap targets follow the approved sizes**, with 44px on touch for primary actions and 32–36px on laptop. **The active tab keeps v1's gold treatment.** The hero keeps v1's price sort for its 3 cars. The "Show as a tab" switch stays an inventory filter only. | Q5, Q6, Q8, Q11, Q12, Q19, Q23, Q24, Q33, Q35, Q36, Q37, Q38, Q59, Q64, Q81, Q88, Q90, Q95, section 1, section 2 (mistakes 1 and 2, and the removed open items), section 3, section 4, section 5, section 6, section 7, section 8 |
| 2026-10-05 | **Your ruling, adopted: shared tokens, two complete themes, gold-only states, no shadows.** One set of sizes, spacing and corners on both sides, called shared design tokens rather than Polaris, because Polaris only covers admin screens. **Dark is the default and each mode is one whole theme** — the top strip, inventory band, footer and featured cards turn light in light mode, and the device setting is no longer consulted. **Two golds: `#8a6d1f` in light mode, `#c8a24a` in dark — with one open item: `#8a6d1f` is 4.37:1 on the light grey panel `#f1f2f4` and fails your own 4.5:1 rule. Either that panel carries no gold text, or it uses `#7f6319` (5.07) as a single extra token; I recommend the second and have not chosen it.** Car states lose all colour: solid gold for Landed this year, outline gold for On Order, nothing for Available; the coloured dots go, and the `colour` field on State should go with them. Info blue is dropped for grey text with an icon; attention is gold with a warning icon and words; red stays for errors and critical problems and is the only new colour; green reuses the WhatsApp green, with a readable shade per mode — the WhatsApp green itself stays fill-only. **No shadows anywhere**: depth is a 1px border plus one step of surface, and hover changes a border and a surface rather than lifting. Tap targets are 44px on phone and tablet and 32–36px on laptop, detected by width rather than input type. Three widths for phone, tablet and laptop, with tablet a width and not a design. One type scale taken from Tailwind's default steps, marked provisional until the home page and one car page are drawn. **Full price everywhere on the showroom, hero badge the one named exception**, which settles the Q34/Q82 clash by making each answer name the other. The hero slider stays. | Q5, Q7, Q8, Q10, Q11, Q12, Q19, Q21, Q22, Q23, Q24, Q29, Q33, Q34, Q36, Q40, Q44, Q49, Q53, Q54, Q56, Q60, Q64, Q65, Q73, Q77, Q79, Q81, Q82, Q90, section 1, section 2, section 4, section 5, section 6, section 7, section 8 |
| 2026-10-05 | **Correction to your ruling, adopted:** incomplete costs are shown, not dropped. Money cards now carry a confirmed figure plus a coverage line ("from 9 of 14 cars") plus a named shortfall ("5 cars still building — ₦12,900,000 entered so far"). "Excluded" is replaced by "still building" throughout. The amber triangle and the coverage tooltip are removed; missing costs are named in words in the row itself. Dashboard cards now show full amounts instead of abbreviating, because six figures at ₦1.06B is unreadable and hiding the exact figure behind a hover repeats the mistake being fixed. Based on AHRQ, Oregon Health Authority, EasyCivil, gtstats and IFRS PS2. | Q47, Q53, Q65, Q74, Q82, Q87, section 1 item 7, section 2 (mistake 6, and a new "still unsure of"), section 6, section 7, section 8 decision 4 |
| 2026-10-05 | **Your correction, recorded:** "Show as a tab" in the state editor is an inventory filter only. It does not add a showroom tab — the showroom always has exactly the three built tabs. This removes the contradiction between Q59 and Q35. | Q59 |
| 2026-10-05 | Correction: with no device setting the default is **dark**, not light (Q7, section 8, item 1). Dark is therefore a first-impression mode and must be checked on a real phone and laptop before launch. |  Q7, section 8 |
| 2026-10-05 | Decisions 1 to 4 settled: theme follows device with a manual switch; Oswald and Inter kept; office reviewed as built; money tied up leaves incomplete cars out | Q7, Q15, Q47, section 2, section 6, section 8 |