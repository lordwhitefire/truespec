# 01 — Every surface and every state (the matrix)

**Written:** 2026-10-16, during **R1.1** of `../research-plan.md`.  
**Source:** Explore session `ses_eb7d50a05ffeP20r4CfR67RM2F` (source-level read-only).  
**Method:** M1 (persist before continuing), M2 (one Explore session resumed), M7 (cite file:line).

This is the map every later phase walks. It lists every navigable surface, the component files behind it (≥2 import levels), which UI states exist in the code, any unfinished controls, and width-dependent code. API routes are listed separately (no UI surface). Global infrastructure is listed once.

---

## 1. Matrix summary

| Surface | Route | Kind | Key states present | Notes |
|---|---|---|---|---|
| Home | `/` `(site)/page.tsx` | Showroom (public) | loading (via global `app/loading.tsx`), toast feedback | Uses sliders, ticker, lightbox behaviours via `HomeBehaviors.tsx`. |
| Inventory (public) | `/inventory` | Showroom | loading, **empty** ("No cars match your filters"), toast | Client-side filtering; no modals. |
| Car detail | `/car/[ref]` | Showroom | loading, missing → `notFound()`, sold view (read-only), **dialog/overlay** (lightbox), toast | Gallery has touch swipe; CSS at `app/(site)/car/car.css`. |
| Privacy | `/privacy` | Showroom (static) | none (static) | Pure server component. |
| Not-found (site) | `/not-found` | Showroom | none | Page + global `app/not-found.tsx` exist. |
| Sign-in | `/office/sign-in` | Office (Clerk) | Clerk-managed (loading/error/validation) | `<SignIn />`, `app/office/door.css`. |
| Account | `/office/account` | Office (Clerk) | Clerk-managed | `<UserProfile />`. |
| Sign-out | `/office/sign-out` | Office | immediate redirect | Client calls `signOut()` → `/office/sign-in`. |
| Dashboard | `/office` | Office (shell) | loading (`office/loading.tsx`), **empty** (no recent activity/taps) | Shell chrome (sidebar/topbar/bottom nav). |
| Inventory (office) | `/office/inventory` | Office (shell) | loading, **empty**, **dialog/confirm** (delete), **toast**, **undo** (8s on delete) | Has tombstones panel. |
| Car list redirect | `/office/car` | Office (shell) | server redirect → `/office/inventory` | No UI. |
| Car new | `/office/car/new` | Office (shell) | loading, forms/validation, dialog/confirm, toast, undo (stub) | Uses shared `CarClient`. |
| Car edit/detail | `/office/car/[ref]` | Office (shell) | loading, missing → `notFound()`, forms/validation, **dialog/confirm** (delete), toast, undo (stub) | Large form; mobile minibar. |
| Drafts | `/office/drafts` | Office (shell) | loading, **empty**, **dialog/confirm** (discard), toast | Promote/discard actions. |
| Enquiries | `/office/enquiries` | Office (shell) | loading, empty columns, **dialog/overlay** (detail modal), toast, drag/drop | Kanban board (horizontal scroll at narrow widths). |
| Activity | `/office/activity` | Office (shell) | loading, **empty**, forms | Filterable audit log. |
| Settings | `/office/settings` | Office (shell) | loading, forms/validation, toast | Tabbed UI with sub-editors (registry, car/enquiry states, colours). |

API routes (no UI surface): `/api/export`, `/api/tap`, `/api/template`, `/api/upload`.

Global infra (no navigable page): `app/layout.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/office/layout.tsx`, `app/office/loading.tsx`, `app/office/error.tsx`, shell layout `app/office/(shell)/layout.tsx`.

---

## 2. Global (once-only)

**Shared toast setup**
- No global `<Toaster>` (no sonner). Hand-rolled toasts per surface.
  - Showroom: `#toast` element (e.g. `app/(site)/page.tsx:95-98`; `components/site/HomeBehaviors.tsx:47-53,93-95,101-103`). Car detail uses `#stoast`, `#ptoast` (`app/(site)/car/[ref]/page.tsx:15-21`, `components/site/CarBehaviors.tsx:186-210`).
  - Office: `.toast` + `.show` via `showToast()` (e.g. `app/office/(shell)/inventory/inventory-client.tsx:192-209`, `app/office/(shell)/car/car-client.tsx:1128-1134`, `app/office/(shell)/settings/settings-client.tsx:70-88`).
