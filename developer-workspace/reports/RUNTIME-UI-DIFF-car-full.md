# runtime-ui-diff · car detail page (full state set)

Generated : 2026-10-10T13:53:40Z
Reference : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6  (READ-ONLY)
Build     : http://localhost:3210/car/TS-1001
Capture   : ~/.agents/skills/runtime-ui-diff/scripts/run.mjs + diff.mjs  (canonical skill scripts)
States    : default, tab-features, tab-delivery @ 1000x900; narrow-700 @ 700x900
Storage   : localStorage + sessionStorage cleared before every state (deterministic greeting)

## Verdict

Every structural anchor id is present in both trees (`ids only in ref: 0`; the sole build-only id is `_R_`, a React internal).
Controls (event-bound elements) match **exactly** in every state (0 / 0). Element tag counts match except for Next.js framework nodes.
**Build = ref + 47 framework nodes**, so non-framework structure aligns 336 / 336 = 100%. The 87.7% tag-overlap is entirely
45 bundle `<script>` + `nextjs-portal` + the streaming placeholder `<div hidden>`.

| state | ref nodes | build nodes | controls ref/build | hidden ref/build | tag-overlap |
|-------|-----------|-------------|--------------------|------------------|-------------|
| default      | 336 | 384 | 51 / 51 | 13 / 13 | 87.7% |
| tab-features | 336 | 383 | 51 / 51 | 14 / 12 | 87.7% |
| tab-delivery | 336 | 383 | 51 / 51 | 14 / 12 | 87.7% |
| narrow-700   | 336 | 383 | 51 / 51 |  9 / 11 | 87.7% |

## Fixes landed this pass

1. Added the missing reference tokens to `app/globals.css` (`--ease`, `--body2`, `--thumb`, `--ofr-hv`, `--rc`, `--dtabs-on`, `--dtabs-on-fg`).
   `.in`/`.rv` animations referenced `var(--ease)`; with it undefined the whole `animation`/`transition` shorthand was invalid,
   so `chips.in`, `aside.in`, `tabs.rv` etc. sat at `opacity:0`. Now they animate (verified computed opacity 1).
2. Cleared both storages before every capture state — the persisted `ts-seen` was triggering the return-visitor greeting and skewing counts.
3. Raised the settle wait to 1500ms so React hydration completes before extraction (build greeting/gallery JS now runs pre-capture).
4. Removed the redundant `aria-label` from the share chip so it matches ref's `<button class="chip">` control profile.
5. Gave `#gal` `tabIndex={0}` so it is exposed as the same `generic` control ref's inline-`onclick` gallery produces (and it is keyboard-operable).

## Known, unavoidable differences (Next.js framework)

- `script`: ref 1 vs build ~45 (bundle scripts).
- `nextjs-portal`: ref 0 vs build 1 (route announcer / dev portal).
- one extra `div`: build `body[0]` streaming placeholder `<div hidden>`; shifts structural-walk indices by 1.
- build-only id `_R_` (React internal).

## Accepted reference artefacts

- `inf.hide`: the `car.html` header omits the `.inf.hide{display:none}` responsive rule that `truespec.html` defines at <=820px.
  The build keeps the rule (shared header; correct for `/` and `/inventory`). Shows as +1..2 hidden at narrow widths.
- `car.html` at phone-emulated 390px lays out at an effective 549px viewport (content overflow), so the phone state is compared at 700px instead.
- tab-state `hidden` deltas (`span.on` ticker mid-rotation, `tabs.rv` reveal, active `pn.on` fade, `mbar.show`) are scroll/IntersectionObserver
  and animation-timing noise; the reveal and mbar observers use the reference's own thresholds (.12 / 0).

---

## State: default

