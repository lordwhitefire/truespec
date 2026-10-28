# Interaction inventory — every thing a person can do

Built from source, read-only. One row per interaction. `Expected` comes from `spec-baseline.md`.
**Status: complete** — every public page, office screen, Server Action and API route read; sections A–N cover the interaction surface.

Legend: **ID** · screen · trigger · what it calls · expected · risk note.

---

## A. Site chrome (every public page) — `app/(site)/layout.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| A1 | Header | Tap **TrueSpec** logo | `/` | Home loads | — |
| A2 | Header | Read WhatsApp number | `getSetting("whatsapp_number")` | Shows saved number, normalised `+234…` | If unset, shows "off" note, not invented |
| A3 | Header | Tap **Instagram** icon | `href="#"` | — | **Dead link — goes nowhere** |
| A4 | Header | Tap **Chat on WhatsApp** | `waLink(num, "Hello TrueSpec, I have a question.")` → `wa.me` | Opens WhatsApp, prefilled | Disabled state if no number |
| A5 | Header | Tap **theme toggle** | `ThemeToggle` | Dark/light switch | Check persistence across pages |
| A6 | Header | Read **ticker** | `buildTicker(cars)` | 4 live lines: landed, on-order, biggest drop, two fixed promises | Lines are derived from real cars |
| A7 | Footer | Tap **Privacy notice** | `/privacy` | Privacy page loads | — |
| A8 | Footer | Tap **WhatsApp us** (big button) | `wa.me` | Opens WhatsApp | Same disabled state |
| A9 | Footer | Tap **WhatsApp icon** | `wa.me` | Opens WhatsApp | `aria-label` says "WhatsApp — reason" when off |
| A10 | Footer | Tap **Instagram / Facebook / YouTube** | `href="#"` | — | **Three dead links** |
| A11 | Footer | View **photo gallery** | First 4 available cars' cover photos | 4 photos | Empty if fewer than 4 cars |
| A12 | Global | Tap any WhatsApp link | `WhatsAppGate` intercepts | Privacy notice shown **before** the tap proceeds; tap recorded (page, car ref, time) | Gate is at layout so every button passes through it |
| A13 | Global | Floating **WhatsApp FAB** | `SiteFab` → `wa.me` | Opens WhatsApp | Hidden when no number |
| A14 | Global | Offline / slow network | `OfflineNotice` | Banner shown | Check on phone airplane mode |
| A15 | Global | Open any page | `dynamic = "force-dynamic"` | Always fresh, never build snapshot | — |

## B. Home — `app/(site)/(home)/page.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| B1 | Home | Hero slider | `HeroSlider` — top 3 available by price | Swipeable | Touch swipe on phone |
| B2 | Home | **"What are you after?"** prompt (Umar) | 4 buttons: SUV / saloon / other / **Skip** | First visit until answered or skipped | Check it appears once, then not again |
| B3 | Home | Answer or skip the prompt | `HomeBehaviors` | Prompt hides; answer persists | — |
| B4 | Home | Home inventory strip | `HomeInventory` | Cars listed with WhatsApp CTA | — |
| B5 | Home | **Chat with us** (Why-choose-us) | `wa.me` | Opens WhatsApp | — |
| B6 | Home | Featured slider | `FeaturedSlider` — available cars | Swipeable | — |