- No `sonner` in `package.json` (`package.json`).

**Retryable state / error boundaries**
- `components/retryable.tsx:1-32` — client; "We couldn’t load this" + "Try again", calls `onRetry()` from error boundary reset.
- `components/store-waking.tsx:1-31` — server; "Just a moment" + "Setting things up", spinner, fade-in with `prefers-reduced-motion` aware (`STORE_STATE_CSS`).
- `components/store-state-styles.ts:1-35` — inlined styles for wait/retry (dark/light via `html[data-theme]`).
- Boundaries: `app/error.tsx:1-12` uses `<Retryable onRetry={() => reset()} />`; `app/office/error.tsx:1-11` same. **No route-level `error.tsx` files** under `(site)` or `office/(shell)` segments (missing on inventory, car/[ref], dashboard, drafts, enquiries, activity, settings, etc.). This matches the verification debt noted in `03-spec-demands.md` (§6) — the "503 paths"/route-level error boundaries are **not** present per route segment.

**Middleware**
- `middleware.ts:1-10` — `clerkMiddleware()` with standard matcher; no custom route guards (office protection via `lib/session.ts` helpers).

**Global providers**
- `app/layout.tsx:1-41` — wraps with `<ClerkProvider>`, injects theme-init script (sets `html[data-theme]` from localStorage before paint), imports `./globals.css`, `./reference.css`. No other global providers (no offline provider mounted at root).

**Session helpers**
- `lib/session.ts:1-21` — `getOfficeSession()` (returns session or `{error:'UNAUTHORIZED'}` for JSON handlers), `requireOfficeSession()` (redirects to sign-in/sign-out paths).

**WhatsApp utilities**
- `components/whatsapp.ts:1-11` — exports `waLink()` and `carWaLink()`. Usage: `app/(site)/car/[ref]/page.tsx:78` uses `carWaLink(...)`; `components/site/HomeBehaviors.tsx`, `components/site/InventoryBrowser.tsx`, `components/site/WhatsAppGate.tsx` use them. WhatsAppGate records taps to `/api/tap`.

---

## 3. Showroom surfaces (S1–S5)

### S1. Home — `/` (`app/(site)/page.tsx:1-99`)
**Components (≥2 levels):** `HeroSlider.tsx:1-71`, `FeaturedSlider.tsx:1-77`, `Ticker.tsx:1-47`, `HomeBehaviors.tsx:1-130`, `HomeInventory.tsx:1-61`, `components/CarCard.tsx:1-47`, `components/site/SiteFab.tsx:1-14`.
**States:** loading via global `app/loading.tsx` → `StoreWaking()`; toast via `#toast` (HomeBehaviors). No explicit empty/error UI in page (global boundaries apply). Forms/fields: none. Dialog/overlay: lightbox behavior in HomeBehaviors (uses `.lb`, `.lb-img`, `.lb-cap`).
**Unfinished:** none obvious.
**Width-dependent:** `FeaturedSlider.tsx:13-19,21-32` uses `innerWidth < 560/1000` to set visible count; `Ticker.tsx` respects `prefers-reduced-motion`; CSS breakpoints in `reference.css`/`globals.css`.

### S2. Inventory (public) — `/inventory` (`app/(site)/inventory/page.tsx:1-26`)
**Components:** `components/site/InventoryBrowser.tsx:1-215`.
**States:** loading (global), **empty** ("No cars match your filters", lines ~200-204), toast via `#toast`. Client-side filters/sort/view; no modals.
**Unfinished:** none obvious.
**Width-dependent:** responsive via CSS; no `innerWidth` reads in browser.

### S3. Car detail — `/car/[ref]` (`app/(site)/car/[ref]/page.tsx:1-130`)
**Components:** `components/Gallery.tsx:1-31`, `components/site/CarBehaviors.tsx:1-255`.
**States:** loading (global), missing → `notFound()` (line ~49), **sold view** (read-only notice, WA disabled, lines ~56-70), **dialog/overlay** (lightbox `.lb` with ESC/close), toast `#stoast/#ptoast`. No forms.
**Unfinished:** none obvious.
**Width-dependent:** Gallery touch swipe (`Gallery.tsx:19-25`, `CarBehaviors.tsx:235-244`); `app/(site)/car/car.css:182,186,193` has 1000px/820px/560px breakpoints.

