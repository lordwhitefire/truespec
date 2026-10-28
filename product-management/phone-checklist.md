# TrueSpec — manual phone checklist

**Who runs this:** the owner, on a real phone. Then a second person, on the **same phone**, with this same document.
**What it is:** every interaction the code exposes, turned into one action per line, with the result the specs call correct.
**What it is not:** a report. Nothing here has been run. No line has been marked pass or fail by the assistant.

Record each line as you go:

- `✓` — it did what the **Expect** column says.
- `✗` — it did something else. Write what you actually saw, and the row number, in the run log.
- `⚠` — could not be tested on this phone/account (say why).
- Leave blank — not reached.

Do not fix anything during a run. If a line fails, continue; the next line may depend on the state this one leaves.

**If time is short:** run **section 18** first. It is the ten lines most likely to change what you do next; the rest of the document is the full sweep.

---

## Run record

| | Run 1 — owner | Run 2 — second person |
|---|---|---|
| Date / time | | |
| Phone model | | |
| OS + version | | |
| Browser + version | | |
| Build / URL tested | | |
| Signed-in office account | | |
| Test car refs created | | |
| Anything left over from the previous run | | |

**Same phone, same build, same starting state** is what makes the second run a repeat. Section 19 says what state to leave behind.

---

## Before you start — test data and kit

Prepare these **before** line 0.1 where you can. P1–P4 may be existing stock; P5 is created in section 10 and tested in 11.6. The public run needs at least one complete car to look at.

| # | Item | Why |
|---|---|---|
| P1 | One **complete** car: price, at least 3 photos, all six costs, an Available state | The normal public and office path |
| P2 | One **On-order** car with an arrival note | Reserve wording, arrival chip |
| P3 | One **Landed** car flagged *new arrival* | Landed/new-arrival rule (BL-001) |
| P4 | One **Sold** car with a sale price and date | Sold page, Sold filter, un-sell test |
| P5 | One **incomplete** car: no price, no photos | The public listing gate (FN-001) — create it in section 10 and test in 11.6 |
| P6 | One filled **car template PDF** and one **enquiry sheet PDF** | Import (section 12). Fill them on a laptop before the run; the phone only uploads them. Both must be real files, not renamed images |
| P7 | One photo **over 15 MB**, one **HEIC** photo from the phone's camera, one PDF renamed `.jpg` | Upload refusals |
| P8 | A second browser tab, and a way to switch the phone to airplane mode | Taps, badge, offline |
| P9 | WhatsApp installed and signed in; the phone's dialler working | Handoffs |

Also note: the WhatsApp number in Settings must be a number you can open a chat with. If it is still the placeholder, section 14.2 will fail every chat line after it.

---

## 0. Baseline — the phone itself

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 0.1 | Open the site in the phone's normal browser, portrait, at default text size. | Home loads; no horizontal scrolling; nothing clipped at the right edge. | A page wider than the screen is a layout failure at 390 px. |
| 0.2 | Rotate to landscape, then back. | Layout reflows; nothing lost. | Sticky bars overlapping content. |
| 0.3 | Pinch-zoom to 200% on the home page. | Text reflows or scrolls; no content trapped under a fixed bar. | — |
| 0.4 | Check the bottom of every page for the home-indicator safe area. | Buttons and the FAB sit above the gesture bar, not under it. | iPhone: the bar must not cover the last control. |
| 0.5 | Turn the phone's text size up one step (iOS: Text Size; Android: Font size). | Text grows without overlapping or clipping. | — |

---

## 1. Public chrome — every page

You should be **signed out** of the office for this section.

| # | Screen | Do | Expect | Watch for / ref |
|---|---|---|---|---|
| 1.1 | Header | Tap the **TrueSpec** wordmark. | Home loads. | — |
| 1.2 | Header | Read the WhatsApp number shown. | It is the number saved in Settings, in `+234…` form. | Wrong/placeholder number → every chat line below is wrong. |
| 1.3 | Header | Tap the **Instagram** icon. | The shop's Instagram opens (or the icon is absent). | **Nothing happens / page jumps to top — UI-001.** |
| 1.4 | Header | Tap **Chat on WhatsApp**. | The privacy notice appears first (first tap of the page load), then WhatsApp opens with the greeting. | If the notice does not appear, or the chat opens without it — UX-007. |
| 1.5 | Header | Tap the **theme toggle**. | Dark/light flips; the icon and label match the new state. | First paint after reload flashes the wrong theme; label always says "Toggle dark mode" — UI-002. |
| 1.6 | Header | Read the **ticker**. | Up to four real lines: a landed car, an on-order car, a biggest drop, two fixed promises. | "Biggest drop" naming an on-order car — FN-008. A line naming a car that does not exist is worse. |
| 1.7 | Footer | Tap **Privacy notice**. | `/privacy` loads. | — |
| 1.8 | Footer | Tap **WhatsApp us**, then the footer's WhatsApp icon. | Same notice-then-chat behaviour as 1.4 from both controls. | — |
| 1.9 | Footer | Tap **Instagram / Facebook / YouTube**. | Each opens the shop's profile. | **Three dead links — UI-001.** |
| 1.10 | Footer | Look at the **photo gallery**. | Four cover photos from available cars; tapping one goes to that car. | Fewer than four cars → fewer tiles, no empty holes. |
| 1.11 | Global | Tap the floating **WhatsApp** button. | WhatsApp opens (after the notice, if first tap). | It must not cover a page control. |
| 1.12 | Global | While on a loaded page, go to airplane mode and tap a link. | The offline banner appears; the page does not pretend to be fresh. | Banner timing (1.2 s) — UX section 17. |

