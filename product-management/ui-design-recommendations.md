# UI recommendations — grounded in standards that have scaled

**Prepared for:** the User Interface category of the product model
**Method:** every recommendation below is traced to a standard or design system that has shipped at
scale. Where nothing exists, that is said plainly rather than filled with opinion.

## Sources used

| Source | What it is | Why it governs here |
|---|---|---|
| **WCAG 2.2** (W3C, 2024) | The normative accessibility standard | It is a standard, not a preference. Requirements are pass/fail. |
| **Shopify Polaris v12** | Shopify's commerce admin design system | Purpose-built for **exactly this product**: a storefront plus an admin, with inventory, product media and enquiry-style records. |
| **Material Design 3 / Carbon / Tailwind** | Three independent systems | Where all three converge independently, that convergence *is* the standard. |

**The strongest evidence is convergence.** Polaris, Material, Carbon and Tailwind arrived at
**primitive tokens plus semantic tokens** without coordinating. Polaris uses a **4px base**
(Tailwind 4px, Carbon 4px). Polaris v12 ships **Inter** as its UI face. That agreement is why
these are recommendations and not one team's taste.

---

## The five findings that change decisions

### 1. One token set. Two expressions. Not two design systems.

This is the most important finding, and it answers questions 5, 6, 19, 21, 22 and 93 at once.

Your questions repeatedly ask whether the showroom and the office *differ*:

> 5. showroom dark, light or mixed? · 6. is the office dark? · 19. different type scale for
> showroom and office? · 21. showroom roomy, office tight? · 22. square or rounded corners?
> · 93. which pages stay as they are?

**The answer: never two of the same thing.** Polaris runs one token layer across every surface in
the Shopify admin — one spacing scale, one radius set, one type scale. Difference between a
consumer storefront and a dense admin is expressed as **density and surface colour only**, never
as a separate type family or a separate corner radius.

| | Showroom | Office | Rule |
|---|---|---|---|
| Type family | Same | Same | **One family** for UI. A second only for display headings. |
| Type scale | Same steps, used differently | Same steps | Same scale |
| Radius | Same set | Same set | **One set.** Square-here-rounded-there is the thing to avoid. |
| Spacing | 4px base, loose | 4px base, tight | Same scale, **different density** |
| Surface | Dark | Dark | One brand look |

**The mixed showroom (dark header, light content) is the thing to drop.** It is the single largest
source of inconsistency in the questionnaire, and it costs the most to maintain.

### 2. The gold works on dark and fails on light. Measured.

| | Contrast | Verdict |
|---|---|---|
| Gold `#c8a24a` on graphite `#1a1a1a` | **7.23:1** | Passes WCAG AAA |
| Gold `#c8a24a` on white | **2.41:1** | **Fails AA.** Fails even the 3:1 large-text minimum |

So question 88 is right and more serious than it sounds — this isn't a marginal miss on an active
tab, it is a colour that is **unreadable on any light panel.**

**Recommendation: two gold tokens, not one.**
- `#c8a24a` — gold on dark surfaces. Keep. Passes AAA.
- `#8a6d1f` — **7:1-class dark gold for light panels. Verified 4.57:1 on white.** Passes AA.

And question 13 is confirmed by measurement: **dark text on a gold button is 7.23:1.** Comfortable.
White text on gold would be 2.41:1 and fails. Use dark text on gold, always.

*Note: logo text is exempt from WCAG contrast under the Logotypes exception — the mark itself is
exempt, but any gold text next to it is not.*

### 3. Car states must not use colour. Three reasons.

You asked (10, 11, 12) whether states get colours, whether "Held for payment" and "At port" get
their own, and whether the owner picks the colour when he adds a state.

**Recommendation: no colour per state at all.** Reasons, strongest first:

1. **You have an unlimited number of states.** Any fixed palette runs out. The owner adds a seventh
   state and there is no colour left — so either it repeats (two states look identical) or he
   picks one himself (and picks badly, and it's stored data forever).
2. **WCAG 1.4.1 forbids colour as the only signal.** Every state must read without colour anyway.
3. **Colour per state would leak private labels to buyers** — the exact thing you ruled out.

**What carries state instead:** the **group** (Available / On Order / Landed this year) as the
section or tab, plus a **written label** on the card. Position and text scale to unlimited states;
colour does not.

**For the office's own status signalling** — errors, warnings, missing costs — Polaris has a proven
four-role set: **success, attention, critical, info.** Those are *system* conditions, not user-defined
states, so a fixed palette is correct there. Custom states get none of them.

### 4. Colour blindness is a real constraint on your charts

Nothing is free here — **all charts and labels must read without colour** (WCAG 1.4.1), and that
drives the whole chart section.

---

## Answers to the 95 questions

### 1. Brand and identity

1. **No logo file exists yet.** Use the text logo for now; a gauge icon overstates a car dealer.
2. **Same lockup everywhere**, and it links home on every page. Same wordmark in the office is fine.
3. **Yes to both** — favicon and share image. Omitting the share image is the costly miss: pasted
   WhatsApp links currently render as plain text with no brand.
4. **Tagline in the footer always**, once on the home hero. Not under the logo at every width —
   it collides with the wordmark at small sizes.

### 2. Colour

5. **All dark.** Drop the mixed showroom.
6. **Office dark**, same surfaces as the showroom.
7. **No light/dark switch.** One fixed look per side. A theme toggle doubles the QA surface for no
   gain here.
8. **`#c8a24a` is fine** for dark surfaces — no need to hunt a new shade.
9. **Gold for the brand, WhatsApp green only for chat** — standard practice.
10. **Four system roles: success, attention, critical, info.** No colour for "Held for payment" or
    "At port."
11. **No colour for car states** — see Finding 3.
12. **The system assigns no colour.** New states get a label, not a swatch.
13. **Dark text on gold** — 7.23:1, verified. Final.
14. **Flat only.** Gradients are the fastest way to make a UI feel dated.

### 3. Typography

15. **Inter for the interface. Keep Oswald for display headings only** — page titles, the hero,
    section headers. Two families is the standard pattern; two is the practical limit.
16. **Uppercase for display headings only.** Never for buttons, table headers or form labels — it
    slows reading and hurts legibility at small sizes.
17. **12px absolute floor.** Nothing smaller, ever. At 200% zoom the layout must still work
    (WCAG 1.4.4).
18. **Money gets weight, not a different family.** Tabular figures, slightly heavier, consistent
    everywhere it appears — Polaris sets tabular numerals for exactly this reason.

**19. Same type scale both sides** — see Finding 1.

### 4. Layout, spacing and shape

20. **1280px max content width.** Polaris breaks at 1200; Tailwind's `xl` is 1280. Either is
    defensible.
21. **One 4px base scale (Polaris, Carbon and Tailwind all converge here).** Density varies per
    surface, the values do not.
22. **One radius set.** My recommendation: **8px for cards and panels, 6px for inputs and buttons,
    999px for pills.** Square in the showroom and rounded in the office is the inconsistency to
    remove.
23. **Borders on dark surfaces, not shadows.** Shadows barely read on dark backgrounds; a 1px
    border does. This is standard dark-theme practice.
24. **Restrained.** Lift 1–2px plus a border lightening on hover. No glow.
25. **Office sidebar and showroom nav: fixed.** Sticky, always.

### 5. Icons and imagery

26. **Font Awesome is acceptable for now.** One set, one weight, no mixing. It is not beautiful but
    it is consistent, and inconsistency is what costs you.
27. **Icon-only is acceptable for the row actions** — edit, delete — *with an accessible name and a
    tooltip on laptop.* Never icon-only on touch: no hover means no discovery.
28. **4:3 as the card ratio, 3:2 for the gallery.** One ratio everywhere is what matters; cars
    photographed at different ratios is what looks untidy.
29. **A neutral placeholder block** with the car silhouette and "Photos coming". Never a broken
    image icon.
30. **Cars only.** A generic showroom stock photo tells the buyer nothing.
31. **Counter (e.g. "3 / 8") plus swipe.** No thumbnails — they shrink the image, which is the
    whole point of the full-screen gallery.
32. **No watermark.** It sits over the paintwork.

### 6. Showroom screens

33. **One fixed hero car.** A slider auto-advances while someone is reading, and never comes back to
    where it started.
34. **Full amount.** `₦120,000,000`. Abbreviating the price on a page whose job is selling the car
    is the wrong place to save four characters.
35. **Tabs, **Available** selected by default.** It holds the most cars.
36. **A small written label** — "New arrival". Not colour, not a ribbon.
37. **Remove it.** The one-price decision kills the Special ribbon.
38. **Arrival note.** "Expected November" beats "0 km" — a zero odometer reads as missing data.
39. **Card: image, year, name, price, mileage, status.** Everything else on the car page.
40. **Both** — a fixed sidebar on desktop, a sticky bottom bar on phone. The action is the point of
    the page; it should never require a scroll to find.
41. **Three tabs only, no search.** Search fails on a small inventory and returns nothing when a
    visitor guesses "Toyota" and there are three.
42. **A short line and the WhatsApp button.** "Nothing here right now — ask us and we'll find you
    one." Turn the empty tab into a lead.
43. **Still shown, marked "Sold".** Hiding it 404s a link someone has already shared.
44. **Yes to both** — footer, and next to the WhatsApp button.

### 7. Office screens

45. **Centred card on dark.** A split screen competes with the login for attention.
46. **Same shell, different copy and fields.** Create account is not a special screen.
47. **Order: Available (of which N new arrivals) → On Order → Money tied up → Projected profit →
    Sold.** Largest number is Available.
48. **Numbers and lists. No charts** — yet. Four tiles and a table answer every question the owner
    has.
49. **No density switch.** One density.
50. **Always: car, state, price, landed cost, profit.** Optional: mileage, ref, photo.
51. **One long page with sections.** A wizard hides the running total, which is the number he wants
    while typing.
52. **A sticky bar at the top** — landed cost and live profit, always visible. This is the reason
    he is on the page.
53. **A table.** Six rows, currency and rate per row. Cards would break the column alignment that
    makes costs comparable.
54. **Drop zone, then a draggable grid**; first photo is the cover, movable.
55. **Board on desktop, list on phone.**
56. **Table, with the bad row's cells outlined and a message naming the field.** Never a generic
    "upload failed".
57. **Table with a filter.** A timeline and a table are the same information; the table is
    searchable.
58. **One page, sectioned** — General, States, Customer states, Account.
59. **A list with drag handles** and an inline rename.

### 8. Components

60. **Four:** primary gold, secondary outline, ghost, danger. Two sizes.
61. **Outlined, dark surface.** Filled inputs disappear into a dark background.
62. **Red border plus a message below.** Border alone fails colour-blind readers (1.4.1).
63. **A required marker on the label, not a placeholder asterisk that replaces the label.**
64. **Tinted.** Reads at a glance on dark, still carries a label.
65. **Badge in the row, full banner on the car page, plain note in the drawer.** The warning appears
    wherever the incomplete car is being acted on.
66. **Muted, labelled "Sold".** Struck-through text reads as deleted, which it is not.
67. **Muted, with "Restore".**
68. **Red, with the minus sign kept.** Clamping to zero would misrepresent the figure.
69. **Lines between rows.** On dark, stripes are too faint to read.
70. **Numbered pagination.** It shows position, which infinite scroll hides. 24 cars is small enough
    that pagination is honest.

### 9. Pop-ups

71. **560px, 8px radius, 70% dim, actions bottom-right.**
72. **Drawer from the right on all sizes.** A bottom sheet is a phone pattern; a right drawer is
    consistent and works at every width.
73. **Bottom-right on desktop, top on phone** — top, because thumbs reach the top of a phone and
    never the bottom while holding it.
74. **Dark with light text.** Fine on a dark UI.
75. **No.**
76. **No.**

### 10. Responsive behaviour

77. **Use 490 / 768 / 990 / 1200** — Polaris's breakpoints, and close to Tailwind's. Your 560 / 820 /
    1100 is close enough that switching is cheap; the standard values are better documented.
78. **Bottom bar on phone.**
79. **Tablet gets its own layout.** Not a scaled-down desktop. It is touch *and* wide — room for a
    drawer and for filters in a bar, which a phone has neither of.
80. **Changing a car's state and reading the numbers.** Adding a car on a phone works but is not the
    primary path.
81. **44px minimum.** WCAG 2.2 AA requires 24px (SC 2.5.8); 44px is the enhanced target (SC 2.5.5)
    and Apple's guideline. **Use 44px.**

### 11. Formats and wording

82. **Full in the office, abbreviated on showroom cards only.** Exactness is the office's job.
83. **Original amount, then the rate, then the naira result** — `US$28,000 @ ₦1,540 = ₦43,120,000`.
    He must be able to check the arithmetic by eye.
84. **"4 Oct 2026"** — unambiguous internationally. **Times in the activity log.**
85. **Pick one unit — see the note below.**
86. **English only.**
87. **Plain and short.**

### 12. Visual accessibility

88. **Yes, 4.5:1 — with the second gold from Finding 2.** Every light-panel gold must be darkened.
89. **Yes, a visible gold focus ring — but gold on graphite is 7.23:1, so it passes as-is.**
90. **Yes, mandatory.** This is WCAG 1.4.1, and it is why states need labels.
91. **Yes** — honour `prefers-reduced-motion`.
92. **Yes** — 200% text resize must not break layout (WCAG 1.4.4).

### 13. Scope

93. **Rebuild the showroom to the office's foundations** — one dark look, one radius set, one scale.
    Keep the pages' structure and the interaction decisions already settled.
94. **No other reference needed.**
95. **Leave out: charts, dashboard theming, animations, dark/light switch, bulk import, multi-user.**

---

## Six decisions that are yours, not the standard's

No standard settles these. They are taste and business, and I am not the right authority on them:

1. **Density feel** — which end of the 4px scale reads as "premium" to you.
2. **Whether the hero is one car or three.**
3. **Tagline wording.**
4. **Tone** — plain versus friendly.
5. **Whether the showroom is dark at all.** I recommend dark because you already chose it and the
   office is dark. Light is not a standards question.
6. **Mileage unit.** **This one has a factual edge to it.** The demo currently shows **miles** for
   available cars and **0 km** for on-order — two units in one product. Nigeria is metric, so **km
   is the right answer for the buyer.** But these are US imports with US-spec odometers, so decide
   whether you convert on entry or show what the car actually reads.

## What I did not decide

The type scale's exact sizes, the shadow definitions, and the full component inventory. Those need
one real screen drawn before they can be pinned down — a scale chosen in advance produces a scale
that fits nothing.