### S4. Privacy — `/privacy` (`app/(site)/privacy/page.tsx:1-43`)
**Components:** static server component.
**States:** none.  
**Width-dependent:** `app/(site)/privacy/privacy.css:133` has `max-width: 560px`.

### S5. Not-found (site) — `/not-found` (`app/(site)/not-found/page.tsx:1-38`) + global `app/not-found.tsx:1-29`
**Components:** static page (site) and client global not-found.  
**States:** none (links only).  
**Width-dependent:** `app/(site)/not-found/not-found.css:89` has `max-width: 560px`.

---

## 4. Office non-shell (O1–O3)

### O1. Sign-in — `/office/sign-in` (`app/office/sign-in/[[...sign-in]]/page.tsx:1-9`)
Uses Clerk `<SignIn />`; CSS `app/office/door.css`. Clerk-managed states.

### O2. Account — `/office/account` (`app/office/account/[[...account]]/page.tsx:1-9`)
Uses Clerk `<UserProfile />`; CSS `../door.css`. Clerk-managed states.

### O3. Sign-out — `/office/sign-out` (`app/office/sign-out/page.tsx:1-11`)
Client: `useClerk()` + `useRouter()` calls `signOut()` and redirects to `/office/sign-in`. No UI states shown.

---

## 5. Office shell (O4–O12)

Shell: `app/office/(shell)/layout.tsx:1-62` provides sidebar/topbar/bottom nav, imports `./office.css`. Uses `OfficeNav`, `OfficeTopbar`, `OfficeBottomNav`, `TapBadge`, `MarkTapsSeen`, `ThemeToggle`.

### O4. Dashboard — `/office` (`app/office/(shell)/page.tsx:1-155`)
**States:** loading (`office/loading.tsx`), **empty** ("No recent activity yet", "No WhatsApp taps yet", lines ~121-126). No forms/dialogs.  
**Width-dependent:** `office.css` breakpoints 1000px/820px/560px (kpis stack, sidebar hidden/topbar shown/bottom nav shown at 820px).

### O5. Inventory (office) — `/office/inventory` (`page.tsx:1-46`, `inventory-client.tsx:1-232`)
**Components:** `tombstones.tsx:1-47`.  
**States:** loading, **empty** ("No cars match your filters"/`.empty2`, lines ~215-226), **dialog/confirm** (delete modal `.ovl/.mdl`, lines ~130-162), **toast** via `showToast()` (undo toast line ~206), **undo** (8s window with Undo button). Forms/fields (search, selects, chips).  
**Unfinished:** none obvious in client.  
**Width-dependent:** `inventory.css:169-179` at 820px hides table, shows cards, shows `.bnav`; 560px stacks toolbar.

### O6. Car redirect — `/office/car` (`page.tsx:1-5`)
Server `redirect()` to `/office/inventory`. No UI.

### O7. Car new — `/office/car/new` (`page.tsx:1-13`)
Uses shared `CarClient` (`app/office/(shell)/car/car-client.tsx:1-1288`). Shares states with O8.

### O8. Car edit — `/office/car/[ref]` (`page.tsx:1-22`, `car-client.tsx:1-1288`)
**States:** loading (`office/loading.tsx`), missing → `notFound()` (page), forms/validation (comprehensive), **dialog/confirm** (delete modal lines ~1190-1225), **toast** (`showToast()` lines ~1128-1134), **undo** (stub). Delete flow shows "Car deleted (demo)." and has hidden `#tundo` button with no wired handler (lines ~1216-1221).  
**Unfinished controls (explicit):** car delete flow is **stub** — "Car deleted (demo)." only, Undo button exists but hidden/unhandled (`car-client.tsx:1216-1221`).  
**Width-dependent:** `car.css:156-161,1150px` stacks cols (aside order -1), 820px shows `.mbar` and `.bnav`.

### O9. Drafts — `/office/drafts` (`page.tsx:1-21`, `drafts-client.tsx:1-148`)
**States:** loading, **empty** (`.empty2`, lines ~126-139), **dialog/confirm** (discard modal `.ovl/.mdl`, lines ~91-119), **toast** on promote/discard (lines ~57-73).  
**Width-dependent:** `drafts.css` 820px shows `.bnav`.