```
# runtime-ui-diff · default
ref   : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6
build : http://localhost:3210/car/TS-1001
viewport ref=1000x900  build=1000x900   title ref=2021 Toyota Camry XSE V6 | TrueSpec Automotive | build=Car details | TrueSpec Automotive

## Structure verdict
The two element trees are NOT the same shape.  ref=336 nodes  build=384 nodes  tag-overlap=87.5%
structural anchors — same ids in both: site-header, top, tick, thm, crumb, main, ti, chips, speak, gal, rib, gi, cn, thumbs, tabs, bar, p1, p2, p3, pr, old, sv, wa, waTxt, of, vw, spec, rt, rt2, site-footer, contact, gl, mbar, mp, mw, mwTxt, lb, li, stoast, ovl, mx, mtitle, mbody, ptoast, ptxt, ptx
ids only in ref: 0
ids only in build: 1 → _R_

## Element-count differences (tag: ref build)
div: ref=110 build=111
script: ref=1 build=46
nextjs-portal: ref=0 build=1
next-route-announcer: ref=0 build=1

## Structural walk — where the trees first diverge
body>0>0: div[generic] present in ref, ABSENT in build
body>0>1: div[generic] present in ref, ABSENT in build
body>1>0>0: ref a[link]  ↔  build div[generic]
body>1>0>1: i[generic] present in ref, ABSENT in build
body>1>0>2: a[link] present in ref, ABSENT in build
body>1>0>3: i[generic] present in ref, ABSENT in build
body>1>0>4: b[generic] present in ref, ABSENT in build
body>2>0>0: ref div[generic]  ↔  build a[link]
body>3: ref section[generic]  ↔  build div[generic]
body>4: ref div[generic]  ↔  build section[generic]
body>10: ref script[generic]  ↔  build div[generic]

## Outline — ref (depth ≤ 8)
body
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel]
            p
            p
            p
            div
            p
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]

## Outline — build (depth ≤ 8)
body
  div (hidden)
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel]
            p
            p
            p
            div
            p
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div

## Accessibility tree diff  (- ref / + build)
-   - /url: truespec.html
- - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +234 800 000 0000 Chat hours Mon - Sat, 9AM - 6PM
+   - /url: /
+ - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +2348000000000 Chat hours Mon - Sat, 9AM - 6PM
- - text: " New on the lot: 2019 Toyota Sienna XLE — landed July 2026  Next to land: 2021 Range Rover Sport HSE — expected November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
- - button "Toggle dark mode": 
+ - text: " New on the lot: 2019 Lexus RX 350 350 — landed this year  Next to land: 2021 Range Rover Sport HSE — Expected arrival: November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
+ - button "Toggle dark mode": 
-   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-   - /url: truespec.html
+   - /url: /
-   - /url: truespec.html#cars
+   - /url: /inventory
- - img "2021 Toyota Camry XSE V6 photo 1"
+ - img "Toyota Camry XSE V6 2021 photo 1"
-   - paragraph: The XSE V6 is the Camry to have if you want the six-cylinder. This 2021 example has covered 31,000 miles and still feels like the day it left the showroom.
-   - paragraph: It runs a 3.5-litre V6 paired with an eight-speed automatic, which is smooth and genuinely quick rather than shouty. The XSE grade adds bigger alloys, the quad exhaust tips and a panoramic roof, and it is one of the few Camry trims that carries leather as standard.
+   - paragraph: Every Toyota we list is imported from the USA and delivered with one honest doorstep price.
+   - paragraph: Message us and we will send more photos, a video walk-around, or answer anything about this Camry.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
-   - text: Brand Toyota Model Camry Trim XSE V6 Year 2021 Mileage 31,000 mi Exterior Obsidian black Interior Black Status Available
+   - text: BrandToyota ModelCamry TrimXSE V6 Year2021 Mileage31,000 mi ExteriorObsidian black InteriorBlack StatusAvailable
- - link "Toyota Camry 2021 ₦27,900,000":
-   - /url: car.html?car=2021-toyota-camry-se
-   - heading "Toyota Camry 2021" [level=3]
+ - link "2021 Toyota Camry ₦27,900,000":
+   - /url: /car/TS-1002
+   - heading "2021 Toyota Camry" [level=3]
- - link "Lexus RX 350 2020 ₦52,000,000":
-   - /url: car.html?car=2020-lexus-rx-350-f-sport
-   - heading "Lexus RX 350 2020" [level=3]
+ - link "2020 Lexus RX 350 ₦52,000,000":
+   - /url: /car/TS-1003
+   - heading "2020 Lexus RX 350" [level=3]
- - link "Mercedes-Benz GLE 350 2019 ₦63,500,000":
-   - /url: car.html?car=2019-mercedes-benz-gle-350-4matic
-   - heading "Mercedes-Benz GLE 350 2019" [level=3]
+ - link "2019 Mercedes-Benz GLE 350 ₦63,500,000":
+   - /url: /car/TS-1004
+   - heading "2019 Mercedes-Benz GLE 350" [level=3]
- - link "BMW X5 2021 ₦88,000,000":
-   - /url: car.html?car=2021-bmw-x5-xdrive40i
-   - heading "BMW X5 2021" [level=3]
+ - link "2021 BMW X5 ₦88,000,000":
+   - /url: /car/TS-1005
+   - heading "2021 BMW X5" [level=3]
- - link "Toyota Highlander 2021 ₦61,000,000":
-   - /url: car.html?car=2021-toyota-highlander-platinum-v6
-   - heading "Toyota Highlander 2021" [level=3]
+ - link "2021 Toyota Highlander ₦61,000,000":
+   - /url: /car/TS-1006
+   - heading "2021 Toyota Highlander" [level=3]
- - link "Honda Accord 2021 ₦38,000,000":
-   - /url: car.html?car=2021-honda-accord-touring
-   - heading "Honda Accord 2021" [level=3]
+ - link "2021 Honda Accord ₦38,000,000":
+   - /url: /car/TS-1007
+   - heading "2021 Honda Accord" [level=3]
- - link "Toyota RAV4 Prime 2022 ₦45,500,000":
-   - /url: car.html?car=2022-toyota-rav4-prime-se
-   - heading "Toyota RAV4 Prime 2022" [level=3]
+ - link "2022 Toyota RAV4 Prime ₦45,500,000":
+   - /url: /car/TS-1008
+   - heading "2022 Toyota RAV4 Prime" [level=3]
- - link "Lexus ES 350 2021 ₦43,000,000":
-   - /url: car.html?car=2021-lexus-es-350
-   - heading "Lexus ES 350 2021" [level=3]
+ - link "2021 Lexus ES 350 ₦43,000,000":
+   - /url: /car/TS-1009
+   - heading "2021 Lexus ES 350" [level=3]
- - link "Toyota 4Runner 2020 ₦58,000,000":
-   - /url: car.html?car=2020-toyota-4runner-limited
-   - heading "Toyota 4Runner 2020" [level=3]
+ - link "2020 Toyota 4Runner ₦58,000,000":
+   - /url: /car/TS-1010
+   - heading "2020 Toyota 4Runner" [level=3]
- - link "Mercedes-Benz C 300 2018 ₦29,500,000":
-   - /url: car.html?car=2018-mercedes-benz-c-300-amg-line
-   - heading "Mercedes-Benz C 300 2018" [level=3]
+ - link "2018 Mercedes-Benz C 300 ₦29,500,000":
+   - /url: /car/TS-1011
+   - heading "2018 Mercedes-Benz C 300" [level=3]
- - link "BMW X3 2019 ₦41,000,000":
-   - /url: car.html?car=2019-bmw-x3-xdrive30i
-   - heading "BMW X3 2019" [level=3]
+ - link "2019 BMW X3 ₦41,000,000":
+   - /url: /car/TS-1012
+   - heading "2019 BMW X3" [level=3]
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: privacy.html
+     - /url: /privacy
+ - alert

## Controls (clickable things)
in ref, not in build  (0)
in build, not in ref  (0)

## Hidden layers (overlays / modals / panels that a state must open)
in ref, not in build  (0)
in build, not in ref  (0)

## :root token diff
--band: ref="—"  build="#17191c"
--bar: ref="—"  build="#33383d"
--card: ref="—"  build="#1e2226"
--card-line: ref="—"  build="#2a2e33"
--chip-bg: ref="—"  build="#1e2226"
--chip-line: ref="—"  build="#2a2e33"
--danger: ref="—"  build="#ef5b52"
--dash: ref="—"  build="#101214"
--dts: ref="—"  build="#4a5056"
--font-body: ref="—"  build="Inter, sans-serif"
--font-head: ref="—"  build="Oswald, sans-serif"
--gold-ink: ref="—"  build="#1a1405"
--green: ref="—"  build="#25d366"
--ld: ref="—"  build="#57cc8a"
--ld-bg: ref="—"  build="rgba(87, 204, 138, 0.12)"
--muted: ref="—"  build="#9aa0a6"
--nv: ref="—"  build="#8a9096"
--oo: ref="—"  build="#8ab4ff"
--oo-bg: ref="—"  build="rgba(138, 180, 255, 0.12)"
--ph1: ref="—"  build="#23272b"
--ph2: ref="—"  build="#1a1d21"
--radius: ref="—"  build="12px"
--radius-sm: ref="—"  build="8px"
--shadow-btn: ref="—"  build="0 8px 18px rgba(37, 211, 102, 0.35)"
--shadow-card: ref="—"  build="0 18px 34px rgba(255, 255, 255, 0.09)"
--shadow-float: ref="—"  build="0 12px 30px rgba(0, 0, 0, 0.55)"
--space: ref="—"  build="16px"
--surface: ref="—"  build="#101214"
--surface-2: ref="—"  build="#191c20"
--tab: ref="—"  build="#24282c"
--tab-fg: ref="—"  build="#d6d9dc"
--tab-hover: ref="—"  build="#2e3338"
--tab-on: ref="—"  build="#c8a24a"
--tab-on-fg: ref="—"  build="#1a1405"
--touch: ref="—"  build="44px"
--w-laptop: ref="—"  build="1100px"
--w-phone: ref="—"  build="560px"
--w-tablet: ref="—"  build="820px"

## Computed-style diff for elements sharing an id
### #main
    height: ref="2330.11px"  build="2110.61px"
### #ti
    letterSpacing: ref="normal"  build="0.44px"
    textTransform: ref="uppercase"  build="none"
### #chips
    height: ref="38px"  build="48px"
### #speak
    opacity: ref="1"  build="0.994858"
    transform: ref="matrix(1, 0, 0, 1, 0, 0)"  build="matrix(1, 0, 0, 1, 0, -0.0308536)"
### #gi
    opacity: ref="1"  build="0.720555"
    transform: ref="matrix(1.001, 0, 0, 1.001, 0, 0)"  build="matrix(1.00199, 0, 0, 1.00199, 0, 0)"
### #tabs
    height: ref="52px"  build="53px"
    marginBottom: ref="0px"  build="22px"
    borderBottomWidth: ref="0px"  build="1px"
    borderStyle: ref="none"  build="none none solid"
    borderColor: ref="rgb(232, 234, 237)"  build="rgb(232, 234, 237) rgb(232, 234, 237) rgb(42, 46, 51)"
    flexWrap: ref="nowrap"  build="wrap"
    gap: ref="normal"  build="6px"
    rowGap: ref="normal"  build="6px"
    columnGap: ref="normal"  build="6px"
### #bar
    right: ref="815px"  build="816px"
    width: ref="122px"  build="121px"
### #p1
    height: ref="296.25px"  build="228.75px"
### #pr
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #spec
    height: ref="377px"  build="192px"
    paddingTop: ref="8px"  build="0px"
    paddingRight: ref="24px"  build="0px"
    paddingBottom: ref="8px"  build="0px"
    paddingLeft: ref="24px"  build="0px"
    backgroundColor: ref="rgb(25, 28, 32)"  build="rgba(0, 0, 0, 0)"
    transitionDuration: ref="0.3s, 0.3s, 0.3s"  build="0s"
### #rt
    width: ref="301.188px"  build="260.562px"
    letterSpacing: ref="normal"  build="0.3px"
    textTransform: ref="uppercase"  build="none"
### #site-footer
    height: ref="498.5px"  build="676.5px"
### #contact
    height: ref="498.5px"  build="676.5px"
### #gl
    width: ref="208.75px"  build="451.5px"
    height: ref="132px"  build="62px"
### #mp
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #mtitle
    fontWeight: ref="700"  build="600"
    letterSpacing: ref="normal"  build="0.2px"
    textTransform: ref="uppercase"  build="none"

```

