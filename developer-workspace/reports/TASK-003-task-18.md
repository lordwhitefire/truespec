# TASK-003 — Task 18: the address branch goes, and the defect it uncovered

**Date:** 2026-10-13 · Task 18 of the plan (`task.md` truth: the public path emits no third-party
address; plan line 206: *"leak-check green on every public route; no `https?://` branch remains"*).

## The asked change

`lib/serialize.ts` no longer passes a `https?://` address through. `resolvePhotoUrl` derives the CDN
address from a Sanity asset id and nothing else; anything that is not an asset reference is
**refused by name**:

```
a photo row holds what is not a Sanity asset reference: https://images.unsplash.com/photo-…
```

Refusing rather than emitting the address is the point: the branch existed only because 24 leftover
rows held third-party addresses (interim 1). Task 20's rebuild left the store with **49 references
and 0 addresses**, so there is nothing left to pass through — and an address arriving again is an
invariant broken, which should fail loudly and not become a plausible-looking `<img src>`.
`lib/photos.test.ts` now pins the refusal (and still pins the derivation).

`leak-check` was extended, per the plan:

| watched | source | count today |
|---|---|---|
| forbidden field/kind tokens | `FORBIDDEN` (unchanged) | 18 |
| cost figures | the store's cost lines, formatted | 34 |
| **asset/file references** | `car_photo.sanity_asset_id`, `enquiry_pdf.sanity_asset_id` + `filename` | 51 |
| **customer detail** | every enquiry's `name`, `number`, `note` | 18 |
| **office state labels** | `car_state.label` values that are not one of the three section names | 3 (`On the way`, `At port`, `Cleared`) |

Its summary was also corrected: a route that fails to render is reported as *what did not render*,
separately from *what leaked*. It used to call a 5xx `forbidden content`, which is how a transient
Neon `ETIMEDOUT` 500 came to read as a leak earlier in this layer.

**Kept deliberately:** `lib/cleanup.ts` still tests `sanity_asset_id ~* '^https?://'`. That is not
the public path — it is the cleanup report's way of naming a row that holds an address, which is
exactly what it exists to say. The rule is "no address branch on the public path", not "the string
`https://` may never appear in the repository".

## The defect the change uncovered

Removing the branch put a guard on the derivation — and the guard failed the build:

```
Error: a photo row holds what is not a Sanity asset reference:
       https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=cro…
Error occurred prerendering page "/not-found". … exporting the build.
```

The store held **0 addresses** at that moment (verified directly: 49 `car_photo` rows, every value
`image-…`). So the build was reading rows the store did not hold. It was not the code, and not the
database — it was **Next's cache of the door's own reads**:

- `.next/cache/fetch-cache/` carried entries of kind `FETCH`, each with `revalidate: 31536000`
  (**one year**) and a base64 body that decodes to a Neon HTTP SQL response (`{"fields":[…],"rows":[…]}`);
- the driver (`@neondatabase/serverless@1.2.0`) sends every query over HTTP, so Next cached the
  response;
- the large entry (26 KB, written 15:42) was the photo query — it held the *pre-rebuild* rows, and
  the build answered from it.

So `npm run build` had been reporting `✓ Compiled successfully` while rendering the public pages
from a store that had not existed for hours. In dev the owner saw the truth; any `build`/`start`
deployment would have baked live figures for a year.

## The fix, and what it needed

1. **`lib/db.ts`** — the door opts every read out: `neon(url, { fetchOptions: { cache: "no-store" } })`.
   *Measured:* a clean build now leaves **0** entries in `fetch-cache` (was: the whole store's rows).
2. **The routes that read the store now say so.** With reads uncached, they can no longer be
   prerendered, and the build fails until they are declared:

   | route | declaration |
   |---|---|
   | `/`, `/inventory`, `/car/[ref]` | already `force-dynamic` |
   | `/privacy`, `/not-found` | on `app/(site)/layout.tsx` — the layout is what reads the store, and `/privacy` is a client page and cannot declare it itself |
   | `/office`, `/office/inventory`, `/office/car`, `/office/car/new`, `/office/settings` | each declares `force-dynamic` |

   `/office/activity`, `/office/enquiries` and `/office/login` read nothing and stay static (`○`) —
   correct, and now visible in the build output instead of hidden behind a cache.
3. **A standing gate: `scripts/store-freshness-check.ts`** (`npm run store-freshness`, run after
   `build`, before restarting dev). It reads `.next/prerender-manifest.json` and fails if any of the
   9 store-reading routes was prerendered, or if any fetch-cache entry holds a database response.
   It passed on the rebuilt tree:
   *"none of 9 store-reading route(s) was prerendered, and no database response was cached."*

## Declared: this is outside TASK-003's declared surface

`lib/db.ts`, `app/(site)/layout.tsx`, the five office pages, `package.json` and the new script are
**not** in TASK-003's plan. They were changed anyway, and this is the reason stated plainly: the
layer's own claim is that the store is the truth and the screens show it. A door that serves a
year-old read of the store makes that claim false, makes every gate in this layer untrustworthy, and
it was found only because the guard from the asked change happened to fire. The alternative —
reverting the guard or the door fix — would have left a known lie in place. Nothing else in those
files changed; no architecture moved.

## Verification (all run, none assumed)

| gate | result |
|---|---|
| `npm test` | **50/50**, 8 suites (the refusal test replaced the pass-through test) |
| `npm run typecheck` | clean |
| `npm run leak-check` | **PASSED** — 18 tokens · 34 cost values · 51 references · 18 customer values · 3 state labels, on all 26 public routes. It failed **once** first, on two `ETIMEDOUT` 500s from Neon (the known remote-store flake) — the run after passed, and three consecutive runs passed |
| `npm run build` | **exit 0** on a clean `.next`; verified route table (ƒ for every store-reading route, ○ for the three that read nothing) |
| `npm run store-freshness` | **PASSED** |
| `scripts/reconcile.ts` | **exit 0** — the office's rendered figures still equal the shared rule over the store |
| dev | restarted on `:3210`; `/`, `/office`, `/inventory` all 200; office inventory renders **17** rows, the store's own count |

**Not verified (stated, not glossed):** nothing here was checked on a deployed `next start`; the
route table is evidence from the build manifest, not a runtime observation of a production server.