## C. Inventory — `app/(site)/inventory/page.tsx` + `InventoryBrowser.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| C1 | Inventory | Tap **Search options** | toggles sidebar | Sidebar opens on phone | Mobile-first control |
| C2 | Inventory | **Status** checkboxes | Available / On Order / Landed, each with count | Filters the list | Counts from `countStock` — same rule as office |
| C3 | Inventory | **Make** checkboxes | Brands present, with counts | Filters | — |
| C4 | Inventory | **Year** checkboxes | Years present, with counts | Filters | — |
| C5 | Inventory | **Colour** checkboxes | Colours present, with counts | Filters | — |
| C6 | Inventory | **Min / Max price** inputs | number inputs, step 100000 | Filters on naira | `parseInt` — decimals truncated |
| C7 | Inventory | **Clear all filters** | resets all, page 1 | List returns to all cars | Announces count |
| C8 | Inventory | **Sort by** select | Newest / Price low→high / Price high→low / Year newest | Re-sorts | — |
| C9 | Inventory | **Grid / List** buttons | view toggle | Layout switches | `aria-pressed` set |
| C10 | Inventory | Tap a car card | `/car/[ref]` | Car page loads | — |
| C11 | Inventory | Tap **Share** on a row | `navigator.share` → fallback clipboard → fallback toast | Share sheet or "Link copied" | On phone check the native share sheet opens |
| C12 | Inventory | **Pagination** | Prev / page numbers / Next — **9 cars per page** | Page changes, heading focused | Page count from filtered list |
| C13 | Inventory | Filters that match nothing | Empty state + **Message me on WhatsApp** | Empty block with sourcing promise | — |
| C14 | Inventory | **Exit intent** (desktop mouse-out, phone flick-up near top) | "Before you go" modal, **min 7s dwell** | Modal with WhatsApp + "I'll keep looking" | On phone: swipe up fast near top |
| C15 | Inventory | Wait ~9s on page | Toast: *"Someone from {city} asked about {car} — {when}"* | — | **Generated randomly — not real data.** City, time and car are invented |
| C16 | Inventory | Change filters | URL updates via `replaceState` | Deep link reflects filters | Shareable URL |
| C17 | Inventory | Modal budget | Max **2 modals per session** across pages | Further modals suppressed | — |
| C18 | Inventory | Breadcrumb | Home / Inventory | — | — |

---

## Open questions raised by this pass
1. **C15 — fabricated social proof.** The toast claims a real person asked about a real car at a real time. It is `Math.random()` over a hard-coded city list and time list. No data is read. This is the app telling the buyer something untrue.
2. **A3 / A10 — four dead social links** (`href="#"`). On a phone they jump the page to the top.
3. **Price filter** truncates decimals (`parseInt`), and step is 100,000 — check whether a partial value like `15000000.5` or a typed value below step behaves.

## D. Car page — `app/(site)/car/[ref]/page.tsx` + `CarBehaviors.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| D1 | Car page | Breadcrumb Home / Inventory | `/`, `/inventory` | Navigates | — |
| D2 | Car page | **Share this** chip | `navigator.share` → clipboard → toast | Native share sheet on phone | Falls back to "Link copied" |
| D3 | Car page | Swipe gallery left/right | touch handler, threshold 50px | Next/previous photo | Works on phone |
| D4 | Car page | Gallery arrows | prev/next | Steps photo | Only shown when >1 photo |
| D5 | Car page | Tap a thumbnail | `show(i)` | Jumps to photo | Only when photos exist |
| D6 | Car page | Tap the main photo | opens lightbox `#lb` | Full-screen viewer | Body scroll locked |
| D7 | Car page | Lightbox close / backdrop / Escape | closes | Returns to page | — |
| D8 | Car page | Lightbox arrows / arrow keys | previous/next | Steps photo | — |
| D9 | Car page | **Overview / Features / Delivery** tabs | tab panel swap + spoken line | Content switches | `aria-selected` handled |
| D10 | Car page | **Chat on WhatsApp** (sidebar) | `carWaLink` with car name/ref | WhatsApp prefilled with this car | On-order says **"Reserve this car"** |
| D11 | Car page | **Make an offer** | `wa.me` prefilled with car + price | Opens WhatsApp | — |
| D12 | Car page | **Book a viewing** | `wa.me` prefilled with car + ref | Opens WhatsApp | — |
| D13 | Car page | Mobile bottom bar | price + **Chat now / Reserve now** | Appears when price card scrolls out | Sticky on phone |
| D14 | Car page | Related cars prev/next | horizontal scroll 310px | Carousel moves | — |
| D15 | Car page | Return to the same car (2nd visit) | localStorage `seen[slug]` | Greeting changes to **"Good to see you back"** + Book a viewing | Check it appears on reload |
| D16 | Car page | First visit, status-based greeting | on-order / landed / special / available | Spoken line differs per status | Arrival month parsed from `arrivalNote` |
| D17 | Car page | Farewell — mouse-out or phone flick-up near top, **after 7s** | "Before you go" modal | WhatsApp + "I'll keep looking" | On phone: fast swipe up at top |
| D18 | Car page | Wait ~9s | Toast: *"Someone from {city} asked about {name} — {when}"* | — | **Fabricated — random, same as C15** |
| D19 | Car page | Sold car link | `soldPageView` | "That one found a new owner" + similar available cars | **Does not 404** — graceful sold page |
| D20 | Car page | Unknown ref | `notFound()` | Real 404 page | Status thrown before streaming |
| D21 | Car page | No photos | drawn gradient box, no counter/arrows/thumbs | Degrades gracefully | — |
| D22 | Car page | Broken photo URL | `onerror` drops the src | Drawn box shows, no broken icon | — |
| D23 | Sold page | **Message Umar** | `wa.me` prefilled "it's sold, after something similar" | Opens WhatsApp | — |
| D24 | Sold page | **See the full inventory** | `/inventory` | Navigates | — |

