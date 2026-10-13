// Store freshness — the gate that keeps a cached read of the store from pretending to be the store.
//
// Why this exists (measured 2026-10-13): the Neon driver sends every query over HTTP, and Next
// cached those responses in its own Data Cache with `revalidate: 31536000` — a year. The
// consequence was not theoretical. After the rebuild-from-nothing, `npm run build` kept answering
// from rows the store had no longer held for hours; every public page was rendered from a store
// that did not exist, and the build still said "✓ Compiled successfully". A guard added in
// `lib/serialize.ts` was the only thing that noticed. `lib/db.ts` now opts every read out
// (`fetchOptions: { cache: "no-store" }`), and the routes that read the store declare themselves
// dynamic. This script is the standing check that both stay true.
//
// Run it straight after `npm run build` and before restarting dev (dev rewrites .next):
//
//   npm run build && node --import tsx scripts/store-freshness-check.ts
//
// It fails when either half is undone:
//   · a route that reads the store was prerendered into the build (a build-time snapshot of live
//     figures, served until the next build);
//   · a database response was written into the build's fetch cache (a read served from a cache
//     instead of the store).

import { existsSync, readFileSync, readdirSync } from "node:fs";

const MANIFEST = ".next/prerender-manifest.json";
const FETCH_CACHE = ".next/cache/fetch-cache";

// Every route that reads the store — the public site (the layout alone reads it) and the office
// pages that go through `lib/office.ts`. The office's activity, enquiries and login pages read
// nothing and are expected to stay static; they are deliberately not in this list.
const STORE_ROUTES = [
  "/",
  "/inventory",
  "/privacy",
  "/not-found",
  "/office",
  "/office/inventory",
  "/office/car",
  "/office/car/new",
  "/office/settings",
];

/** A Neon SQL response is JSON carrying the column list and/or the row count. */
function looksLikeADatabaseResponse(body: string): boolean {
  return /"rowCount"|"fields":\[|"command":"SELECT"/.test(body);
}

function main(): void {
  if (!existsSync(MANIFEST)) {
    console.error(
      "store-freshness: no production build found. Run this after `npm run build`, before dev.",
    );
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    routes?: Record<string, unknown>;
    dynamicRoutes?: Record<string, unknown>;
  };
  const prerendered = new Set([
    ...Object.keys(manifest.routes ?? {}),
    ...Object.keys(manifest.dynamicRoutes ?? {}),
  ]);

  const baked = STORE_ROUTES.filter((route) => prerendered.has(route));

  const cached: string[] = [];
  if (existsSync(FETCH_CACHE)) {
    for (const file of readdirSync(FETCH_CACHE)) {
      try {
        const entry = JSON.parse(readFileSync(`${FETCH_CACHE}/${file}`, "utf8")) as {
          data?: { body?: string };
        };
        const body = Buffer.from(entry.data?.body ?? "", "base64").toString("utf8");
        if (looksLikeADatabaseResponse(body)) cached.push(file);
      } catch {
        cached.push(file);
      }
    }
  }

  if (baked.length > 0 || cached.length > 0) {
    console.error("STORE FRESHNESS FAILED — the store is not what these pages would show.");
    for (const route of baked) {
      console.error(`  prerendered, but reads the store: ${route}`);
    }
    for (const file of cached) {
      console.error(`  a database response was cached: fetch-cache/${file}`);
    }
    process.exit(1);
  }

  console.log(
    `STORE FRESHNESS PASSED — none of ${STORE_ROUTES.length} store-reading route(s) was prerendered, ` +
      `and no database response was cached.`,
  );
}

main();