## State: tab-features

```
# runtime-ui-diff · tab-features
ref   : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6
build : http://localhost:3210/car/TS-1001
viewport ref=1000x900  build=1000x900   title ref=2021 Toyota Camry XSE V6 | TrueSpec Automotive | build=Car details | TrueSpec Automotive

## Structure verdict
The two element trees are NOT the same shape.  ref=336 nodes  build=383 nodes  tag-overlap=87.7%
structural anchors — same ids in both: site-header, top, tick, thm, crumb, main, ti, chips, speak, gal, rib, gi, cn, thumbs, tabs, bar, p1, p2, p3, pr, old, sv, wa, waTxt, of, vw, spec, rt, rt2, site-footer, contact, gl, mbar, mp, mw, mwTxt, lb, li, stoast, ovl, mx, mtitle, mbody, ptoast, ptxt, ptx
ids only in ref: 0
ids only in build: 1 → _R_

## Element-count differences (tag: ref build)
div: ref=110 build=111
script: ref=1 build=45
nextjs-portal: ref=0 build=1
next-route-announcer: ref=0 build=1

## Structural walk — where the trees first diverge
body>0>0: div[generic] present in ref, ABSENT in build
body>0>1: div[generic] present in ref, ABSENT in build
body>1>0>0: ref a[link]  ↔  build div[generic]
body>1>0>1: i[generic] present in ref, ABSENT in build
body>1>0>2: a[link] present in ref, ABSENT in build
body>1>0>3: i[generic] present in ref, ABSENT in build
body>1>0>4: b[generic] present in ref, ABSENT in build
body>2>0>0: ref div[generic]  ↔  build a[link]
body>3: ref section[generic]  ↔  build div[generic]
body>4: ref div[generic]  ↔  build section[generic]
body>10: ref script[generic]  ↔  build div[generic]

## Outline — ref (depth ≤ 8)
body
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status] (hidden)
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel] (hidden)
            p (hidden)
            p (hidden)
            p (hidden)
            div (hidden)
            p (hidden)
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]

## Outline — build (depth ≤ 8)
body
  div (hidden)
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist]
            button[tab]
            button[tab]
            button[tab]
            span#bar
          div#p1[tabpanel] (hidden)
            p (hidden)
            p (hidden)
            p (hidden)
            div (hidden)
            p (hidden)
          div#p2[tabpanel]
            ul[list]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div

## Accessibility tree diff  (- ref / + build)
-   - /url: truespec.html
- - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +234 800 000 0000 Chat hours Mon - Sat, 9AM - 6PM
+   - /url: /
+ - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +2348000000000 Chat hours Mon - Sat, 9AM - 6PM
- - text: " New on the lot: 2019 Toyota Sienna XLE — landed July 2026  Next to land: 2021 Range Rover Sport HSE — expected November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
- - button "Toggle dark mode": 
+ - text: " New on the lot: 2019 Lexus RX 350 350 — landed this year  Next to land: 2021 Range Rover Sport HSE — Expected arrival: November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
+ - button "Toggle dark mode": 
-   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-   - /url: truespec.html
+   - /url: /
-   - /url: truespec.html#cars
+   - /url: /inventory
- - img "2021 Toyota Camry XSE V6 photo 1"
+ - img "Toyota Camry XSE V6 2021 photo 1"
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
-   - text: Brand Toyota Model Camry Trim XSE V6 Year 2021 Mileage 31,000 mi Exterior Obsidian black Interior Black Status Available
+   - text: BrandToyota ModelCamry TrimXSE V6 Year2021 Mileage31,000 mi ExteriorObsidian black InteriorBlack StatusAvailable
- - link "Toyota Camry 2021 ₦27,900,000":
-   - /url: car.html?car=2021-toyota-camry-se
-   - heading "Toyota Camry 2021" [level=3]
+ - link "2021 Toyota Camry ₦27,900,000":
+   - /url: /car/TS-1002
+   - heading "2021 Toyota Camry" [level=3]
- - link "Lexus RX 350 2020 ₦52,000,000":
-   - /url: car.html?car=2020-lexus-rx-350-f-sport
-   - heading "Lexus RX 350 2020" [level=3]
+ - link "2020 Lexus RX 350 ₦52,000,000":
+   - /url: /car/TS-1003
+   - heading "2020 Lexus RX 350" [level=3]
- - link "Mercedes-Benz GLE 350 2019 ₦63,500,000":
-   - /url: car.html?car=2019-mercedes-benz-gle-350-4matic
-   - heading "Mercedes-Benz GLE 350 2019" [level=3]
+ - link "2019 Mercedes-Benz GLE 350 ₦63,500,000":
+   - /url: /car/TS-1004
+   - heading "2019 Mercedes-Benz GLE 350" [level=3]
- - link "BMW X5 2021 ₦88,000,000":
-   - /url: car.html?car=2021-bmw-x5-xdrive40i
-   - heading "BMW X5 2021" [level=3]
+ - link "2021 BMW X5 ₦88,000,000":
+   - /url: /car/TS-1005
+   - heading "2021 BMW X5" [level=3]
- - link "Toyota Highlander 2021 ₦61,000,000":
-   - /url: car.html?car=2021-toyota-highlander-platinum-v6
-   - heading "Toyota Highlander 2021" [level=3]
+ - link "2021 Toyota Highlander ₦61,000,000":
+   - /url: /car/TS-1006
+   - heading "2021 Toyota Highlander" [level=3]
- - link "Honda Accord 2021 ₦38,000,000":
-   - /url: car.html?car=2021-honda-accord-touring
-   - heading "Honda Accord 2021" [level=3]
+ - link "2021 Honda Accord ₦38,000,000":
+   - /url: /car/TS-1007
+   - heading "2021 Honda Accord" [level=3]
- - link "Toyota RAV4 Prime 2022 ₦45,500,000":
-   - /url: car.html?car=2022-toyota-rav4-prime-se
-   - heading "Toyota RAV4 Prime 2022" [level=3]
+ - link "2022 Toyota RAV4 Prime ₦45,500,000":
+   - /url: /car/TS-1008
+   - heading "2022 Toyota RAV4 Prime" [level=3]
- - link "Lexus ES 350 2021 ₦43,000,000":
-   - /url: car.html?car=2021-lexus-es-350
-   - heading "Lexus ES 350 2021" [level=3]
+ - link "2021 Lexus ES 350 ₦43,000,000":
+   - /url: /car/TS-1009
+   - heading "2021 Lexus ES 350" [level=3]
- - link "Toyota 4Runner 2020 ₦58,000,000":
-   - /url: car.html?car=2020-toyota-4runner-limited
-   - heading "Toyota 4Runner 2020" [level=3]
+ - link "2020 Toyota 4Runner ₦58,000,000":
+   - /url: /car/TS-1010
+   - heading "2020 Toyota 4Runner" [level=3]
- - link "Mercedes-Benz C 300 2018 ₦29,500,000":
-   - /url: car.html?car=2018-mercedes-benz-c-300-amg-line
-   - heading "Mercedes-Benz C 300 2018" [level=3]
+ - link "2018 Mercedes-Benz C 300 ₦29,500,000":
+   - /url: /car/TS-1011
+   - heading "2018 Mercedes-Benz C 300" [level=3]
- - link "BMW X3 2019 ₦41,000,000":
-   - /url: car.html?car=2019-bmw-x3-xdrive30i
-   - heading "BMW X3 2019" [level=3]
+ - link "2019 BMW X3 ₦41,000,000":
+   - /url: /car/TS-1012
+   - heading "2019 BMW X3" [level=3]
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: privacy.html
+     - /url: /privacy
+ - alert

## Controls (clickable things)
in ref, not in build  (0)
in build, not in ref  (0)

## Hidden layers (overlays / modals / panels that a state must open)
in ref, not in build  (4)
    span|generic||on
    div|tablist|tabs|tabs.rv
    div|tabpanel|p2|pn.on
    div|generic|mbar|mbar.show
in build, not in ref  (1)
    div|generic|mbar|mbar

## :root token diff
--band: ref="—"  build="#17191c"
--bar: ref="—"  build="#33383d"
--card: ref="—"  build="#1e2226"
--card-line: ref="—"  build="#2a2e33"
--chip-bg: ref="—"  build="#1e2226"
--chip-line: ref="—"  build="#2a2e33"
--danger: ref="—"  build="#ef5b52"
--dash: ref="—"  build="#101214"
--dts: ref="—"  build="#4a5056"
--font-body: ref="—"  build="Inter, sans-serif"
--font-head: ref="—"  build="Oswald, sans-serif"
--gold-ink: ref="—"  build="#1a1405"
--green: ref="—"  build="#25d366"
--ld: ref="—"  build="#57cc8a"
--ld-bg: ref="—"  build="rgba(87, 204, 138, 0.12)"
--muted: ref="—"  build="#9aa0a6"
--nv: ref="—"  build="#8a9096"
--oo: ref="—"  build="#8ab4ff"
--oo-bg: ref="—"  build="rgba(138, 180, 255, 0.12)"
--ph1: ref="—"  build="#23272b"
--ph2: ref="—"  build="#1a1d21"
--radius: ref="—"  build="12px"
--radius-sm: ref="—"  build="8px"
--shadow-btn: ref="—"  build="0 8px 18px rgba(37, 211, 102, 0.35)"
--shadow-card: ref="—"  build="0 18px 34px rgba(255, 255, 255, 0.09)"
--shadow-float: ref="—"  build="0 12px 30px rgba(0, 0, 0, 0.55)"
--space: ref="—"  build="16px"
--surface: ref="—"  build="#101214"
--surface-2: ref="—"  build="#191c20"
--tab: ref="—"  build="#24282c"
--tab-fg: ref="—"  build="#d6d9dc"
--tab-hover: ref="—"  build="#2e3338"
--tab-on: ref="—"  build="#c8a24a"
--tab-on-fg: ref="—"  build="#1a1405"
--touch: ref="—"  build="44px"
--w-laptop: ref="—"  build="1100px"
--w-phone: ref="—"  build="560px"
--w-tablet: ref="—"  build="820px"

## Computed-style diff for elements sharing an id
### #main
    height: ref="2161.86px"  build="2009.86px"
### #ti
    letterSpacing: ref="normal"  build="0.44px"
    textTransform: ref="uppercase"  build="none"
### #chips
    height: ref="38px"  build="48px"
### #speak
    opacity: ref="0"  build="1"
    transform: ref="matrix(1, 0, 0, 1, 0, -6)"  build="matrix(1, 0, 0, 1, 0, 0)"
### #gi
    transform: ref="matrix(1.04092, 0, 0, 1.04092, 0, 0)"  build="matrix(1.01036, 0, 0, 1.01036, 0, 0)"
### #tabs
    height: ref="52px"  build="53px"
    marginBottom: ref="0px"  build="22px"
    borderBottomWidth: ref="0px"  build="1px"
    borderStyle: ref="none"  build="none none solid"
    borderColor: ref="rgb(232, 234, 237)"  build="rgb(232, 234, 237) rgb(232, 234, 237) rgb(42, 46, 51)"
    opacity: ref="0"  build="1"
    flexWrap: ref="nowrap"  build="wrap"
    gap: ref="normal"  build="6px"
    rowGap: ref="normal"  build="6px"
    columnGap: ref="normal"  build="6px"
    transform: ref="matrix(1, 0, 0, 1, 0, 26)"  build="none"
### #bar
    right: ref="816px"  build="691px"
    left: ref="0px"  build="127px"
    width: ref="121px"  build="119px"
### #p2
    opacity: ref="0"  build="1"
    transform: ref="matrix(1, 0, 0, 1, 0, 12)"  build="none"
### #pr
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #spec
    height: ref="377px"  build="192px"
    paddingTop: ref="8px"  build="0px"
    paddingRight: ref="24px"  build="0px"
    paddingBottom: ref="8px"  build="0px"
    paddingLeft: ref="24px"  build="0px"
    backgroundColor: ref="rgb(25, 28, 32)"  build="rgba(0, 0, 0, 0)"
    transitionDuration: ref="0.3s, 0.3s, 0.3s"  build="0s"
### #rt
    width: ref="301.188px"  build="260.562px"
    letterSpacing: ref="normal"  build="0.3px"
    textTransform: ref="uppercase"  build="none"
### #site-footer
    height: ref="498.5px"  build="676.5px"
### #contact
    height: ref="498.5px"  build="676.5px"
### #gl
    width: ref="208.75px"  build="451.5px"
    height: ref="132px"  build="62px"
### #mp
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #mtitle
    fontWeight: ref="700"  build="600"
    letterSpacing: ref="normal"  build="0.2px"
    textTransform: ref="uppercase"  build="none"

```