## E. Office shell + dashboard — `app/office/(shell)/layout.tsx`, `(dashboard)/page.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| E1 | All office pages | Left nav | Dashboard / Inventory / Enquiries / Drafts / Activity / Settings | Navigates | Collapses on phone to bottom nav |
| E2 | All office pages | Bottom nav (phone) | same destinations + More | Navigates | Check 5 items fit at 390px |
| E3 | All office pages | Topbar account chip | `/office/account` | Account screen | — |
| E4 | All office pages | Topbar sign-out | `/office/sign-out` → POST | Ends session everywhere | Open tabs must stop working on next request |
| E5 | Dashboard | Read stock counts | `countStock` | Available / On order / Landed / Sold, used and new split | Same rule as public counts |
| E6 | Dashboard | Read money totals | `overviewMoney` | Money tied up, projected profit, "still building: N" line | Incomplete-cost cars excluded from profit |
| E7 | Dashboard | Recent taps | last N tap rows | Page, car, time — **no PII** | Badge = unseen count |
| E8 | Dashboard | Tap the tap glyph (shell) or "All taps" | `/office/enquiries?tab=taps` | Opens the taps list, which marks seen, clears the badge; the glyph stays | Badge only — no popup or sound |
| E9 | Dashboard | Recent activity | activity rows | Subject + time | — |
| E10 | Dashboard | Return to the tab | `FocusRefresh` → `router.refresh()` | Figures refresh, **no Refresh button** | Check focus refresh on phone (app switch) |
| E11 | Dashboard | **Add a car** | `/office/car/new` | Form opens | — |
| E12 | Dashboard | Tap a stock card | filtered inventory | List filtered by that state | Check filter actually applies |

## F. Inventory (office) — `inventory/page.tsx` + `inventory-client.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| F1 | Inventory | **Search** | client filter on ref/name/colour | Narrows rows | — |
| F2 | Inventory | **Sort** | Newest / Price high→low / Price low→high / Profit high→low | Reorders | "Newest" relies on server order — verify |
| F3 | Inventory | **Page size** | selector | Rows per page changes | — |
| F4 | Inventory | **State chips** | All + owner states + Sold; zero-count hidden unless active | Filters | Chip counts computed from all rows |
| F5 | Inventory | **Add a car** | `/office/car/new` | Form | — |
| F6 | Inventory | Tap a row / **Edit** | `/office/car/[ref]` | Car form | — |
| F7 | Inventory | **Delete** on a row | `deleteCar` after confirm | Row disappears, **Undo for 8s**, then tombstone | Confirm dialog must name the car |
| F8 | Inventory | **Undo** within 8s | `undoDeleteCar` | Row returns, tombstone not created | After 8s the offer disappears |
| F9 | Inventory | **Clear-out list** (tombstones) | list view | Deleted cars held permanently | **Only the owner removes one** |
| F10 | Inventory | **Remove for good** on a tombstone | confirm → hard delete | Row gone permanently | Check confirm is explicit |
| F11 | Inventory | Filters match nothing | empty block + clear-filters | — | — |
| F12 | Inventory | Pagination | Prev / numbers / Next | — | — |
| F13 | Inventory | Phone layout | cards instead of table | Every action reachable | Check edit/delete not hidden behind hover |

