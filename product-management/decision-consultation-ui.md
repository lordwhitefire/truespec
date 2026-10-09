# Decision dispatch — UI recommendation

**This is a craft dispatch.** It carries the whole package and one question. Paste it whole; a
partial package gets a partial answer.

**Workspace:** `/home/lordwhitefire/current-project/truespec`
**Prepared by:** the Product Management agent
**Date:** 2026-10-04

---

## What I am operating under

The `decision-consultation` discipline — hand over the whole package, get a decision back, execute
what it decided, and raise any disagreement to the owner rather than silently re-deriving. I am the
executor. I do not read a brain. You do.

## Who the owner is, and what is being built

A solo developer building a **client demo** for a car dealership owner in Nigeria — TrueSpec
Automotive. The client assesses the developer's judgment *before* sharing any business information.
The deliverable is a **working prototype carrying fake business data** — real application behaviour,
no real customer data.

Three layers of design, deliberately separated by the owner:

1. **Product model** — how the product works. Settled.
2. **Data model** — what is stored and how it flows. Settled.
3. **System model** — how it behaves at runtime, edge cases, guarantees. A 114-item checklist exists
   and is largely open.

The owner has moved on to **User Interface**, which he identified himself as one of four
product-model categories that were under-served: **UI, UX, Functionality, Business Logic.**

## What the owner actually said

- On targets, as a correction: **"we are building for 3 screens — phone, tablet and laptop"**
- On categorisation: **"Number one is the user interface… then functionality… the last thing is the
  business logic. What are the rules of the business? We need to also discuss this because it's
  very, very important for the product."**
- On method: **"can you search do ur research and prepar a document and give me ur recommandation —
  pls check standard method that have scaled before giving ur recommendatiion"**
- On colour: liked dark graphite with a warm gold accent, and said **"I like it. No other colours."**
- From the original brief, on visual direction: one type family, one weight, two sizes; desaturated
  greys for text and borders; spacious, photo-led; mobile-first stacked cards, two columns on
  desktop.
- On progress: **"yes tell me what you have decided on"** — asked after being told we have a
  direction but no system.
- On scope discipline, twice, unprompted: he objected when I reviewed a scratch demo folder
  (`test12`) he had declared throwaway, and again when I began fixing stale references across
  documents without being asked. **He expects the work he asked for, not adjacent work I think is
  useful.**

## What I did

Searched, and wrote `product-management/ui-design-recommendations.md`, answering a 95-question UI
questionnaire across 12 groups (brand, colour, typography, layout, icons, showroom screens, office
screens, components, pop-ups, responsive behaviour, formats and wording, visual accessibility,
scope).

**Sources, and how I weighted them:**

| Source | Nature | Weight |
|---|---|---|
| WCAG 2.2 (W3C, 2024) | Normative standard | Can settle a question — pass/fail |
| Shopify Polaris v12 | One team's design system, for a commerce storefront plus admin | A strong recommendation |
| Material Design 3 / Carbon / Tailwind | Three further independent systems | Convergence check |

Stated method: *a standard settles a question; one team's design system is a recommendation;
agreement across independent systems is what makes something a standard rather than a taste.*

## Research results

**WCAG 2.2, cited from the W3C documents:**

- SC 1.4.3 Contrast (Minimum), Level AA — **4.5:1** normal text, **3:1** large text (≥24px, or
  ≥18.66px bold). Logotypes are exempt from contrast.
- SC 2.5.8 Target Size (Minimum), Level AA — **24×24 CSS px**, with spacing, equivalent, inline,
  user-agent and essential exceptions.
- SC 2.5.5 Target Size (Enhanced) — **44×44 CSS px**.
- SC 1.4.1 Use of Color — status must not be conveyed by colour alone.
- SC 1.4.4 Resize Text — 200% without loss of content.

**Computed contrast for the owner's gold `#c8a24a`:**

| Pairing | Ratio | Result |
|---|---|---|
| Gold `#c8a24a` on graphite `#1a1a1a` | **7.23:1** | Passes AAA |
| Gold `#c8a24a` on white | **2.41:1** | Fails AA; fails even the 3:1 large-text floor |
| Dark text on a gold button | **7.23:1** | Passes |
| White text on a gold button | **2.41:1** | Fails |
| Proposed replacement `#8a6d1f` on white | **4.57:1** | Passes AA |

**Shopify Polaris v12, confirmed from its own documentation:**