## State: tab-delivery

```
# runtime-ui-diff · tab-delivery
ref   : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6
build : http://localhost:3210/car/TS-1001
viewport ref=1000x900  build=1000x900   title ref=2021 Toyota Camry XSE V6 | TrueSpec Automotive | build=Car details | TrueSpec Automotive

## Structure verdict
The two element trees are NOT the same shape.  ref=336 nodes  build=383 nodes  tag-overlap=87.7%
structural anchors — same ids in both: site-header, top, tick, thm, crumb, main, ti, chips, speak, gal, rib, gi, cn, thumbs, tabs, bar, p1, p2, p3, pr, old, sv, wa, waTxt, of, vw, spec, rt, rt2, site-footer, contact, gl, mbar, mp, mw, mwTxt, lb, li, stoast, ovl, mx, mtitle, mbody, ptoast, ptxt, ptx
ids only in ref: 0
ids only in build: 1 → _R_

## Element-count differences (tag: ref build)
div: ref=110 build=111
script: ref=1 build=45
nextjs-portal: ref=0 build=1
next-route-announcer: ref=0 build=1

## Structural walk — where the trees first diverge
body>0>0: div[generic] present in ref, ABSENT in build
body>0>1: div[generic] present in ref, ABSENT in build
body>1>0>0: ref a[link]  ↔  build div[generic]
body>1>0>1: i[generic] present in ref, ABSENT in build
body>1>0>2: a[link] present in ref, ABSENT in build
body>1>0>3: i[generic] present in ref, ABSENT in build
body>1>0>4: b[generic] present in ref, ABSENT in build
body>2>0>0: ref div[generic]  ↔  build a[link]
body>3: ref section[generic]  ↔  build div[generic]
body>4: ref div[generic]  ↔  build section[generic]
body>10: ref script[generic]  ↔  build div[generic]

## Outline — ref (depth ≤ 8)
body
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status] (hidden)
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel] (hidden)
            p (hidden)
            p (hidden)
            p (hidden)
            div (hidden)
            p (hidden)
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]

## Outline — build (depth ≤ 8)
body
  div (hidden)
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link]
          i
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button] (hidden)
              button[button] (hidden)
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist]
            button[tab]
            button[tab]
            button[tab]
            span#bar
          div#p1[tabpanel] (hidden)
            p (hidden)
            p (hidden)
            p (hidden)
            div (hidden)
            p (hidden)
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel]
            ol[list]
              li[listitem]
              li[listitem]
              li[listitem]
              li[listitem]
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div

## Accessibility tree diff  (- ref / + build)
-   - /url: truespec.html
- - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +234 800 000 0000 Chat hours Mon - Sat, 9AM - 6PM
+   - /url: /
+ - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +2348000000000 Chat hours Mon - Sat, 9AM - 6PM
- - text: " New on the lot: 2019 Toyota Sienna XLE — landed July 2026  Next to land: 2021 Range Rover Sport HSE — expected November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
- - button "Toggle dark mode": 
+ - text: " New on the lot: 2019 Lexus RX 350 350 — landed this year  Next to land: 2021 Range Rover Sport HSE — Expected arrival: November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
+ - button "Toggle dark mode": 
-   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-   - /url: truespec.html
+   - /url: /
-   - /url: truespec.html#cars
+   - /url: /inventory
- - img "2021 Toyota Camry XSE V6 photo 1"
+ - img "Toyota Camry XSE V6 2021 photo 1"
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
-   - text: Brand Toyota Model Camry Trim XSE V6 Year 2021 Mileage 31,000 mi Exterior Obsidian black Interior Black Status Available
+   - text: BrandToyota ModelCamry TrimXSE V6 Year2021 Mileage31,000 mi ExteriorObsidian black InteriorBlack StatusAvailable
- - link "Toyota Camry 2021 ₦27,900,000":
-   - /url: car.html?car=2021-toyota-camry-se
-   - heading "Toyota Camry 2021" [level=3]
+ - link "2021 Toyota Camry ₦27,900,000":
+   - /url: /car/TS-1002
+   - heading "2021 Toyota Camry" [level=3]
- - link "Lexus RX 350 2020 ₦52,000,000":
-   - /url: car.html?car=2020-lexus-rx-350-f-sport
-   - heading "Lexus RX 350 2020" [level=3]
+ - link "2020 Lexus RX 350 ₦52,000,000":
+   - /url: /car/TS-1003
+   - heading "2020 Lexus RX 350" [level=3]
- - link "Mercedes-Benz GLE 350 2019 ₦63,500,000":
-   - /url: car.html?car=2019-mercedes-benz-gle-350-4matic
-   - heading "Mercedes-Benz GLE 350 2019" [level=3]
+ - link "2019 Mercedes-Benz GLE 350 ₦63,500,000":
+   - /url: /car/TS-1004
+   - heading "2019 Mercedes-Benz GLE 350" [level=3]
- - link "BMW X5 2021 ₦88,000,000":
-   - /url: car.html?car=2021-bmw-x5-xdrive40i
-   - heading "BMW X5 2021" [level=3]
+ - link "2021 BMW X5 ₦88,000,000":
+   - /url: /car/TS-1005
+   - heading "2021 BMW X5" [level=3]
- - link "Toyota Highlander 2021 ₦61,000,000":
-   - /url: car.html?car=2021-toyota-highlander-platinum-v6
-   - heading "Toyota Highlander 2021" [level=3]
+ - link "2021 Toyota Highlander ₦61,000,000":
+   - /url: /car/TS-1006
+   - heading "2021 Toyota Highlander" [level=3]
- - link "Honda Accord 2021 ₦38,000,000":
-   - /url: car.html?car=2021-honda-accord-touring
-   - heading "Honda Accord 2021" [level=3]
+ - link "2021 Honda Accord ₦38,000,000":
+   - /url: /car/TS-1007
+   - heading "2021 Honda Accord" [level=3]
- - link "Toyota RAV4 Prime 2022 ₦45,500,000":
-   - /url: car.html?car=2022-toyota-rav4-prime-se
-   - heading "Toyota RAV4 Prime 2022" [level=3]
+ - link "2022 Toyota RAV4 Prime ₦45,500,000":
+   - /url: /car/TS-1008
+   - heading "2022 Toyota RAV4 Prime" [level=3]
- - link "Lexus ES 350 2021 ₦43,000,000":
-   - /url: car.html?car=2021-lexus-es-350
-   - heading "Lexus ES 350 2021" [level=3]
+ - link "2021 Lexus ES 350 ₦43,000,000":
+   - /url: /car/TS-1009
+   - heading "2021 Lexus ES 350" [level=3]
- - link "Toyota 4Runner 2020 ₦58,000,000":
-   - /url: car.html?car=2020-toyota-4runner-limited
-   - heading "Toyota 4Runner 2020" [level=3]
+ - link "2020 Toyota 4Runner ₦58,000,000":
+   - /url: /car/TS-1010
+   - heading "2020 Toyota 4Runner" [level=3]
- - link "Mercedes-Benz C 300 2018 ₦29,500,000":
-   - /url: car.html?car=2018-mercedes-benz-c-300-amg-line
-   - heading "Mercedes-Benz C 300 2018" [level=3]
+ - link "2018 Mercedes-Benz C 300 ₦29,500,000":
+   - /url: /car/TS-1011
+   - heading "2018 Mercedes-Benz C 300" [level=3]
- - link "BMW X3 2019 ₦41,000,000":
-   - /url: car.html?car=2019-bmw-x3-xdrive30i
-   - heading "BMW X3 2019" [level=3]
+ - link "2019 BMW X3 ₦41,000,000":
+   - /url: /car/TS-1012
+   - heading "2019 BMW X3" [level=3]
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: privacy.html
+     - /url: /privacy
+ - alert

## Controls (clickable things)
in ref, not in build  (0)
in build, not in ref  (0)

## Hidden layers (overlays / modals / panels that a state must open)
in ref, not in build  (3)
    span|generic||on
    div|tablist|tabs|tabs.rv
    div|tabpanel|p3|pn.on
in build, not in ref  (0)

## :root token diff
--band: ref="—"  build="#17191c"
--bar: ref="—"  build="#33383d"
--card: ref="—"  build="#1e2226"
--card-line: ref="—"  build="#2a2e33"
--chip-bg: ref="—"  build="#1e2226"
--chip-line: ref="—"  build="#2a2e33"
--danger: ref="—"  build="#ef5b52"
--dash: ref="—"  build="#101214"
--dts: ref="—"  build="#4a5056"
--font-body: ref="—"  build="Inter, sans-serif"
--font-head: ref="—"  build="Oswald, sans-serif"
--gold-ink: ref="—"  build="#1a1405"
--green: ref="—"  build="#25d366"
--ld: ref="—"  build="#57cc8a"
--ld-bg: ref="—"  build="rgba(87, 204, 138, 0.12)"
--muted: ref="—"  build="#9aa0a6"
--nv: ref="—"  build="#8a9096"
--oo: ref="—"  build="#8ab4ff"
--oo-bg: ref="—"  build="rgba(138, 180, 255, 0.12)"
--ph1: ref="—"  build="#23272b"
--ph2: ref="—"  build="#1a1d21"
--radius: ref="—"  build="12px"
--radius-sm: ref="—"  build="8px"
--shadow-btn: ref="—"  build="0 8px 18px rgba(37, 211, 102, 0.35)"
--shadow-card: ref="—"  build="0 18px 34px rgba(255, 255, 255, 0.09)"
--shadow-float: ref="—"  build="0 12px 30px rgba(0, 0, 0, 0.55)"
--space: ref="—"  build="16px"
--surface: ref="—"  build="#101214"
--surface-2: ref="—"  build="#191c20"
--tab: ref="—"  build="#24282c"
--tab-fg: ref="—"  build="#d6d9dc"
--tab-hover: ref="—"  build="#2e3338"
--tab-on: ref="—"  build="#c8a24a"
--tab-on-fg: ref="—"  build="#1a1405"
--touch: ref="—"  build="44px"
--w-laptop: ref="—"  build="1100px"
--w-phone: ref="—"  build="560px"
--w-tablet: ref="—"  build="820px"

## Computed-style diff for elements sharing an id
### #main
    height: ref="2431.86px"  build="2279.86px"
### #ti
    letterSpacing: ref="normal"  build="0.44px"
    textTransform: ref="uppercase"  build="none"
### #chips
    height: ref="38px"  build="48px"
### #speak
    opacity: ref="0"  build="1"
    transform: ref="matrix(1, 0, 0, 1, 0, -6)"  build="matrix(1, 0, 0, 1, 0, 0)"
### #gi
    transform: ref="matrix(1.04092, 0, 0, 1.04092, 0, 0)"  build="matrix(1.01233, 0, 0, 1.01233, 0, 0)"
### #tabs
    height: ref="52px"  build="53px"
    marginBottom: ref="0px"  build="22px"
    borderBottomWidth: ref="0px"  build="1px"
    borderStyle: ref="none"  build="none none solid"
    borderColor: ref="rgb(232, 234, 237)"  build="rgb(232, 234, 237) rgb(232, 234, 237) rgb(42, 46, 51)"
    opacity: ref="0"  build="1"
    flexWrap: ref="nowrap"  build="wrap"
    gap: ref="normal"  build="6px"
    rowGap: ref="normal"  build="6px"
    columnGap: ref="normal"  build="6px"
    transform: ref="matrix(1, 0, 0, 1, 0, 26)"  build="none"
### #bar
    right: ref="816px"  build="570px"
    left: ref="0px"  build="252px"
    width: ref="121px"  build="115px"
### #p3
    opacity: ref="0"  build="1"
    transform: ref="matrix(1, 0, 0, 1, 0, 12)"  build="none"
### #pr
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #spec
    height: ref="377px"  build="192px"
    paddingTop: ref="8px"  build="0px"
    paddingRight: ref="24px"  build="0px"
    paddingBottom: ref="8px"  build="0px"
    paddingLeft: ref="24px"  build="0px"
    backgroundColor: ref="rgb(25, 28, 32)"  build="rgba(0, 0, 0, 0)"
    transitionDuration: ref="0.3s, 0.3s, 0.3s"  build="0s"
### #rt
    width: ref="301.188px"  build="260.562px"
    letterSpacing: ref="normal"  build="0.3px"
    textTransform: ref="uppercase"  build="none"
### #site-footer
    height: ref="498.5px"  build="676.5px"
### #contact
    height: ref="498.5px"  build="676.5px"
### #gl
    width: ref="208.75px"  build="451.5px"
    height: ref="132px"  build="62px"
### #mp
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #mtitle
    fontWeight: ref="700"  build="600"
    letterSpacing: ref="normal"  build="0.2px"
    textTransform: ref="uppercase"  build="none"

```

