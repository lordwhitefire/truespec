# runtime-ui-diff · default
ref   : http://localhost:3211/car.html?car=2021-toyota-camry-xse-v6
build : http://localhost:3210/car/TS-1001
viewport ref=1854x871  build=1854x927   title ref=2021 Toyota Camry XSE V6 | TrueSpec Automotive | build=TrueSpec — cars you can trust

## Structure verdict
The two element trees are NOT the same shape.  ref=336 nodes  build=153 nodes  tag-overlap=36.6%
structural anchors — same ids in both: top, contact
ids only in ref: 44 → site-header, tick, thm, crumb, main, ti, chips, speak, gal, rib, gi, cn, thumbs, tabs, bar, p1, p2, p3, pr, old, sv, wa, waTxt, of, vw, spec, rt, rt2, site-footer, gl, mbar, mp, mw, mwTxt, lb, li, stoast, ovl, mx, mtitle
ids only in build: 1 → _R_

## Element-count differences (tag: ref build)
div: ref=110 build=35
a: ref=26 build=11
i: ref=45 build=16
small: ref=5 build=3
b: ref=21 build=8
span: ref=29 build=10
button: ref=17 build=3
p: ref=12 build=4
img: ref=20 build=8
ul: ref=2 build=3
li: ref=17 build=14
ol: ref=1 build=0
aside: ref=1 build=0
section: ref=1 build=0
h2: ref=2 build=0
h3: ref=11 build=1
script: ref=1 build=20
header: ref=0 build=1
main: ref=0 build=1

## Structural walk — where the trees first diverge
body>0>0: div[generic] present in ref, ABSENT in build
body>0>1: div[generic] present in ref, ABSENT in build
body>1: ref div[generic]  ↔  build header[banner]
body>2: ref div[generic]  ↔  build main[main]
body>3: ref section[generic]  ↔  build footer[contentinfo]
body>4: ref div[generic]  ↔  build a[link]
body>5: ref div[generic]  ↔  build script[generic]
body>6: ref div[generic]  ↔  build script[generic]
body>7: ref div[generic]  ↔  build script[generic]
body>8: ref div[generic]  ↔  build script[generic]
body>9: ref div[status]  ↔  build script[generic]

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
          div#chips (hidden)
            span (hidden)
              i (hidden)
            span (hidden)
              i (hidden)
            button[button] (hidden)
              i (hidden)
          p#speak[status]
          div (hidden)
            div#gal (hidden)
              div#rib (hidden)
              img#gi[img] (hidden)
              button[button] (hidden)
              button[button] (hidden)
              div#cn (hidden)
            div#thumbs (hidden)
              button[button] (hidden)
              button[button] (hidden)
              button[button] (hidden)
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
        aside[complementary] (hidden)
          div (hidden)
            small (hidden)
            span#pr (hidden)
            div#old (hidden)
            div (hidden)
            div#sv (hidden)
          a#wa[link] (hidden)
            i (hidden)
            span#waTxt (hidden)
          a#of[link] (hidden)
            i (hidden)
          a#vw[link] (hidden)
            i (hidden)
          div#spec (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
            div (hidden)
              span (hidden)
              b (hidden)
          div (hidden)
            p (hidden)
              i (hidden)
            p (hidden)
              i (hidden)
            p (hidden)
              i (hidden)
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
  header[banner]
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
        div
          span
            i
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
          span (hidden)
            i (hidden)
        button[button]
          i
        a[link]
          i
  main[main]
    div
      div
        div
          div
            div
              img[img]
              button[button]
              button[button]
            div
              img[img]
              img[img]
              img[img]
        div
          h1[heading]
          div
          div
          a[link]
          ul[list]
            li[listitem]
              span
            li[listitem]
              span
            li[listitem]
              span
            li[listitem]
              span
          h3[heading]
          ul[list]
            li[listitem]
            li[listitem]
            li[listitem]
            li[listitem]
            li[listitem]
            li[listitem]
            li[listitem]
  footer#contact[contentinfo]
    div
      div
        div
          h4[heading]
            em
          p
        div
          h4[heading]
          div
            img[presentation]
            img[presentation]
            img[presentation]
            img[presentation]
        div
          h4[heading]
          ul[list]
            li[listitem]
              b
            li[listitem]
              b
            li[listitem]
              b
        div
          h4[heading]
          div
            a[link]
              i
            a[link]
              i
            a[link]
              i
            a[link]
              i
      div
        div
          h4[heading]
          a[link]
            i
        div
          h4[heading]
          p
            b
            br
            b
            br
            b
        div
          h4[heading]
          p
        div
          h4[heading]
          p
      div
        span
        span
          a[link]
  a[link] (hidden)
    i (hidden)
  script#_R_ (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)
  script (hidden)