## G. Car form — `/office/car/new`, `/office/car/[ref]` (`car-client.tsx`, ~2070 lines)

The same form for add and edit, five sections.

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| G1 | Car form | **Section 1 Details** | brand, model, trim, year, mileage, exterior/interior colour, features, price, was-price | Typed values held | — |
| G2 | Car form | **Reference** | `TS-####` on edit | Assigned once, never editable | On add it is absent until save |
| G3 | Car form | **Section 2 Photos** | upload / cover / remove | First photo is cover; order matters | 15 MB cap; EXIF stripped |
| G4 | Car form | **Upload photo** | `/api/upload` or `uploadCarPhoto` | Progress, then thumbnail | Check 15 MB refusal message |
| G5 | Car form | **Make cover** | `makeDraftCover` / reorder | Photo moves to position 0 | — |
| G6 | Car form | **Remove photo** | `removeDraftImage` | Photo leaves the list on save; the stored asset is left for the owner's cleanup | Check whether it disappears immediately or on save |
| G7 | Car form | **Section 3 Costs** | six cost lines | Live total + live profit while typing | Label: Estimated / Landed / Total by state |
| G8 | Car form | **Profit display** | recompute | Negative profit shown **without correction** | Check minus sign, not clamped to 0 |
| G9 | Car form | **Section 4 State** | primary picker (4 fixed) + secondary multi-select | Exactly one primary | Sold is a primary |
| G10 | Car form | **Mark as sold** | sets Sold, asks sale price + date | Save commits the sale | Nothing recorded until save |
| G11 | Car form | Un-mark sold | returns to **previous primary state** | Secondaries untouched | Check the previous state is restored, not defaulted |
| G12 | Car form | **Arrival note** | text | Shown to buyers on On-order cars | — |
| G13 | Car form | **Section 5 Private notes** | textarea | Never public | — |
| G14 | Car form | **Save** (add) | `createCar` | Creates car, assigns `TS-####`, change-check | If named state no longer exists → **ask owner to choose** |
| G15 | Car form | **Save** (edit) | `updateCar` | Persists | — |
| G16 | Car form | **Cancel** with changes | `clearCarDraft` then `/office/inventory` | Work should be recoverable | **No question — the device draft is erased (UX-008). The browser back button keeps it.** |
| G17 | Car form | **Delete** (edit only) | confirm → `deleteCar` | Undo 8s → tombstone | — |
| G18 | Car form | **Create from file** (PDF) | `/api/autofill` → review | Fills fields only, **never pictures** | If typed values exist: **Replace / Keep** |
| G19 | Car form | Device draft after reload | `device-draft` auto-restore | Draft survives reload, including photos; banner says it is kept | No prompt: the form restores itself. Check fields and photos return. |
| G20 | Car form | Leave with unsaved work | autosave | Draft offered on return | — |
| G21 | Car form | **Manage states** link | `/office/settings` | State editor | — |
| G22 | Car form | Phone layout | full page (not drawer) | Same fields | Tablet drawer, laptop inline |


