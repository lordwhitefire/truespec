import "server-only";
import { neon } from "@neondatabase/serverless";
import { ConfigError, getConfig } from "./config";

// The database is reachable only server-side; the connection string never
// reaches the browser (design D2). RLS is not the boundary — this module is.
//
// There are two clients and no fallback between them. `mainDb()` is the owner's
// store and the public showroom. `demoDb()` is the practice branch. A missing or
// malformed demo URL is a configuration error, never the main client.
let mainClient: ReturnType<typeof neon> | null = null;
let demoClient: ReturnType<typeof neon> | null = null;

function requirePostgresUrl(value: string | null | undefined, name: string): string {
  if (value === undefined || value === null || value.trim() === "") {
    throw new ConfigError(`${name} is missing. The demo space is not configured.`);
  }

  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConfigError(`${name} is not a valid postgresql:// connection string.`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new ConfigError(`${name} is not a valid postgresql:// connection string.`);
  }
  if (!parsed.hostname) {
    throw new ConfigError(`${name} is not a valid postgresql:// connection string.`);
  }

  return trimmed;
}

/** The owner's store and the public showroom. Always main. */
export function mainDb() {
  if (!mainClient) {
    // A database read is never served from a cache. The driver sends each query over HTTP, and
    // unless it opts out Next caches that response in its own Data Cache (measured 2026-10-13: the
    // entry carried `revalidate: 31536000` — a year). It is not theoretical: after the
    // rebuild-from-nothing, `npm run build` kept answering from rows the store no longer held, and
    // the public pages were rendered from a store that had not existed for hours. The store is the
    // truth (design D2) — a cached read of it is a stale figure, so every read opts out.
    mainClient = neon(getConfig().databaseUrl, { fetchOptions: { cache: "no-store" } });
  }
  return mainClient;
}

/**
 * The demo branch. One direct URL, used by both the app and the reset.
 *
 * Missing, empty or malformed is a `ConfigError`. There is no catch and no fallback
 * to main: a non-main account must get a configuration error, not the owner's data.
 */
export function demoDb() {
  if (!demoClient) {
    const url = requirePostgresUrl(getConfig().demoDatabaseUrl, "DEMO_DATABASE_URL");
    demoClient = neon(url, { fetchOptions: { cache: "no-store" } });
  }
  return demoClient;
}

/** The old single-client name, kept as a main-only alias for existing scripts. */
export function db() {
  return mainDb();
}

/** Test seam: drop both clients so a new environment can be read. */
export const __resetDbCacheForTests = () => {
  mainClient = null;
  demoClient = null;
};