- Base unit **4px**; `space-100` = 4px, `space-400` = 16px
- **Primitive + semantic token layers.** Semantic naming:
  `--p-color-[element]-[role]-[variant]-[state]`, where elements are bg / text / border / icon, and
  states include hover, active, selected, disabled
- v12 ships **Inter** as its UI face
- Colour palette is **10 shades per hue**, with alias tokens pointing at palette tokens, so one
  change cascades system-wide
- Breakpoints in use: **490 / 768 / 990 / 1200**
- Carries a four-role system status set: **success, attention, critical, info**
- Polaris v11 notes the problem it solved: 22 near-identical greys and colour sprawl, replaced by
  a defined palette with 10 deliberate shades per hue

**Convergence:** Tailwind, Carbon and Polaris independently use a **4px base**. Tailwind, Material
and Polaris independently arrived at **primitive + semantic token architecture**.

## The five findings I recommended on

**1. One token set, two expressions — not two design systems.** Polaris runs one spacing scale,
one radius set and one type scale across every surface. Difference between a consumer showroom and
a dense admin is expressed as **density and surface colour only**, never a second type family or a
second corner radius. Concretely: drop the mixed showroom (dark header/footer, light content) and go
all-dark on both sides; one radius set (8px cards, 6px inputs, 999px pills); one 4px base scale
used loose in the showroom and tight in the office.

**2. Two gold tokens, not one.** `#c8a24a` for dark surfaces, `#8a6d1f` for light panels. This
stays inside the owner's stated "no other colours," because both values are gold.

**3. Car states carry no colour at all.** Three reasons: unlimited custom states exhaust any palette
and a repeat makes two states look identical; WCAG 1.4.1 forbids colour as the sole signal; and
colour-per-state would leak the owner's private state labels to buyers, which the product model
already forbids. Group and a written label carry state instead. *System* conditions — error, costs
incomplete, success — do get the fixed four-role palette, because those are not user-defined.

**4. 44px tap targets** — above the AA minimum of 24px, at the enhanced level and the platform
guideline.

**5. Tablet gets its own layout**, not a scaled-down desktop, because it is touch *and* wide.
Breakpoints 490/768/990/1200 rather than the owner's guessed 560/820/1100.

**Also recommended against:** command palette, context menus, tooltips on touch, gradients, a
light/dark switch, charts, abbreviating prices on the showroom, and the crossed-out "was" price.

## What I deliberately refused to decide

Six items I called the owner's, not mine: **density feel, hero composition, tagline wording, tone,
whether the showroom is dark at all**, and **mileage unit**.

On mileage unit I flagged a factual issue: the demo shows **miles** for available cars and **0 km**
for on-order cars — two units in one product. Nigeria is metric, but these are US imports with
US-spec odometers, so it needs a decision between convert-on-entry and show-as-the-car-reads.

I also declined to pin the **exact type scale, shadow definitions and full component inventory**,
on the reasoning that *a scale chosen in advance produces a scale that fits nothing* — these need
one real screen drawn first.

## The one question

**Should the product model adopt this recommendation as written — single dark token set with one
spacing scale, one radius set and one type family across showroom and office; two gold tokens; no
colour per car state; 44px targets; tablet as its own layout; and the exclusions above — or should
any part of it be rejected or amended?**

I am least confident on three points, and would value your judgement on each:

**(a) Is Polaris the right governing reference for the consumer showroom as well as the admin?**
Polaris is Shopify's *admin* system and does not cover consumer storefronts. I extended its
principles to the showroom on the argument that Polaris runs one token layer across all of its
admin surfaces, and that storefront/admin differences should be density and surface colour only.
Is that a legitimate extension, or am I over-reading a system beyond its documented scope?

**(b) Is "no colour per state" right, given the showroom must make three groups distinguishable at a
glance?** My argument is that tab position and a written label carry it, and that unlimited custom
states make a palette unscalable. But a grid of cards where Available, On Order and Landed this year
are separated only by a small text label may be materially worse at a glance than by colour.

**(c) Is refusing to set the type scale and shadows until a real screen is drawn correct, or is it a
way of avoiding the decision?** The reasoning offered is that a scale picked in advance fits nothing.

---

**What I need back:** your decision, and the path to where you recorded it. If you need more
material — the full 95-question questionnaire, the recommendations document, the product model, the
data model, or the system-model checklist — say what you need and it will be provided whole rather
than in pieces.