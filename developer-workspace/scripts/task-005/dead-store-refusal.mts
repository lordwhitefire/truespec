/**
 * TASK-005 task 3 — the forced failure, live (the task's own verify).
 *
 * The claim: **a store failure comes back as a refusal, never a throw.** This points the store
 * somewhere it cannot work, calls the new write wrapper exactly as an action does, and reports which
 * of the two happened — plus which of the two clauses the person is given.
 *
 * Nothing is written and the live store is not touched: the run never connects, and the config here
 * is set in-script rather than read from `.env.local`, so it cannot reach the real database.
 *
 * One URL per process, because `lib/db.ts` builds its client once (a deliberate singleton —
 * `lib/config.ts` caches too). So the two cases are two runs:
 *
 *   # 1. the store cannot be reached  → the transient clause, and a retry is right
 *   node --conditions=react-server --import tsx \
 *     developer-workspace/scripts/task-005/dead-store-refusal.mts \
 *     "postgresql://dead:dead@dead-store.invalid/dead" unreached
 *
 *   # 2. the call itself is refused    → the permanent clause, and a retry is NOT offered
 *   node --conditions=react-server --import tsx \
 *     developer-workspace/scripts/task-005/dead-store-refusal.mts \
 *     "postgresql://dead:dead@127.0.0.1:9/dead" refused
 *
 * `--conditions=react-server` is what lets `server-only` resolve (Next's own condition); without it
 * the import of `lib/store-guard` refuses to load outside a server component — that guard doing its
 * job.
 *
 * Observed while writing this (2026-10-17): the Neon HTTP driver does **not** fetch the host it is
 * given — it derives its own API host from the connection string, and `127.0.0.1:9` becomes
 * `https://api.0.0.1/sql`, which fails as `ERR_INVALID_URL` (permanent, not transient). That is why
 * case 1 uses a hostname that cannot resolve: it is what produces the real `fetch failed` a cold
 * compute produces.
 */

const url = process.argv[2];
const expect = process.argv[3]; // "unreached" | "refused"

if (!url || (expect !== "unreached" && expect !== "refused")) {
  console.error("usage: dead-store-refusal.mts <postgres-url> <unreached|refused>");
  process.exit(2);
}

// The store, pointed somewhere it cannot work. The other values only have to satisfy
// `lib/config.ts`'s fail-loud check; none of them is used by this run.
process.env.DATABASE_URL = url;
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_dead";
process.env.CLERK_SECRET_KEY = "sk_test_dead";
process.env.SANITY_PROJECT_ID = "dead";
process.env.SANITY_DATASET = "dead";
process.env.SANITY_TOKEN = "dead";
process.env.SESSION_SECRET = "dead-dead-dead-dead";

const { storeQueryRefusing } = await import("../../../lib/store-guard");

const started = Date.now();
let threw: unknown = null;
let result: unknown = null;

try {
  result = await storeQueryRefusing("SELECT 1 AS one", [], {
    field: "carId",
    action: "That car could not be deleted",
  });
} catch (error) {
  threw = error;
}

const ms = Date.now() - started;
const outcome = threw ? "THREW" : "REFUSED";
const refusal = result as { ok: false; errors: { field: string; message: string }[] } | null;
const message = refusal?.errors?.[0]?.message ?? null;

console.log(JSON.stringify({ case: expect, outcome, ms, message, threw: threw ? String(threw) : null }, null, 2));

const wantUnreached = expect === "unreached";
const clauseOk = wantUnreached
  ? message !== null && /could not be reached/.test(message) && /Try again/.test(message)
  : message !== null && /refused that change/.test(message) && !/Try again/.test(message);

if (outcome !== "REFUSED") {
  console.error(`\nFAIL — the store failure was thrown, not refused (${String(threw)}).`);
  process.exit(1);
}
if (!clauseOk) {
  console.error(`\nFAIL — expected the "${expect}" clause; the message was: ${message}`);
  process.exit(1);
}

console.log(`\nPASS — refused in place, never thrown: "${message}"`);
