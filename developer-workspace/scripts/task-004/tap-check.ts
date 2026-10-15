/**
 * Proves the tap (truth 8; `specs/dashboard`, `testing.md` §9): **a buyer's WhatsApp tap records the
 * page, the car's reference and the time — and nothing else.**
 *
 * The write is the **real function** the Route Handler calls (`lib/tap.ts`'s `recordTap`), and the
 * handler is the **real handler** (`app/api/tap/route.ts`'s `POST`), imported and driven with real
 * `Request` objects — not a copy of their SQL or their checks, which could drift from them.
 *
 * **This witness writes, and removes exactly what it wrote.** It uses pages under `/__witness/`,
 * which no page of this site can be, and deletes by those pages in a `finally`; the tap count is
 * checked back at the end, so a run that leaves a row behind fails. It never deletes by a pattern.
 *
 * What is claimed:
 *
 *   1. `recordTap` writes the row: the page, the reference, and the time;
 *   2. the row's columns are exactly `id`, `page`, `car_ref`, `at` — the three facts and the
 *      generated key, so there is no column a person could be held in;
 *   3. the time is the **store's own clock**, not a caller's: nothing in the API can set it;
 *   4. a general tap (no car) stores a null reference and still says which page it was on;
 *   5. `getOfficeTapCount()` is exactly the number of rows in `tap` — the figure the badge shows
 *      counts no tap the office never received and misses none it did (`testing.md` §9);
 *   6. a POST with **no** `Origin` is refused (403) and writes nothing — the bootleg case;
 *   7. a POST from **another** origin is refused (403) and writes nothing;
 *   8. a same-origin POST records the tap (204) — and every extra field a caller sends (a name, a
 *      number, a message, an address, an address-of-a-visitor) is dropped: the row holds the page
 *      and the reference and nothing else;
 *   9. a body that is not a tap is refused (422) and writes nothing;
 *  10. the origin is checked **before** the body — a foreign POST carrying junk is refused as 403;
 *  11. the route exports `POST` and **no GET**: no GET can change data (task.md line 253);
 *  12. the store is the size it was: exactly the witness's own rows are gone.
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/tap-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { getOfficeTapCount } from "../../../lib/office";
import { recordTap } from "../../../lib/tap";
import * as tapRoute from "../../../app/api/tap/route";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** Pages no page of this site can be, so the cleanup can name precisely what it removes. */
const PAGE_GENERAL = "/__witness/tap-general";
const PAGE_CAR = "/__witness/tap-car";
const PAGE_HTTP = "/__witness/tap-http";
const PAGE_EXTRA = "/__witness/tap-extra";
const PAGES = [PAGE_GENERAL, PAGE_CAR, PAGE_HTTP, PAGE_EXTRA];

const HOST = "truespec.test";
const ORIGIN = "https://truespec.test";