---

## 2. Home

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 2.1 | Swipe the **hero** left and right. | Slides follow the finger and stop on one slide. | Auto-advance every 5.5 s can swap the slide while reading — UI note. |
| 2.2 | Wait on the hero without touching. | It advances; it does not fight a swipe in progress. | Reduced-motion setting should stop it. |
| 2.3 | First visit only: read **"What are you after?"** | Appears once; offers SUV / saloon / other / Skip. | — |
| 2.4 | Answer **"A family SUV"**. | Inventory opens **filtered to SUVs**; the URL carries the choice. | **Full, unfiltered list — UX-003 / FN-005.** |
| 2.5 | Go back, answer **"A saloon"**. | Inventory opens filtered to saloons. | Same as 2.4. |
| 2.6 | Go back, tap **Skip**. | Prompt hides; it does not return on reload. | It returning every visit — UX-006. |
| 2.7 | Clear site data, reload home, tap **"See what's new"**. | It either is not offered on a first visit, or explains there is no baseline. | **"New since your last visit 0 cars" while stock exists — FN-004.** |
| 2.8 | Scroll to the home **inventory strip**; switch Available / On order / Landed. | Cards change with the tab; an Available car flagged new-arrival also appears under Landed; counts match what is shown. | Available count says "of which N new arrivals" — BL-001; the Landed tab missing the same car — UI-004. |
| 2.9 | Tap a car card. | Its car page opens. | — |
| 2.10 | Swipe the **featured** slider. | It moves one card at a time; no vertical scroll hijack. | — |
| 2.11 | Wait 9 seconds on home. | **Nothing claims a person asked about a car.** | **A city/time/car toast appears — it is generated, not real — UX-001.** |
| 2.12 | Tap **Chat with us** in "Why choose us". | WhatsApp opens with the greeting. | — |

---

## 3. Inventory — public

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 3.1 | Tap **Search options**. | The filter panel opens on the phone; every group is reachable. | Panel taller than the screen must scroll. |
| 3.2 | Tick **Available**, then **On order**, then **Landed**. | Each filters the list; each count matches the number of cars in that group. | Counts can include cars excluded by other filters — FN-006. |
| 3.3 | Tick a **Make**, a **Year**, a **Colour**. | Each narrows the list; counts stay truthful. | — |
| 3.4 | Enter min `5000000`, max `50000000`. | Only cars in that band remain. | — |
| 3.5 | Enter min `50000000`, max `5000000`. | A clear empty/explanation state, not a crash or a full list. | — BL-003. |
| 3.6 | Type a decimal price, e.g. `12500000.5`. | Rejected or handled visibly. | Silently truncated to `12500000` — BL-003. |
| 3.7 | Tap **Clear all filters**. | Everything resets; the full list returns; the count is announced. | — |
| 3.8 | Open **Sort by** → **Newest first**. | The **highest** `TS-####` is first. | **The lowest ref is first (oldest) — UI-005 / BL-008.** |
| 3.9 | Sort Price low→high, then high→low, then Year newest. | Order visibly changes and matches the label. | — |
| 3.10 | Switch **Grid / List**. | Layout changes; the pressed state is visible. | Grid cards omit the "Available" chip that list rows show — UI-003. |
| 3.11 | Tap a car card. | Car page opens. | — |
| 3.12 | Tap **Share** on a row. | The phone's native share sheet opens. | Falling back to "Link copied" on a phone is a clue the sheet is blocked. |
| 3.13 | Scroll to the pagination; use **Next / Prev / a number**. | One page at a time, 9 cars per page; focus moves to the heading. | Page count must match the filtered list. |
| 3.14 | Filter until nothing matches. | Empty state with a WhatsApp sourcing button. | A blank list with no explanation — fail. |
| 3.15 | Tap the empty-state WhatsApp button. | WhatsApp opens with the sourcing message. | — |
| 3.16 | Set a filter, reload the page. | The URL and the controls still carry the filter. | — |
| 3.17 | Edit the URL to `?status=s`. | Either the sold page or an ignored filter. | **An empty inventory with no explanation — BL-002.** |
| 3.18 | Change any filter and watch the URL. | The URL updates without a full reload. | — |
| 3.19 | Wait 9 seconds on inventory (once per session). | No fabricated social proof. | **A random-city toast — UX-001.** |
| 3.20 | Fast-flick upward from the top of the page. | "Before you go" appears only after 7 s, and at most twice per session. | Hard to trigger; note whether it appeared at all — UX-005. |
| 3.21 | Tap **"I'll keep looking"** in that modal. | It closes and the page stays usable. | Body scroll must be unlocked. |
| 3.22 | Tap the **Home / Inventory** breadcrumb. | Home, then Inventory; no dead link. | — |

