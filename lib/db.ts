import "server-only";
import { neon } from "@neondatabase/serverless";
import { getConfig } from "./config";

// The database is reachable only server-side; the connection string never
// reaches the browser (design D2). RLS is not the boundary — this module is.
let client: ReturnType<typeof neon> | null = null;

export function db() {
  if (!client) {
    // A database read is never served from a cache. The driver sends each query over HTTP, and
    // unless it opts out Next caches that response in its own Data Cache (measured 2026-10-13: the
    // entry carried `revalidate: 31536000` — a year). It is not theoretical: after the
    // rebuild-from-nothing, `npm run build` kept answering from rows the store no longer held, and
    // the public pages were rendered from a store that had not existed for hours. The store is the
    // truth (design D2) — a cached read of it is a stale figure, so every read opts out.
    client = neon(getConfig().databaseUrl, { fetchOptions: { cache: "no-store" } });
  }
  return client;
}