## H. Enquiries (office) — `enquiries/page.tsx`, `enquiries-client.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| H1 | Enquiries | **Enquiries / Taps** tabs | `?tab=taps` | Server chooses the panel | — |
| H2 | Enquiries | **Enquiry template** | `/api/enquiry-template` | PDF downloads | Office-only download |
| H3 | Enquiries | **Create from file** | `/api/upload` | Rows become drafts; refusals named | Never creates enquiries directly |
| H4 | Enquiries | Board column | one per customer state | Cards grouped by state | Horizontal board on a phone |
| H5 | Enquiries | Tap a card | detail dialog | Opens the customer | — |
| H6 | Enquiries | **Phone** in detail | `tel:+234…` | Dialler opens | — |
| H7 | Enquiries | **WhatsApp them** | `wa.me` with name + ask | WhatsApp opens | Uses the number as stored |
| H8 | Enquiries | **Call** | `tel:` | Dialler | — |
| H9 | Enquiries | **Edit** | `/office/enquiries/[id]/edit` | Enquiry form | — |
| H10 | Enquiries | A **state pill** | `setEnquiryState` — writes immediately | State changes, toast says cars untouched | **No confirm, no undo** |
| H11 | Enquiries | **Taps** panel | full tap list, newest first | Page / car / time only | Marks seen on mount |
| H12 | Enquiries | Tap a car name in Taps | `/office/car/[ref]` | Car form | Falls back to the ref if the car is gone |
| H13 | Enquiries (edit) | **Save changes** | `updateEnquiry` | Saves; "Nothing changed." if identical | Field errors beside inputs |
| H14 | Enquiries (edit) | **Cancel** | `/office/enquiries` | Returns without saving | Check it warns / does not |

## I. Drafts — `drafts/page.tsx`, `drafts-client.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| I1 | Drafts | Batch header | file name + count | One batch per upload | — |
| I2 | Drafts | A draft card | fields read from the file | Missing fields say "not on the file" | — |
| I3 | Drafts | **Car state / Enquiry state** select | local choice | Car must choose one primary; enquiry may sit in none | Warning if the file's state is gone |
| I4 | Drafts | **Add pictures** | `uploadCarPhoto` → `addDraftImage`, per file | Survives reload, first is cover | 15 MB each; JPEG/PNG/WebP only |
| I5 | Drafts | **Make cover** (star) | `makeDraftCover` | Moves to position 0 | — |
| I6 | Drafts | **Remove photo** (×) | `removeDraftImage` | Removes the reference | Bytes left for cleanup |
| I7 | Drafts | **Edit** | `/office/drafts/car/[id]` or `.../enquiry/[id]` | Full editor | Car form in "draft" mode |
| I8 | Drafts | **Save as a car / enquiry** | `saveDraft` | Creates the record, mints `TS-####`, removes the draft | Refuses if the state is missing |
| I9 | Drafts | **Delete** | confirm dialog → `deleteDraftAction` | Draft gone; nothing created | **Permanent — no undo** |
| I10 | Drafts | Empty state | — | "No drafts are waiting" | — |
| I11 | Car draft editor | **Save as draft** | `saveDraftForm` intent=draft | Keeps waiting; incomplete allowed | — |
| I12 | Car draft editor | **Save car** | `saveDraftForm` intent=car | Creates the record | Judged like a normal save |
| I13 | Car draft editor | **Cancel** | `/office/drafts` | Back to drafts | Edit layer stays unless saved |
| I14 | Enquiry draft editor | **Save as draft / Save enquiry / Cancel** | same pattern | — | — |

## J. Activity log — `activity/page.tsx`, `activity-client.tsx`

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| J1 | Activity | **Search** | filters kind, words, subject, actor | Narrows the log | Placeholder says "car, ref or action" |
| J2 | Activity | **Type chips** | All / Cars / Enquiries / Money / Settings (whatever `CATEGORIES` holds) | Filters, each with a count | Counts are all entries, not filtered |
| J3 | Activity | **Clear filters** (empty state) | resets type + search | — | — |
| J4 | Activity | Tap a car ref | `/office/car/[ref]` | Car form | Only `car.*` subjects link |
| J5 | Activity | Read a row | kind + subject + time | Newest first, grouped by day | Log is read-only |