---

## 4. Car page

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 4.1 | Swipe the main photo left/right. | Previous/next photo, one per swipe. | Vertical scroll must not be captured. |
| 4.2 | Tap the arrows. | Same stepping. | Arrows only when more than one photo. |
| 4.3 | Tap a **thumbnail**. | Jumps to that photo; the active one is marked. | — |
| 4.4 | Tap the **main photo**. | Full-screen lightbox; page behind does not scroll. | — |
| 4.5 | Close the lightbox by the close control, the backdrop, and the back gesture. | All three close it and return to the same scroll position. | Android back must close the lightbox, not leave the page. |
| 4.6 | In the lightbox, swipe/arrow to the next photo. | Steps; does not jump back to the first. | — |
| 4.7 | Switch **Overview / Features / Delivery**. | Panel and spoken line change together. | — |
| 4.8 | Tap **Chat on WhatsApp** (sidebar). | WhatsApp opens prefilled with this car's name and ref. | Wrong car in the message — fail. |
| 4.9 | Tap **Make an offer**. | WhatsApp opens with the car and its price. | — |
| 4.10 | Tap **Book a viewing**. | WhatsApp opens with the car and ref. | — |
| 4.11 | On an **on-order** car, read the main CTA. | It says **Reserve**, not Buy/Chat. | — |
| 4.12 | Scroll until the price card leaves the screen. | The mobile bottom bar appears with price + Chat/Reserve. | It must not cover the footer or the WhatsApp gate — UI note. |
| 4.13 | Tap the bottom-bar CTA. | Same WhatsApp destination as the sidebar CTA. | — |
| 4.14 | Swipe the **related** strip. | Horizontal carousel moves one card at a time. | Heading says "More landed cars" while the strip contains on-order cars — FN-007. |
| 4.15 | Visit the same car a second time (reload counts). | Greeting changes to "Good to see you back" and offers Book a viewing. | Clear site data → the message resets — UX-006. |
| 4.16 | Tap **Share this**. | Native share sheet with the car URL. | — |
| 4.17 | Open a **sold** car's link from a chat. | "That one found a new owner", similar available cars, a **Message Umar** button and a **See the full inventory** link; not a 404. | Both controls work. |
| 4.18 | Open `/car/TS-0000` (a ref that cannot exist). | The real 404 page. | A blank page or a 500 — fail. |
| 4.19 | Open a car with **no photos**. | Drawn placeholder, no counter/arrows/thumbs; page still works. | Broken-image icon — FN-002 (only if data is bad). |
| 4.20 | Wait 9 seconds on the car page (new session). | No fabricated social proof. | Random-city toast — UX-001. |
| 4.21 | Load an **on-order**, a **landed** and a **special** car; read the greeting line. | The wording changes with the car's state; an arrival month is named only when the note carries one. | The same generic line for every state — fail. |
| 4.22 | On a car page, after 7 s, fast-flick upward from the top. | "Before you go" with WhatsApp + "I'll keep looking". | Unreachable — UX-005. |
| 4.23 | Only if bad data exists: open a page whose photo row is not a valid asset id. | The drawn placeholder; the page still loads. | **A crash instead of a placeholder — FN-002.** Mark ⚠ if you cannot create the row. |

---

## 5. WhatsApp handoff and the tap record

Do 5.1–5.3 once on a car page and once on the home header. The tap they create is then checked in 5.4–5.6 **after you sign in** (section 7); the record survives the sign-in.

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 5.1 | Tap a WhatsApp button for the **first time in a page load**. | Privacy notice appears **before** the handoff; only after accepting does WhatsApp open. | The WhatsApp app opening behind the notice — fail. |
| 5.2 | Dismiss the notice, then tap the same button again. | It opens directly; the notice does not repeat in that page load. | Reload → it appears again (once per tab) — UX-007. |
| 5.3 | Send the prefilled message, then press the phone's back gesture to return. | The browser is still on the car page, at the same scroll position. | Returning to home instead — fail. |
| 5.4 | In the office, open **Enquiries → Taps**. | The tap is listed with page, car ref and time. **No name or phone number.** | Any PII in the tap list — fail (spec). |
| 5.5 | Tap the shell's WhatsApp badge (or dashboard "All taps"). | Opens the Taps panel; the badge clears after the list is viewed. | Badge must stay at zero, glyph remains. |
| 5.6 | Go back to the dashboard. | The "new" count is 0; the glyph is still there. | A popup/sound — not built, not expected. |

