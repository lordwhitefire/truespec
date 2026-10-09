# RECON-001 · Phase B1 (home + chrome) — verification

Date: 2026-10-09
Scope: port the reference chrome (header/nav/ticker/footer/fab) and the home screen
(`truespec.html`) into the app, matching the reference at 560/820/1100 × dark/light.

## What was built

- `app/reference.css` (new) — reference showroom CSS: chrome rules global; screen
  rules namespaced under `.sv` so not-yet-rebuilt screens keep their legacy styles.
  Collision resets for `.card/.chip/.tabs/.btn/.hero` only touch the home screen.
- `app/layout.tsx` — imported `./reference.css` after `./globals.css`; replaced the
  single dark `.band` header with the reference `.top` strip + sticky `.nav`
  (ticker + `ThemeToggle` + WhatsApp button) + reference `<footer>` + `.fab`.
- `components/site/Ticker.tsx` (new) — rotating nav ticker (3.8s, reduced-motion safe).
- `components/site/car-view.ts` (new) — `carTitle`, `carState`, `mileageLabel`, `heroPrice`, `carHref`.
- `components/site/ReferenceCard.tsx` (new) — the reference inventory card (`card(c,dk)`).
- `components/site/HeroSlider.tsx` (new) — available cars, dearest first, top 3, auto 5.5s.
- `components/site/FeaturedSlider.tsx` (new) — 1/2/3 per row (`<560/<1000`), dots + arrows.
- `components/site/HomeInventory.tsx` (new) — home grid (buyable = available + landed),
  live count, "Show all", and the return-bar "See what's new" view (via `ts-show-new`).
- `components/site/HomeBehaviors.tsx` (new) — ask panel answers, first-visit welcome modal,
  return bar, farewell exit intent, social-proof toast, "last car opened"; renders the
  shared `.ovl` modal + `.toast` slots.
- `components/site/store.ts`, `components/site/speak.ts` (new) — reference `store` and `speak`.
- `app/page.tsx` — rebuilt to the reference home body wrapped in `.sv`.

Data: reuses the existing public data layer (`getPublicCars`, `getSetting("whatsapp_number")`).
No hardcoded CARS. Ticker text is data-derived because app cars have no `note` month string.

## Verification (evidence)

- `npx tsc --noEmit` → exit 0.
- `GET /` → HTTP 200; HTML contains all sections (`sv`, `hero`, `ask`, inventory band,
  `sp`, `ovl`, `toast`, `fab`). Dev log: no error/warn/hydration lines.
- Screenshots (`developer-workspace/scripts/recon-shot.mjs`, system Chrome):
  - `/tmp/opencode/recon-chrome-1100-{dark,light}.png`, `recon-chrome-560-dark.png`
  - `/tmp/opencode/home-1100-{dark,light}.png`, `home-1100-first.png`, `home-560-dark.png`
- Gemini vision (REST, `vision.mjs`) verdicts:
  - 1100 dark — all 8 sections present and styled; none missing/broken/unstyled.
  - 1100 light — light content (hero/grid/boxes/why/about) with dark text; band, featured
    cards and footer stay dark; no unreadable element.
  - 1100 first visit — welcome modal centred and styled ("What are you after?", avatar,
    four buttons); hero visible behind.
  - 560 dark — grid single column; info boxes stacked; hero readable; no overflow.
    Featured shows 2 cards at exactly 560 — matches the reference (`per()` uses strict `<560`).

## Not done / carried forward

- Featured shows 2 at exactly 560px — reference behaviour, not a defect.
- Home tab links point at `/inventory?status=a|o|l` (reference `go()`); the inventory
  page does not yet read `status` — wired in Phase B2.
- Reference ticker month text ("landed in <month> <year>") is data-dependent; app data
  has no such field, so lines are derived from section + `arrivalNote`.
- Inventory and car pages are still legacy; Phase B2/B3 rebuild them.