## K. Settings — `settings/page.tsx`, `settings-client.tsx`, editors

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| K1 | Settings | Sub-menu: **General / Car states / Customer states / Account** | in-place panel swap | No route change | Arrow keys move tabs |
| K2 | General | **WhatsApp number** field | live `normaliseNigerianMobile` | Valid/Invalid line, live preview | Save disabled until changed |
| K3 | General | **Save number** | `saveWhatsapp` | Stores `+234…`; every chat button follows | Refusal keeps the old number |
| K4 | General | **Tagline** field | counter /80 | Save stores trimmed | — |
| K5 | General | **Save tagline** | `saveTagline` | Home page updates | "Nothing changed." if identical |
| K6 | General | **Full tank** field | amount | Save stores the default | — |
| K7 | General | **Save default** | `saveFullTankDefault` | Prefills new cars | — |
| K8 | General | Reload with an unsaved card | device draft | Value restored; "unsaved change" | Base must still match the store |
| K9 | Car states | **Add a state** | `addCarState` | "New state" row, focused | Writes immediately |
| K10 | Car states | **Rename** (blur / Enter) | `renameCarState` | Commits; refusal reverts | Duplicate name refused |
| K11 | Car states | **Colour picker** | `recolourCarState` on blur | Swatch + label ink update | Native colour picker on phone |
| K12 | Car states | **Drag / ↑ ↓** | `reorderCarStates` | Order changes | **Touch has no reorder affordance** |
| K13 | Car states | **Delete (trash)** | `removeCarState` — immediately | Empty state deleted; occupied refused with count | **No confirmation** |
| K14 | Car states | Locked rows | four primaries | Drawn, not editable | — |
| K15 | Customer states | Add / rename / colour / reorder / delete | same five writes | All rows editable | Same touch gap and no-confirm delete |
| K16 | Account | **Change password** | `/office/account` | Provider's UserProfile | No in-app reset |
| K17 | Account | **System** notices | `readNotices` + `buildNotices` | Storage + backup status, honest when unreported | Depends on the daily job writing rows |
| K18 | Account | **Download the export** | `/api/export` | One ZIP to downloads | **Check iOS Safari honours `download`** |

## L. Door and account — sign-in / sign-out / account

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| L1 | Sign-in | Open `/office` with no session | redirect `/office/sign-in` | Clerk sign-in inside the office | No sign-up path |
| L2 | Sign-in | Sign in | Clerk | Lands in the office | Provider invite-only |
| L3 | Sign-in | Open `/office/sign-in` while active | redirect `/office` | — | — |
| L4 | Any office page | **Sign out** | `/office/sign-out` → Clerk | Clears device drafts, returns to the door | Open tabs refuse on next request |
| L5 | Account | **Back to the office** | `/office/settings` | — | — |
| L6 | Account | Provider profile controls | Clerk's `UserProfile` | Password change is the provider's | — |
| L7 | Office | Unknown address | office not-found | Office chrome + dashboard link | — |
| L8 | Office | A read throws | `app/office/error.tsx` or shell error | Retry control | No stack trace to the owner |

## M. Files and downloads

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| M1 | Inventory | **Car template** | `/api/template` | Blank PDF downloads | Office-only |
| M2 | Enquiries | **Enquiry template** | `/api/enquiry-template` | Blank PDF downloads | Office-only |
| M3 | Inventory / Enquiries | **Create from file** | `/api/upload` | Drafts + named refusals | 10 MB cap, PDF only |
| M4 | Car form | **Autofill from PDF** | `/api/autofill` | Fills fields; never pictures | Replace / Keep dialog if already typed |
| M5 | Settings | **Download the export** | `/api/export` | ZIP: master.json, CSVs, README | 401 with no session |

## N. System behaviour seen in the shell

| ID | Screen | Trigger | Calls / target | Expected | Risk note |
|---|---|---|---|---|---|
| N1 | Office | Go offline | `OfflineBanner` after 1.2s | Line shows; Save controls disabled | — |
| N2 | Office | Come back online with a draft | recovery line | "Your draft is still here — press Save." | — |
| N3 | Office | New tap arrives while away | dashboard refresh on focus | Badge count updates | No popup or sound |
| N4 | Office | View the Taps panel | `markTapsSeenAction` POST | Badge clears; glyph stays | — |
| N5 | Office | 12 hours idle / 7 days total | `checkOfficeSession` | Session ends; sign-in required | — |
| N6 | Office | 10 wrong passwords | — | Lockout for a bounded period | **No lockout code in this repo** |