### O10. Enquiries — `/office/enquiries` (`page.tsx:1-21`, `enquiries-client.tsx:1-220`)
**States:** loading, empty columns, **dialog/overlay** (detail modal `.ovl.enqdet`, lines ~176-213), **toast** (lines ~51-67), drag/drop state changes.  
**Width-dependent:** `enquiries.css` 1180px horizontal scroll for board; 820px shows `.bnav`.

### O11. Activity — `/office/activity` (`page.tsx:1-21`, `activity-client.tsx:1-155`)
**States:** loading, **empty** ("No activity yet", lines ~133-147), forms (filters).  
**Width-dependent:** `activity.css` 820px stacks filters, shows `.bnav`.

### O12. Settings — `/office/settings` (`page.tsx:1-19`, `settings-client.tsx:1-264`)
**Components:** `settings/registry-editor.tsx`, `settings/car-state-editor.tsx`, `settings/enquiry-state-editor.tsx`, `settings/colour.ts`.  
**States:** loading, forms/validation, **toast** (lines ~70-88). Tabbed UI (General, Car states, Enquiry states, Colours/registry).  
**Width-dependent:** `settings.css` 820px tabs wrap/stack, shows `.bnav`.

---

## 6. API routes (A1–A4)

- `app/api/export/route.ts` — GET (export). Uses office session (`getOfficeSession()`); returns 401 if unauthorized. No UI.
- `app/api/tap/route.ts` — POST (record WhatsApp tap). Called by `WhatsAppGate.tsx`. No UI.
- `app/api/template/route.ts` — template operations (settings uploads template). Auth required. No UI.
- `app/api/upload/route.ts` — POST (photo upload). Called via `uploadPhoto` action/car form. Auth required. No UI.

---

## 7. Extras found (not navigable page surfaces)

**Global infra:** `app/layout.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/office/layout.tsx`, `app/office/loading.tsx`, `app/office/error.tsx`, `app/office/(shell)/layout.tsx`.  
**Route extras:** `app/office/(shell)/car/page.tsx` (redirect). `(site)/not-found/page.tsx` exists alongside global `app/not-found.tsx`.  
**Components/utilities:** `components/store-waking.tsx`, `components/retryable.tsx`, `components/store-state-styles.ts`, `components/Photo.tsx`, `components/site/car-view.ts`, `components/site/speak.ts`, `components/site/store.ts`, office shell components (`OfficeNav`, `OfficeTopbar`, `OfficeBottomNav`, `TapBadge`, `TapNotice`, `MarkTapsSeen`, `FocusRefresh`, `CreateFromFile.tsx`), settings sub-editors, `inventory/tombstones.tsx`, server actions under `app/office/actions/*.ts`.  
**CSS:** `globals.css`, `reference.css`, many page-specific CSS files (cited per surface).  
**Other:** `ThemeToggle.tsx` used in shell.

---

## 8. Unfinished controls (summary)

- **Dead Search button** — `components/office/OfficeTopbar.tsx:29` has `aria-label="Search (UI placeholder)"` with no handler (already flagged in Q-001; ruled for removal in this layer).
- **Car delete flow (stub)** — `app/office/(shell)/car/car-client.tsx:1216-1221`: after delete shows "Car deleted (demo)." toast and sets `#tundo.hidden=false`, but **no event listener is wired** to the Undo button. This is an unfinished control.
- No other obvious "placeholder/TODO" unfinished controls surfaced in this inventory.

---

## 9. States coverage (by surface)

Loading exists everywhere via segment `loading.tsx` (`StoreWaking()`). Empty states are explicit in: public inventory, office dashboard, office inventory, drafts, activity (and enquiries shows empty columns). Dialog/overlay/confirm exists in: car detail (lightbox), office inventory (delete), car form (delete), drafts (discard), enquiries (detail). Toast/feedback exists on many write actions across showroom (WA/share) and office (save/delete/promote/discard/state change). **Undo** exists as 8s window on office inventory delete only; on car form delete it is a **stub** (button present but unhandled). Validation exists on office car form and settings forms; Clerk handles auth forms. Missing data routes to `notFound()` (car detail public/office). Sold car renders read-only view.

This matrix is complete against the enumerated routes and matches the codebase as read.