## Accessibility tree diff  (- ref / + build)
- - link " TrueSpec":
-   - /url: truespec.html
- - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +234 800 000 0000 Chat hours Mon - Sat, 9AM - 6PM
- - link "Instagram":
-   - /url: "#"
-   - text: 
- - text: " New on the lot: 2019 Toyota Sienna XLE — landed July 2026  Next to land: 2021 Range Rover Sport HSE — expected November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
- - button "Toggle dark mode": 
- - link " Chat on WhatsApp":
-   - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20ask%20about%20a%20vehicle.
- - link "Home":
-   - /url: truespec.html
- - text: 
- - link "Inventory":
-   - /url: truespec.html#cars
- - text:  Toyota Camry 2021
- - heading "Toyota Camry XSE V6 2021" [level=1]
- - text: " Available # Ref TS-1001"
- - button " Share this"
- - status: This one is on the lot right now. Message me and I'll send a video walk-around today.
- - img "2021 Toyota Camry XSE V6 photo 1"
- - button "Previous photo": 
- - button "Next photo": 
- - text:  1 / 3
- - button "Photo 1"
- - button "Photo 2"
- - button "Photo 3"
- - tablist "Car information":
-   - tab "Overview" [selected]
-   - tab "Features"
-   - tab "Delivery"
- - tabpanel:
-   - paragraph: This 2021 Toyota Camry XSE V6 comes in obsidian black with a black interior and 31,000 mi on the clock.
-   - paragraph: The XSE V6 is the Camry to have if you want the six-cylinder. This 2021 example has covered 31,000 miles and still feels like the day it left the showroom.
-   - paragraph: It runs a 3.5-litre V6 paired with an eight-speed automatic, which is smooth and genuinely quick rather than shouty. The XSE grade adds bigger alloys, the quad exhaust tips and a panoramic roof, and it is one of the few Camry trims that carries leather as standard.
-   - text: Available now. Message us to arrange a viewing.
-   - paragraph: Message us on WhatsApp for more photos, a video walk-around or to ask anything about this car.
- - complementary:
-   - text: Doorstep price ₦34,500,000 Shipping, clearing and delivery included.
+ - banner:
+   - link " TrueSpec":
+     - /url: /
+   - text:  Imported from the USA Delivered anywhere in Nigeria Visits by appointment  WhatsApp +2348000000000 Chat hours Mon - Sat, 9AM - 6PM
+   - link "Instagram":
+     - /url: "#"
+     - text: 
+   - text: " New on the lot: 2019 Lexus RX 350 350 — landed this year  Next to land: 2021 Range Rover Sport HSE — Expected arrival: November  Biggest drop: 2022 Toyota RAV4 Prime SE — was ₦50,900,000, now ₦45,500,000  One doorstep price — shipping, clearing and delivery included."
+   - button "Toggle dark mode": 
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20am%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
-   - link "Make an offer ":
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20make%20an%20offer%20on%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001)%2C%20listed%20at%20%E2%82%A634%2C500%2C000.
-   - link "Book a viewing ":
-     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20would%20like%20to%20book%20a%20viewing%20for%20the%202021%20Toyota%20Camry%20XSE%20V6%20(Ref%20TS-1001).
-   - text: Brand Toyota Model Camry Trim XSE V6 Year 2021 Mileage 31,000 mi Exterior Obsidian black Interior Black Status Available
-   - paragraph:  One doorstep price, no extra fees
-   - paragraph:  Shipped from the USA
-   - paragraph:  Delivered anywhere in Nigeria
- - heading "More available cars" [level=2]
- - button "Previous": 
- - button "Next": 
- - link "Toyota Camry 2021 ₦27,900,000":
-   - /url: car.html?car=2021-toyota-camry-se
-   - heading "Toyota Camry 2021" [level=3]
-   - text: ₦27,900,000
- - link "Lexus RX 350 2020 ₦52,000,000":
-   - /url: car.html?car=2020-lexus-rx-350-f-sport
-   - heading "Lexus RX 350 2020" [level=3]
-   - text: ₦52,000,000
- - link "Mercedes-Benz GLE 350 2019 ₦63,500,000":
-   - /url: car.html?car=2019-mercedes-benz-gle-350-4matic
-   - heading "Mercedes-Benz GLE 350 2019" [level=3]
-   - text: ₦63,500,000
- - link "BMW X5 2021 ₦88,000,000":
-   - /url: car.html?car=2021-bmw-x5-xdrive40i
-   - heading "BMW X5 2021" [level=3]
-   - text: ₦88,000,000
- - link "Toyota Highlander 2021 ₦61,000,000":
-   - /url: car.html?car=2021-toyota-highlander-platinum-v6
-   - heading "Toyota Highlander 2021" [level=3]
-   - text: ₦61,000,000
- - link "Honda Accord 2021 ₦38,000,000":
-   - /url: car.html?car=2021-honda-accord-touring
-   - heading "Honda Accord 2021" [level=3]
-   - text: ₦38,000,000
- - link "Toyota RAV4 Prime 2022 ₦45,500,000":
-   - /url: car.html?car=2022-toyota-rav4-prime-se
-   - heading "Toyota RAV4 Prime 2022" [level=3]
-   - text: ₦45,500,000
- - link "Lexus ES 350 2021 ₦43,000,000":
-   - /url: car.html?car=2021-lexus-es-350
-   - heading "Lexus ES 350 2021" [level=3]
-   - text: ₦43,000,000
- - link "Toyota 4Runner 2020 ₦58,000,000":
-   - /url: car.html?car=2020-toyota-4runner-limited
-   - heading "Toyota 4Runner 2020" [level=3]
-   - text: ₦58,000,000
- - link "Mercedes-Benz C 300 2018 ₦29,500,000":
-   - /url: car.html?car=2018-mercedes-benz-c-300-amg-line
-   - heading "Mercedes-Benz C 300 2018" [level=3]
-   - text: ₦29,500,000
- - link "BMW X3 2019 ₦41,000,000":
-   - /url: car.html?car=2019-bmw-x3-xdrive30i
-   - heading "BMW X3 2019" [level=3]
-   - text: ₦41,000,000
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I%20have%20a%20question.
+ - main:
+   - img "2021 Toyota Camry XSE V6 — photo 1"
+   - button "Previous photo": ‹
+   - button "Next photo": ›
+   - img "2021 Toyota Camry XSE V6 thumbnail 1"
+   - img "2021 Toyota Camry XSE V6 thumbnail 2"
+   - img "2021 Toyota Camry XSE V6 thumbnail 3"
+   - heading "Toyota Camry" [level=1]
+   - text: XSE V6 · 2021 · TS-1001 ₦34,500,000
+   - link "Chat on WhatsApp":
+     - /url: https://wa.me/2348000000000?text=Hello%20TrueSpec%2C%20I'm%20interested%20in%20the%202021%20Toyota%20Camry%20XSE%20V6%20(TS-1001).
+   - list:
+     - listitem: Year 2021
+     - listitem: Mileage 31,000 mi
+     - listitem: Exterior Obsidian black