/** A POST just as a browser would send it, with the headers under the witness's control. */
function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://truespec.test/api/tap", {
    method: "POST",
    headers: { host: HOST, ...headers },
    body: JSON.stringify(body),
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const startedAt = Date.now();
  const count = async () => Number((await client.query("SELECT count(*) AS n FROM tap")).rows[0].n);
  const clean = async () => {
    await client.query("DELETE FROM tap WHERE page = ANY($1::text[])", [PAGES]);
  };
  const row = async (page: string) =>
    (await client.query(`SELECT * FROM tap WHERE page = $1`, [page])).rows[0] as
      | Record<string, unknown>
      | undefined;

  const start = await count();
  try {
    await clean(); // in case an interrupted earlier run left rows behind
    const mid = await count();
    if (mid !== start) console.log(`  note  cleaned ${mid - start} leftover witness row(s)`);
    if (start !== 0) {
      console.log(`  note  the store already holds ${start} tap(s) — the count is asserted against the store, not against a fixed figure`);
    }

    // A real car, so a car tap names a reference the showroom does.
    const car = (
      await client.query<{ ref: string }>("SELECT ref FROM car WHERE deleted_at IS NULL ORDER BY ref LIMIT 1")
    ).rows[0];
    if (!car) throw new Error("no live car in the store — nothing for a car tap to name");

    // ------------------------------------------------------------- the write (truth 8) ---
    await recordTap({ page: PAGE_GENERAL, carRef: null });
    await recordTap({ page: PAGE_CAR, carRef: car.ref });

    const general = await row(PAGE_GENERAL);
    const onCar = await row(PAGE_CAR);
    ok("a tap is written", Boolean(general) && Boolean(onCar));

    ok("the general tap stores the page it was on and no car", general?.page === PAGE_GENERAL && general?.car_ref === null);
    ok("a car tap stores the page and the reference it named", onCar?.page === PAGE_CAR && onCar?.car_ref === car.ref, String(onCar?.car_ref));

    // three facts and nothing else — read from the row the store handed back
    ok(
      "the row holds exactly the three facts and the generated key",
      JSON.stringify(Object.keys(general ?? {}).sort()) === JSON.stringify(["at", "car_ref", "id", "page"]),
      Object.keys(general ?? {}).sort().join(", "),
    );

    const columns = (
      await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'tap' ORDER BY column_name`,
      )
    ).rows.map((r) => r.column_name);
    ok(
      "the table itself has no column a person could be held in",
      JSON.stringify(columns) === JSON.stringify(["at", "car_ref", "id", "page"]),
      columns.join(", "),
    );

    const at = general ? new Date(general.at as string | Date).getTime() : 0;
    ok(
      "the time is the store's own clock, stamped at the write",
      at >= startedAt - 5_000 && at <= Date.now() + 5_000,
      general ? String(general.at) : "no row",
    );

    // ------------------------------------------------------------- the figure (truth 8) ---
    const storeCount = await count();
    const badge = await getOfficeTapCount();
    ok("the badge's figure is exactly the rows the office holds", badge === storeCount, `${badge} vs ${storeCount}`);

    // ------------------------------------------------------- the handler's door (truth 8) ---
    const beforeRefusals = await count();

    const noOrigin = await tapRoute.POST(post({ page: PAGE_HTTP, carRef: null }));
    ok("a bootleg POST with no origin is refused", noOrigin.status === 403, String(noOrigin.status));
    ok("and writes nothing", (await count()) === beforeRefusals, `${await count()}`);

    const foreign = await tapRoute.POST(post({ page: PAGE_HTTP, carRef: null }, { origin: "https://evil.test" }));
    ok("a POST from another origin is refused", foreign.status === 403, String(foreign.status));
    ok("and writes nothing", (await count()) === beforeRefusals, `${await count()}`);

    const junkForeign = await tapRoute.POST(post({ page: "not-a-path" }, { origin: "https://evil.test" }));
    ok("the origin is checked before the body", junkForeign.status === 403, String(junkForeign.status));

    const accepted = await tapRoute.POST(post({ page: PAGE_HTTP, carRef: car.ref }, { origin: ORIGIN }));
    ok("a same-origin POST records the tap", accepted.status === 204, String(accepted.status));
    const http = await row(PAGE_HTTP);
    ok("and the row is the page and the reference", http?.page === PAGE_HTTP && http?.car_ref === car.ref, `${http?.page} / ${http?.car_ref}`);

    const withExtras = await tapRoute.POST(
      post(
        {
          page: PAGE_EXTRA,
          carRef: null,
          name: "Ada",
          number: "+234 800 000 0000",
          message: "is it still available?",
          address: "12 Marina, Lagos",
          ip: "203.0.113.9",
          email: "ada@example.com",
        },
        { origin: ORIGIN },
      ),
    );
    ok("a POST carrying extras is still accepted", withExtras.status === 204, String(withExtras.status));
    const extra = await row(PAGE_EXTRA);
    ok(
      "and the extras are nowhere — the row is the page, no car, and the store's time",
      extra !== undefined &&
        JSON.stringify(Object.keys(extra).sort()) === JSON.stringify(["at", "car_ref", "id", "page"]) &&
        extra.car_ref === null,
      JSON.stringify(extra),
    );
    const serialised = JSON.stringify(extra ?? {});
    ok(
      "no name, number, message, address or visitor address survived",
      !/Ada|234|available|Marina|203\.0\.113\.9|ada@example\.com/.test(serialised),
      serialised,
    );

    const badBody = await tapRoute.POST(post({ page: "https://evil.test/path" }, { origin: ORIGIN }));
    ok("a body that is not a page is refused", badBody.status === 422, String(badBody.status));

    const badRef = await tapRoute.POST(post({ page: PAGE_HTTP, carRef: "TS-1" }, { origin: ORIGIN }));
    ok("a car reference that is not one of ours is refused", badRef.status === 422, String(badRef.status));

    const notJson = await tapRoute.POST(
      new Request("https://truespec.test/api/tap", {
        method: "POST",
        headers: { host: HOST, origin: ORIGIN, "content-type": "application/json" },
        body: "{not json",
      }),
    );
    ok("a body that is not JSON at all is refused", notJson.status === 422, String(notJson.status));

    ok("the refusals wrote nothing", (await count()) === beforeRefusals + 2, `${await count()} vs ${beforeRefusals + 2}`);

    // ------------------------------------------------- the route's shape (task.md line 253) ---
    ok("the route exports POST", typeof tapRoute.POST === "function");
    const methods = Object.keys(tapRoute).filter((k) => k !== "POST");
    ok("and exports no GET — no GET can change data", !methods.includes("GET"), methods.join(", ") || "none");
  } finally {
    await clean();
    const after = await count();
    ok("the store is the size it was — the witness's own rows are gone", after === start, `${after} tap(s)`);
    await client.end();
  }
  console.log(failures === 0 ? "TAP CHECK PASSED" : `TAP CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