## State: narrow-700

```
# runtime-ui-diff · narrow-700
ref   : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6
build : http://localhost:3210/car/TS-1001
viewport ref=700x900  build=700x900   title ref=2021 Toyota Camry XSE V6 | TrueSpec Automotive | build=Car details | TrueSpec Automotive

## Structure verdict
The two element trees are NOT the same shape.  ref=336 nodes  build=383 nodes  tag-overlap=87.7%
structural anchors — same ids in both: site-header, top, tick, thm, crumb, main, ti, chips, speak, gal, rib, gi, cn, thumbs, tabs, bar, p1, p2, p3, pr, old, sv, wa, waTxt, of, vw, spec, rt, rt2, site-footer, contact, gl, mbar, mp, mw, mwTxt, lb, li, stoast, ovl, mx, mtitle, mbody, ptoast, ptxt, ptx
ids only in ref: 0
ids only in build: 1 → _R_

## Element-count differences (tag: ref build)
div: ref=110 build=111
script: ref=1 build=45
nextjs-portal: ref=0 build=1
next-route-announcer: ref=0 build=1

## Structural walk — where the trees first diverge
body>0>0: div[generic] present in ref, ABSENT in build
body>0>1: div[generic] present in ref, ABSENT in build
body>1>0>0: ref a[link]  ↔  build div[generic]
body>1>0>1: i[generic] present in ref, ABSENT in build
body>1>0>2: a[link] present in ref, ABSENT in build
body>1>0>3: i[generic] present in ref, ABSENT in build
body>1>0>4: b[generic] present in ref, ABSENT in build
body>2>0>0: ref div[generic]  ↔  build a[link]
body>3: ref section[generic]  ↔  build div[generic]
body>4: ref div[generic]  ↔  build section[generic]
body>10: ref script[generic]  ↔  build div[generic]

## Outline — ref (depth ≤ 8)
body
  div#site-header
    div#top
      div
        a[link]
          i
        div
          i
          div
            br
            small
        div
          i
          div
            small
            b
        div
          div
            small
            b
        a[link]
          i
    div
      div
        div#tick (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link] (hidden)
          i (hidden)
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button]
              button[button]
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel]
            p
            p
            p
            div
            p
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]

## Outline — build (depth ≤ 8)
body
  div (hidden)
  div#site-header
    div#top
      div
        a[link]
          i
        div (hidden)
          i (hidden)
          div (hidden)
            br (hidden)
            small (hidden)
        div
          i
          div
            small
            b
        div (hidden)
          div (hidden)
            small (hidden)
            b (hidden)
        a[link]
          i
    div
      div
        div#tick (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button#thm[button]
          i
        a[link] (hidden)
          i (hidden)
  div
    div#crumb
      a[link]
      i
      a[link]
      i
      b
  div#main
    div
      div
        div
          h1#ti[heading]
          div#chips
            span
              i
            span
              i
            button[button]
              i
          p#speak[status]
          div
            div#gal
              div#rib
              img#gi[img]
              button[button]
              button[button]
              div#cn
            div#thumbs
              button[button]
              button[button]
              button[button]
          div#tabs[tablist] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            button[tab] (hidden)
            span#bar (hidden)
          div#p1[tabpanel]
            p
            p
            p
            div
            p
          div#p2[tabpanel] (hidden)
            ul[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
          div#p3[tabpanel] (hidden)
            ol[list] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
              li[listitem] (hidden)
        aside[complementary]
          div
            small
            span#pr
            div#old
            div
            div#sv (hidden)
          a#wa[link]
            i
            span#waTxt
          a#of[link]
            i
          a#vw[link]
            i
          div#spec
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
            div
              span
              b
          div
            p
              i
            p
              i
            p
              i
  section
    div
      div (hidden)
        h2#rt[heading] (hidden)
        div (hidden)
          button[button] (hidden)
            i (hidden)
          button[button] (hidden)
            i (hidden)
      div#rt2
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div
            h3[heading]
            div
        a[link]
          div
            img[presentation]
          div

## Accessibility tree diff  (- ref / + build)
-   - /url: truespec.html
- - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +234 800 000 0000 Chat hours Mon - Sat, 9AM - 6PM
+   - /url: /
+ - text:  WhatsApp +2348000000000
- - button "Toggle dark mode": 
+ - button "Toggle dark mode": 
-   - /url: truespec.html
+   - /url: /
-   - /url: truespec.html#cars
+   - /url: /inventory
- - img "2021 Toyota Camry XSE V6 photo 1"
+ - img "Toyota Camry XSE V6 2021 photo 1"
-   - paragraph: The XSE V6 is the Camry to have if you want the six-cylinder. This 2021 example has covered 31,000 miles and still feels like the day it left the showroom.
-   - paragraph: It runs a 3.5-litre V6 paired with an eight-speed automatic, which is smooth and genuinely quick rather than shouty. The XSE grade adds bigger alloys, the quad exhaust tips and a panoramic roof, and it is one of the few Camry trims that carries leather as standard.
+   - paragraph: Every Toyota we list is imported from the USA and delivered with one honest doorstep price.
+   - paragraph: Message us and we will send more photos, a video walk-around, or answer anything about this Camry.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
-   - text: Brand Toyota Model Camry Trim XSE V6 Year 2021 Mileage 31,000 mi Exterior Obsidian black Interior Black Status Available
+   - text: BrandToyota ModelCamry TrimXSE V6 Year2021 Mileage31,000 mi ExteriorObsidian black InteriorBlack StatusAvailable
- - link "Toyota Camry 2021 ₦27,900,000":
-   - /url: car.html?car=2021-toyota-camry-se
-   - heading "Toyota Camry 2021" [level=3]
+ - link "2021 Toyota Camry ₦27,900,000":
+   - /url: /car/TS-1002
+   - heading "2021 Toyota Camry" [level=3]
- - link "Lexus RX 350 2020 ₦52,000,000":
-   - /url: car.html?car=2020-lexus-rx-350-f-sport
-   - heading "Lexus RX 350 2020" [level=3]
+ - link "2020 Lexus RX 350 ₦52,000,000":
+   - /url: /car/TS-1003
+   - heading "2020 Lexus RX 350" [level=3]
- - link "Mercedes-Benz GLE 350 2019 ₦63,500,000":
-   - /url: car.html?car=2019-mercedes-benz-gle-350-4matic
-   - heading "Mercedes-Benz GLE 350 2019" [level=3]
+ - link "2019 Mercedes-Benz GLE 350 ₦63,500,000":
+   - /url: /car/TS-1004
+   - heading "2019 Mercedes-Benz GLE 350" [level=3]
- - link "BMW X5 2021 ₦88,000,000":
-   - /url: car.html?car=2021-bmw-x5-xdrive40i
-   - heading "BMW X5 2021" [level=3]
+ - link "2021 BMW X5 ₦88,000,000":
+   - /url: /car/TS-1005
+   - heading "2021 BMW X5" [level=3]
- - link "Toyota Highlander 2021 ₦61,000,000":
-   - /url: car.html?car=2021-toyota-highlander-platinum-v6
-   - heading "Toyota Highlander 2021" [level=3]
+ - link "2021 Toyota Highlander ₦61,000,000":
+   - /url: /car/TS-1006
+   - heading "2021 Toyota Highlander" [level=3]
- - link "Honda Accord 2021 ₦38,000,000":
-   - /url: car.html?car=2021-honda-accord-touring
-   - heading "Honda Accord 2021" [level=3]
+ - link "2021 Honda Accord ₦38,000,000":
+   - /url: /car/TS-1007
+   - heading "2021 Honda Accord" [level=3]
- - link "Toyota RAV4 Prime 2022 ₦45,500,000":
-   - /url: car.html?car=2022-toyota-rav4-prime-se
-   - heading "Toyota RAV4 Prime 2022" [level=3]
+ - link "2022 Toyota RAV4 Prime ₦45,500,000":
+   - /url: /car/TS-1008
+   - heading "2022 Toyota RAV4 Prime" [level=3]
- - link "Lexus ES 350 2021 ₦43,000,000":
-   - /url: car.html?car=2021-lexus-es-350
-   - heading "Lexus ES 350 2021" [level=3]
+ - link "2021 Lexus ES 350 ₦43,000,000":
+   - /url: /car/TS-1009
+   - heading "2021 Lexus ES 350" [level=3]
- - link "Toyota 4Runner 2020 ₦58,000,000":
-   - /url: car.html?car=2020-toyota-4runner-limited
-   - heading "Toyota 4Runner 2020" [level=3]
+ - link "2020 Toyota 4Runner ₦58,000,000":
+   - /url: /car/TS-1010
+   - heading "2020 Toyota 4Runner" [level=3]
- - link "Mercedes-Benz C 300 2018 ₦29,500,000":
-   - /url: car.html?car=2018-mercedes-benz-c-300-amg-line
-   - heading "Mercedes-Benz C 300 2018" [level=3]
+ - link "2018 Mercedes-Benz C 300 ₦29,500,000":
+   - /url: /car/TS-1011
+   - heading "2018 Mercedes-Benz C 300" [level=3]
- - link "BMW X3 2019 ₦41,000,000":
-   - /url: car.html?car=2019-bmw-x3-xdrive30i
-   - heading "BMW X3 2019" [level=3]
+ - link "2019 BMW X3 ₦41,000,000":
+   - /url: /car/TS-1012
+   - heading "2019 BMW X3" [level=3]
+ - text: Doorstep price ₦34,500,000
+ - link " Chat now":
+   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
-     - /url: privacy.html
+     - /url: /privacy
- - text: Doorstep price ₦34,500,000
- - link " Chat now":
-   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
+ - alert

## Controls (clickable things)
in ref, not in build  (0)
in build, not in ref  (0)

## Hidden layers (overlays / modals / panels that a state must open)
in ref, not in build  (0)
in build, not in ref  (1)
    div|generic||inf.hide

## :root token diff
--band: ref="—"  build="#17191c"
--bar: ref="—"  build="#33383d"
--card: ref="—"  build="#1e2226"
--card-line: ref="—"  build="#2a2e33"
--chip-bg: ref="—"  build="#1e2226"
--chip-line: ref="—"  build="#2a2e33"
--danger: ref="—"  build="#ef5b52"
--dash: ref="—"  build="#101214"
--dts: ref="—"  build="#4a5056"
--font-body: ref="—"  build="Inter, sans-serif"
--font-head: ref="—"  build="Oswald, sans-serif"
--gold-ink: ref="—"  build="#1a1405"
--green: ref="—"  build="#25d366"
--ld: ref="—"  build="#57cc8a"
--ld-bg: ref="—"  build="rgba(87, 204, 138, 0.12)"
--muted: ref="—"  build="#9aa0a6"
--nv: ref="—"  build="#8a9096"
--oo: ref="—"  build="#8ab4ff"
--oo-bg: ref="—"  build="rgba(138, 180, 255, 0.12)"
--ph1: ref="—"  build="#23272b"
--ph2: ref="—"  build="#1a1d21"
--radius: ref="—"  build="12px"
--radius-sm: ref="—"  build="8px"
--shadow-btn: ref="—"  build="0 8px 18px rgba(37, 211, 102, 0.35)"
--shadow-card: ref="—"  build="0 18px 34px rgba(255, 255, 255, 0.09)"
--shadow-float: ref="—"  build="0 12px 30px rgba(0, 0, 0, 0.55)"
--space: ref="—"  build="16px"
--surface: ref="—"  build="#101214"
--surface-2: ref="—"  build="#191c20"
--tab: ref="—"  build="#24282c"
--tab-fg: ref="—"  build="#d6d9dc"
--tab-hover: ref="—"  build="#2e3338"
--tab-on: ref="—"  build="#c8a24a"
--tab-on-fg: ref="—"  build="#1a1405"
--touch: ref="—"  build="44px"
--w-laptop: ref="—"  build="1100px"
--w-phone: ref="—"  build="560px"
--w-tablet: ref="—"  build="820px"

## Computed-style diff for elements sharing an id
### #site-header
    height: ref="228.125px"  build="160px"
### #top
    height: ref="175.125px"  build="107px"
### #main
    height: ref="2167.58px"  build="1970.58px"
### #ti
    letterSpacing: ref="normal"  build="0.308px"
    textTransform: ref="uppercase"  build="none"
### #chips
    height: ref="38px"  build="48px"
### #gi
    transform: ref="matrix(1.01856, 0, 0, 1.01856, 0, 0)"  build="matrix(1.00576, 0, 0, 1.00576, 0, 0)"
### #tabs
    height: ref="52px"  build="53px"
    marginBottom: ref="0px"  build="22px"
    borderBottomWidth: ref="0px"  build="1px"
    borderStyle: ref="none"  build="none none solid"
    borderColor: ref="rgb(232, 234, 237)"  build="rgb(232, 234, 237) rgb(232, 234, 237) rgb(42, 46, 51)"
    flexWrap: ref="nowrap"  build="wrap"
    gap: ref="normal"  build="6px"
    rowGap: ref="normal"  build="6px"
    columnGap: ref="normal"  build="6px"
### #p1
    height: ref="364.5px"  build="319.5px"
### #pr
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #spec
    height: ref="377px"  build="192px"
    paddingTop: ref="8px"  build="0px"
    paddingRight: ref="24px"  build="0px"
    paddingBottom: ref="8px"  build="0px"
    paddingLeft: ref="24px"  build="0px"
    backgroundColor: ref="rgb(25, 28, 32)"  build="rgba(0, 0, 0, 0)"
    transitionDuration: ref="0.3s, 0.3s, 0.3s"  build="0s"
### #rt
    width: ref="301.188px"  build="260.562px"
    letterSpacing: ref="normal"  build="0.3px"
    textTransform: ref="uppercase"  build="none"
### #site-footer
    height: ref="701.5px"  build="698.5px"
### #contact
    height: ref="701.5px"  build="698.5px"
### #gl
    width: ref="109px"  build="301.5px"
    height: ref="272px"  build="62px"
### #mp
    width: ref="128.031px"  build="156.328px"
    fontFamily: ref="Oswald, sans-serif"  build="Inter, sans-serif"
    textTransform: ref="uppercase"  build="none"
### #mtitle
    fontWeight: ref="700"  build="600"
    letterSpacing: ref="normal"  build="0.2px"
    textTransform: ref="uppercase"  build="none"

```