---

## 6. Privacy and legal

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 6.1 | Open `/privacy` and read the top. | A real privacy notice: who, what, why, how long. | **An "Owner note" saying this is a demo notice — UX-002 (blocker).** |
| 6.2 | Scroll to **"Who to contact"**. | A working contact route. | **No email address anywhere — UX-004.** |
| 6.3 | Scroll to **"Your rights"**. | It names a way to request deletion that actually exists. | The product has no delete path at all — DATA-002 / COV-001. |
| 6.4 | Tap the WhatsApp contact on the page. | Opens a chat. | — |
| 6.5 | Check the **last updated** date. | It is a real date, not a placeholder. | — |

---

## 7. Office door and shell

Sign in with the owner account.

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 7.1 | Signed out, open `/office`. | Redirects to `/office/sign-in`; Clerk's sign-in appears inside the office look. | A public sign-up link — there should be none. |
| 7.2 | Sign in with the correct password. | Lands in the office (dashboard). | — |
| 7.3 | Open `/office/sign-in` while signed in. | Redirects to `/office`. | — |
| 7.4 | Read the **bottom nav** at 390 px. | Dashboard / Inventory / Enquiries / Drafts / Activity (or More) all fit; labels are not clipped. | Any item pushed under the home indicator. |
| 7.5 | Tap each bottom-nav item. | Correct screen; the current item is marked. | A dead item — fail. |
| 7.6 | Open **More** (if present). | Settings and Account reachable. | — |
| 7.7 | Tap the **topbar WhatsApp badge**. | Opens `/office/enquiries?tab=taps`. | — |
| 7.8 | Tap the **account chip**. | `/office/account`. | — |
| 7.9 | Tap **Sign out**. | Returns to the door; the office refuses on the next request. | Device drafts should be cleared (test in 16.7). |
| 7.10 | Press the phone's back gesture after sign-out. | Does not restore a signed-in office page. | A cached office page visible — fail. |
| 7.11 | Optional, only if you can recover the account: at sign-in, enter a wrong password 10 times. | A bounded lockout (spec: 30 min), never indefinite. | **No lockout is implemented in the app — SYS-001 / COV-003. Record what Clerk actually does; do not lock yourself out if recovery is unclear.** |
| 7.12 | Open an office URL that cannot exist, e.g. `/office/nonsense`. | The office not-found page, with a link back to the dashboard. | A blank page or the public 404 — fail. |

---

## 8. Dashboard

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 8.1 | Read **Money tied up**. | A naira total and the number of cars it covers, including cars with incomplete costs. | A figure that silently omits incomplete cars — fail. |
| 8.2 | Read **Projected profit**. | A total, "From X of Y cars", and "N excluded: costs incomplete". | A profit that includes an incomplete car — BL-006. |
| 8.3 | Read **Real profit (sold)**. | Sold cars only; sale price minus cost. | — |
| 8.4 | Read the counts strip. | Available / On order / Landed / Sold, with "of which N new arrivals" where present. | **BL-001:** a new-arrival Available car appears under Landed but is missing from the count. |
| 8.5 | Tap a count card. | Inventory opens filtered to that state. | A link that lands on the unfiltered list — fail. |
| 8.6 | Read **Recent activity**. | Car/enquiry/setting subjects and times; car refs open the car. | — |
| 8.7 | Tap **Full log**. | Activity opens on the same entries. | — |
| 8.8 | Read **Recent WhatsApp taps**. | Page / car / time only. **No phone numbers or names.** | Any PII — fail (spec). |
| 8.9 | Tap a tap's car ref. | The car form opens. | — |
| 8.10 | Switch to another app for ~10 s, return to the dashboard. | Figures refresh on focus; there is no Refresh button. | Stale figures after a change made in another tab — E10. |
| 8.11 | In a second tab, add a car. Return to this tab. | Counts and money update on focus. | — |
| 8.12 | Tap **Add a car**. | The car form opens. | — |

---