## Controls (clickable things)
in ref, not in build  (19)
    link::Home
    link::Inventory
    button::
    status::This one is on the lot right now. Message me and I'll send a video walk-around t
    generic::
    button::Photo 1
    button::Photo 2
    button::Photo 3
    tablist::Car information
    tab::Overview
    tab::Features
    tab::Delivery
    tabpanel::
    button::Previous
    button::Next
    button::Close
    dialog::
    status::
    button::Dismiss
in build, not in ref  (1)
    link::Chat on WhatsApp

## Hidden layers (overlays / modals / panels that a state must open)
in ref, not in build  (11)
    div|generic|chips|chips.in
    div|generic||in
    div|tablist|tabs|tabs.rv
    div|tabpanel|p2|pn
    div|tabpanel|p3|pn
    aside|complementary||aside.in
    div|generic||rh.rv
    div|generic|mbar|mbar
    div|generic|lb|lb
    div|generic|ovl|ovl
    div|status|ptoast|ptoast
in build, not in ref  (1)
    a|link||fab

## :root token diff
--band: ref="—"  build="#17191c"
--bar: ref="—"  build="#33383d"
--body2: ref="#b9bdc2"  build="—"
--card: ref="—"  build="#1e2226"
--card-line: ref="—"  build="#2a2e33"
--chip-bg: ref="—"  build="#1e2226"
--chip-line: ref="—"  build="#2a2e33"
--crumbs: ref="#17191c"  build="—"
--danger: ref="—"  build="#ef5b52"
--dash: ref="—"  build="#101214"
--dtabs-on: ref="#e8eaed"  build="—"
--dtabs-on-fg: ref="#101214"  build="—"
--dts: ref="—"  build="#4a5056"
--ease: ref="cubic-bezier(.2,.7,.2,1)"  build="—"
--font-body: ref="—"  build=""Inter", system-ui, -apple-system, "Segoe UI", sans-serif"
--font-head: ref="—"  build=""Oswald", system-ui, sans-serif"
--gold-ink: ref="—"  build="#1a1405"
--green: ref="—"  build="#25d366"
--ld: ref="—"  build="#57cc8a"
--ld-bg: ref="—"  build="rgba(87, 204, 138, 0.12)"
--muted: ref="—"  build="#9aa0a6"
--nv: ref="—"  build="#8a9096"
--ofr-hv: ref="#2e3338"  build="—"
--oo: ref="—"  build="#8ab4ff"
--oo-bg: ref="—"  build="rgba(138, 180, 255, 0.12)"
--ph1: ref="—"  build="#23272b"
--ph2: ref="—"  build="#1a1d21"
--radius: ref="—"  build="12px"
--radius-sm: ref="—"  build="8px"
--rc: ref="#1e2226"  build="—"
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
--thumb: ref="#2a2e33"  build="—"
--touch: ref="—"  build="44px"
--w-laptop: ref="—"  build="1100px"
--w-phone: ref="—"  build="560px"
--w-tablet: ref="—"  build="820px"

## Computed-style diff for elements sharing an id
### #top
    fontFamily: ref="Inter, sans-serif"  build="Inter, system-ui, -apple-system, "Segoe UI", sans-serif"
### #contact
    height: ref="432.5px"  build="464.406px"
    fontFamily: ref="Inter, sans-serif"  build="Inter, system-ui, -apple-system, "Segoe UI", sans-serif"