## 9. Office inventory

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 9.1 | Type a **ref**, then a **model name**, in Search. | Each narrows the list; the placeholder says "name or ref". | It matching neither, or only matching the start of a ref — fail. |
| 9.2 | Open **Sort** → **Newest first**. | Highest `TS-####` first. | **Oldest first — UI-005 / BL-008.** |
| 9.3 | Sort by price high→low, low→high, profit high→low. | Order matches the label; cars with no price/profit sort predictably. | A crash on a null profit — fail. |
| 9.4 | Change **page size** to 10, then 50, then 100. | Row count changes; the page resets safely. | — |
| 9.5 | Reload. | The page size persists. | It should (localStorage). |
| 9.6 | Tap each **state chip**, including **Sold**. | Only that group; the chip's count matches the rows. | Zero-count chips hidden unless active. |
| 9.7 | Tap a row's **Edit**. | The car form opens. | — |
| 9.8 | On a test car, tap **Delete**. | A confirm dialog that **names the car**. | A generic "Are you sure?" — fail. |
| 9.9 | Confirm. | The row disappears; an **Undo** offer appears for 8 s. | No undo — fail. |
| 9.10 | Tap **Undo** within 8 s. | The row returns; nothing is left in the clear-out list. | — |
| 9.11 | Delete again and wait 10 s. | The row is gone from the live list; it appears in the **clear-out** list as a tombstone. | It vanishing entirely — fail. |
| 9.12 | Open the **clear-out** list and tap **Remove for good**. | An explicit confirm naming the car; then it is gone permanently. | One-tap permanent delete — fail. Only deleted cars are listed; enquiries at their year and orphaned files have no surface here — DATA-003 / COV-004. |
| 9.13 | Filter until nothing matches. | Empty state with **Clear filters**. | — |
| 9.14 | Use pagination. | One page at a time; the current page is marked. | — |
| 9.15 | On the phone, check every row action. | Edit and Delete are visible, not hover-only. | An action only reachable by hover — fail at 390 px. |
| 9.16 | Tap the **Car template** link. | A blank PDF downloads (or opens in the phone's viewer). | **iOS Safari may open it instead of downloading — record which.** |
| 9.17 | Tap **Create from file**. | The file picker opens; both a car template and an enquiry sheet are accepted. | — |

---

## 10. Add a car

Use a clearly marked test car; write its ref in the run record.

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 10.1 | Tap **Add a car**, then **Save car** with everything empty. | Field messages appear; focus moves to the first invalid field. | A save with no make/model/year/state — fail. |
| 10.2 | Enter a year of `1800`, then `3000`. | Refused with a range message (spec: 1900..next year). | — |
| 10.3 | Enter a mileage of `-5`, then `12.5`. | Refused; whole number only. | — |
| 10.4 | With make/model/year/mileage/state filled, leave **price** blank and save. | Allowed (an office-only car). | The car must not appear publicly — test 11.6. |
| 10.5 | Add a photo from the **camera**. | Uploads; thumbnail appears. | The phone's camera permission prompt. |
| 10.6 | Add a **HEIC** photo from the library. | Accepted, or a clear refusal that names the format. | A silent failure — fail. |
| 10.7 | Add the **>15 MB** photo. | Refused before upload with a 15 MB message. | A long spinner then a generic error — fail. |
| 10.8 | Add the **PDF renamed `.jpg`**. | Refused as not an image. | It being accepted — fail. |
| 10.9 | Add three photos, then tap **Make cover** on the third. | It moves to first; the cover marker follows. | — |
| 10.10 | Remove the second photo. | It disappears from the list. | Any confirm/delay is worth noting. |
| 10.11 | Fill all six costs. | The total and the live profit update while typing. | A stale total until save — fail. |
| 10.12 | Set a price, then enter costs that exceed it. | A **negative** profit with a minus sign. | Clamped to zero or hidden — G8. |
| 10.13 | Choose a primary state; tick two secondary states. | Exactly one primary; secondaries multi-select. | Two primaries selectable — fail. |
| 10.14 | Add an **arrival note** and a **private note**. | Both saved. | The private note appearing publicly — check 10.17. |
| 10.15 | Tap **Save car**. | A toast names a new `TS-####`; the showroom updates. | An error — write it down. |
| 10.16 | **Immediately tap Save car again.** | Nothing else is created; the form is no longer able to create a second car. | **A second `TS-####` with identical details — FN-009 / BL-010 (major).** |
| 10.17 | Open the new car's public page. | It shows the price, photos, features, arrival note. **Not** the private note or costs. | A private note or cost on the public page — blocker. |
| 10.18 | Check the public inventory includes it. | It appears in the right section with the right price. | — |
| 10.19 | Return to the form. | No duplicate; the ref is final. | — |
| 10.20 | Type into the form, then close the tab without saving. Reopen **Add a car**. | The device draft restores the fields and photos; a line says the draft is kept. | Silent loss — fail; a prompt is not expected, auto-restore is. The draft includes private notes and costs — DATA-006. |
| 10.21 | Type into the form, then tap **Cancel**. | A question before discarding, or the work is kept. | **Cancel clears the device draft with no question — UX-008.** |
| 10.22 | Type into the form, then press the **phone's back gesture**. | The work is still recoverable (device draft). | — |
| 10.23 | Tap **Autofill from PDF** with a filled template. | Fields fill; **no photos are added**; a notice names what was filled. | Photos invented — fail. |
| 10.24 | With values already typed, autofill again. | **Replace / Keep** is offered; both do what they say. | It silently overwrites — fail. |
| 10.25 | Tap **Manage states**. | Opens Settings' car-state editor. | — |

---

## 11. Edit, sell, un-sell, delete, and the public gate

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 11.1 | Open a car; read its **reference**. | It is visible and not editable. | An editable ref — fail. |
| 11.2 | Change the price; save. | "Saved" or "Nothing changed." as appropriate; the public price follows. | A save that claims success while the value did not change — fail. |
| 11.3 | Open a car and tap **Mark as sold**. | Sold is chosen; sale price and date are asked for. | Nothing is written until Save — check. |
| 11.4 | Enter the sale price and date; save. | Inventory → Sold; the public page becomes the sold page. | — |
| 11.5 | Un-mark Sold and save. | It returns to the **previous primary state**; secondaries untouched; counts agree. | It returning to a default Available — BL-005 / G11. |
| 11.6 | Create/keep the **incomplete** car (no price, no photos). Open `/car/<its ref>` in a new tab. | **404** — a car without a price and a photo is office-only. | **It renders at ₦0 with a placeholder — FN-001 (blocker).** |
| 11.7 | Delete a car and let the undo window close. | It is a tombstone; removing it for good clears its photos/costs/sale. | — |
| 11.8 | After removing for good, open its old public URL. | 404. | A stale page — fail. |
| 11.9 | On a test car with a **was-price**, raise the current price above it; save; open the public page. | The Special ribbon and the struck-through price are gone together. | The ribbon vanishing while the was-price remains in the record — BL-004. |

---

## 12. Import and drafts

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 12.1 | In **Enquiries**, tap **Enquiry template**. | A blank PDF downloads/opens. | — |
| 12.2 | Tap **Create from file** and choose the filled **enquiry sheet**. | A batch of drafts is created; the count is stated. | An enquiry created directly — fail (a draft is not a record). |
| 12.3 | Choose a **wrong file** (e.g. a photo). | A named refusal; nothing is created. | A silent no-op — fail. |
| 12.4 | Choose a file **over 10 MB**. | Refused with the 10 MB rule. | Upload starts then fails — fail. |
| 12.5 | Open **Drafts**; read the batch. | One card per row; fields the file did not carry say so. | — |
| 12.6 | On a car draft, tap the **state** select. | A primary can be chosen; the file's original state is marked. | — |
| 12.7 | Choose a state when the file's state was deleted. | The red "which is gone — choose one" warning clears once a replacement is chosen. | **It stays — UI-008.** |
| 12.8 | Add two photos to the draft; make the second the cover. | Uploaded, survive a reload, cover marked. | — |
| 12.9 | Reload the drafts page. | Photos and choices are still there. | — |
| 12.10 | Tap **Save as a car** on a draft with no state. | Refused: choose a state. | A car created with no state — fail. |
| 12.11 | Choose a state and save. | A `TS-####` is minted; the draft leaves the list; the car appears in Inventory. | — |
| 12.12 | On another draft, tap **Delete**. | An explicit confirm; deletion is permanent (no undo is expected). | — |
| 12.13 | After saving an enquiry draft, open the enquiry and look for a control to open the **imported PDF**. | The PDF is linked to the enquiry and can be opened or deleted by the owner. | **No such control exists — DATA-001.** Record the absence. |
| 12.14 | Open a car draft and tap **Cancel**. | Returns to Drafts; the draft row is still waiting. | — |
| 12.15 | Use **Save as draft** in the car draft editor, then in an enquiry draft editor. | Both keep the draft waiting; incomplete fields allowed; nothing is created. | — |
| 12.16 | Tap **Edit** on a car draft and on an enquiry draft. | The full editor opens, prefilled from the file, in draft mode. | — |
| 12.17 | With no drafts waiting, open Drafts. | An empty state that says so. | A bare page — fail. |
| 12.18 | On a draft with photos, tap **Remove photo**. | The reference leaves the draft; the rest survive a reload. | — |

---

## 13. Enquiries and taps

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 13.1 | Open **Enquiries**. | A board of columns, one per customer state; cards are readable at 390 px. | Horizontal scrolling must be obvious; a card cut in half — note. |
| 13.2 | Tap a card. | A detail dialog opens with the customer. | The dialog must fit and scroll. |
| 13.3 | Tap the **phone** number. | The dialler opens with the number. | — |
| 13.4 | Tap **WhatsApp them**. | WhatsApp opens with the customer's number and a message naming their ask. | Wrong number — fail. |
| 13.5 | Tap **Call**. | Dialler opens. | — |
| 13.6 | Tap **Edit**. | The enquiry form opens with every field. | — |
| 13.7 | Change a field and save. | "Saved"; the board reflects it. | — |
| 13.8 | Save again with no change. | "Nothing changed." | — |
| 13.9 | In the detail dialog, tap a **different state pill**. | The state changes; a toast says the cars are untouched. | **It commits on one tap with no confirm/undo — UX-009.** |
| 13.10 | Tap the **same** state again. | No misleading "moved" message; no duplicate work. | — |
| 13.11 | Look for a **Delete / Remove** control. | The spec's retention deletion exists somewhere. | **Nothing anywhere — DATA-002 / COV-001 (blocker).** |
| 13.12 | Switch to **Taps**. | Full tap list, newest first, page/car/time only. | Any PII — fail. |
| 13.13 | Scroll the taps list on the phone. | Readable; no horizontal overflow. | — |
| 13.14 | Tap a car name in Taps. | The car form opens; if the car is gone, it says so rather than 404ing. | — |
| 13.15 | Create an enquiry with **Create from file** and check the board. | It lands as a draft, not an enquiry. | Direct entry — fail. |
| 13.16 | Edit an enquiry, change a field, then tap **Cancel**. | Returns without saving; the board is unchanged. | Check whether it asks before discarding. |

### 13b. Activity log

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 13.17 | Open **Activity**. Type a ref, a word from an action, and an actor in **Search**. | Each narrows the log. | The placeholder says "car, ref or action"; search must cover all three. |
| 13.18 | Tap each **type chip** (All / Cars / Enquiries / Money / Settings). | The list filters; each chip shows a count. | Counts that include entries the filter hides — note. |
| 13.19 | Filter until nothing matches, then tap **Clear filters**. | The empty state explains and the reset restores the full log. | — |
| 13.20 | Tap a **car ref** in the log. | The car form opens. | Only car subjects link; an enquiry subject is text. |

---

## 14. Settings — contact and defaults

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 14.1 | Open **Settings**. | Sub-menu: General / Car states / Customer states / Account. | Tabs must not overflow at 390 px. |
| 14.2 | Enter a valid Nigerian number; save. | "Valid"; every chat button follows; the stored value is normalised. | — |
| 14.3 | Enter an invalid number. | Save refused; the old number stays in force; an inline reason. | An invalid number saved — fail. |
| 14.4 | While typing an invalid number, read the **preview link**. | It matches the number on screen. | **It keeps the last valid link — UX-011.** |
| 14.5 | Read the **Owner** note beside the field. | It reads as advice, not as "this is a demonstration". | **"The demonstration ships with a placeholder number" — UX-010.** |
| 14.6 | Change the **tagline** to 80 characters; save. | Saved; the home page follows. | More than 80 refused with a counter. |
| 14.7 | Save a tagline identical to the current one. | "Nothing changed." | — |
| 14.8 | Change the **full-tank default**; save. | Stored; a new car's empty-tank cost prefills. | — |
| 14.9 | Type into a card, reload without saving. | The device draft restores the value and marks it unsaved. | — |
| 14.10 | Check each card's **audit line**. | Names who changed it and when. | — |

---

## 15. Settings — states

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 15.1 | **Car states**: read the four locked primaries. | They are in the showroom order, marked locked, not editable. | The order is what the showroom groups by and cannot be corrected here — BL-011. |
| 15.2 | Add a **secondary state**. | A new row appears, focused, named "New state". | — |
| 15.3 | Rename it and leave the field. | The name commits; a duplicate name is refused and the old name returns. | — |
| 15.4 | Open the **colour picker** and choose a colour. | The swatch and label ink update. | iOS/Android native picker; does the change commit on close? |
| 15.5 | Press and hold the **grip** and drag the row. | The row moves. | **Touch drag does not fire; no arrow keys on a phone — UI-006 (major).** |
| 15.6 | With an external keyboard connected (optional), press ↑ / ↓ on the grip. Without one, look for any other reorder control. | The keys move the row; the phone alone offers no other control. | **No reorder is possible on the phone — UI-006.** |
| 15.7 | Tap **Delete** on an **unused** state. | A confirmation. | **It disappears immediately — UI-007 / BL-009.** |
| 15.8 | Tap **Delete** on a state a car uses. | Refused with a count/explanation; nothing changes. | — |
| 15.9 | **Customer states**: repeat 15.2–15.8. | Same behaviour, all rows editable. | Same touch/no-confirm issues. |
| 15.10 | Give two customer states the same colour. | Allowed or refused consistently; the board stays readable. | — |
| 15.11 | Reload after each change. | Every change persisted. | A change lost on reload — fail. |

---

## 16. Account, export, sign-out

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 16.1 | Settings → **Account**. | The Clerk account panel. | — |
| 16.2 | Tap **Change password**. | Clerk's own flow; the office never holds the password. | An in-app password form — fail. |
| 16.3 | Tap **Back to the office**. | Returns to Settings. | — |
| 16.4 | Tap **Download the export**. | One ZIP; it contains `master.json`, one CSV per subject, `README.txt`. | **iOS: record whether it downloads or opens. A ZIP with no CSVs — fail.** |
| 16.5 | Read the **System** card. | Storage and backup reported honestly, or "not reported". | Permanently "unknown" unless an external job exists — SYS-006 / COV-002. |
| 16.6 | With a device draft present, **sign out**. | Returns to the door. | — |
| 16.7 | Sign in again; open the car/draft you left. | The device draft is **gone** (sign-out clears it). | It surviving sign-out on a shared phone — privacy finding. |
| 16.8 | In two tabs, sign out in one; use the other. | The other refuses on its next request. | A stale tab still saving — fail. |
| 16.9 | Press back after sign-out. | No office page is restored from cache. | — |

---

## 17. Offline, slow network, and limits

| # | Do | Expect | Watch for / ref |
|---|---|---|---|
| 17.1 | On a loaded public page, go to **airplane mode**, then tap a link. | The offline banner appears; no fake freshness. | — |
| 17.2 | In the office, go offline and open a car form. | The banner appears; **Save controls are disabled**; a line explains. | A Save that appears active and fails on tap — fail. |
| 17.3 | Type into the form while offline, then restore the network. | The recovery line says the draft is still here and to press Save. | The draft being lost — fail. |
| 17.4 | Press Save after restoring. | Saves once; no duplicate (see 10.16). | — |
| 17.5 | Open the same page in a second tab; make a change in one; focus the other. | The office refreshes figures on focus; the public page does not claim to be live. | — |
| 17.6 | Kill the browser and reopen the office. | A still-valid session lets you in; an expired one returns to the door, not a blank error. | — |
| 17.7 | Try adding a photo with the **image store unreachable** (if you can simulate it). | A named failure ("picture store could not be reached"); the form keeps its values. | A silent failure — fail. |
| 17.8 | Check the phone's **share sheet** and **file picker** never open a blank sheet. | Native controls list the expected apps. | — |

---

## 18. The blocker and major checks, in one place

If you only run ten lines, run these. They are the findings most likely to change what the owner does next.

| # | Finding | One-line reproduction | Expected by the spec |
|---|---|---|---|
| B1 | **FN-001** unlisted car at ₦0 | Clear a car's price and photos, save, open `/car/<ref>` | 404 |
| B2 | **UX-002** demo notice on the live site | Open `/privacy` | A real notice, no owner note |
| B3 | **DATA-002 / COV-001** no deletion | Open any enquiry | A remove/retention path exists |
| B4 | **FN-009** double-save creates two cars | Save a new car twice | One car |
| B5 | **UI-005 / BL-008** "Newest first" | Public and office inventory | Highest ref first |
| B6 | **UI-006** state reorder on touch | Drag a grip on the phone | The row moves |
| B7 | **UX-001** fabricated social proof | Wait 9 s on home | Nothing untrue |
| B8 | **UX-003** body filter | Home → "A family SUV" | A filtered inventory |
| B9 | **UI-001** dead social links | Tap Instagram | A profile, or no icon |
| B10 | **UX-008** Cancel discards work | Type, tap Cancel | A question, or work kept |

---

## 19. Hand-over to the second person

After the owner's run, leave the phone and the account in this state, and write it in the run record:

1. **Signed out** of the office, or signed in with the test account — state which.
2. The **test cars** from P1–P5 are still present, with their refs written down. Do not delete them between runs.
3. One **draft** is left waiting in Drafts (so 12.5–12.9 can be repeated).
4. One **enquiry** is left on the board, with a phone number that is safe to dial.
5. The **WhatsApp number** in Settings is the real test number, not the placeholder.
6. Site data is **not** cleared between runs unless a line says so; the second run is about repeating the same actions, not resetting the world.

The second person runs the same sections in the same order and records only **differences** from the owner's run, plus anything the owner marked `⚠`.

**What "repeatable" means here:** the same action on the same build produces the same result. A line that passed for the owner and fails for the second person is a finding about the **phone's state**, not necessarily about the code — record the state (signed in/out, draft present, network, site data) before calling it a defect.

---

## 20. What this checklist does not cover

- **Desktop-only behaviour** (hover, keyboard navigation, drag-and-drop with a mouse) — the standing browser-check procedure covers those widths, not this document.
- **The 12-hour idle / 7-day session expiry** — not practical to wait out. The session rule is in the code and in `session-rules`; test only the signed-out and sign-out paths here.
- **The database, the image store, Clerk's dashboard, the backup job** — read-only this pass. Where a result depends on them, the line says so.
- **Load, abuse and rate limiting** — the tap endpoint has no limit (SYS-003); this is an edge/deployment check, not a phone one.
- **The 12-hour expiry and the daily job** — not observable in one sitting; check the System card for what the deployment reports (16.5).
- **An induced server error** — the office error boundary exists (`app/office/error.tsx`), but a phone run cannot make a read fail safely. Mark ⚠ if you cannot induce one.
- **A malformed photo row (FN-002)**, **money precision (BL-007)**, the **dead `getPublicCar` path (FN-003)**, **row-level security (DATA-004 / SYS-004 / COV-006)**, **single-owner enforcement (DATA-005 / SYS-002 / COV-005)**, **session expiry (SYS-005)** and **rate limits (SYS-003)** — database and deployment checks, not phone ones.

---

## 21. Deviation log

Write one line per row that did not match. Do not summarise — the row number plus what you saw is what the next person needs.

| Row | Run | What actually happened | Looked like | Screenshot? |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

"Looked like" is your first read, not a diagnosis: wrong number, missing control, slow, crashed, opened the wrong app, text clipped, nothing happened. Keep it to those words.
