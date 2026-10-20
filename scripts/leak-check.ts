import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { formatNaira, totalCostKobo, type CostLineInput } from "../lib/money";
import { mentionsValue } from "../lib/leak-match";

loadEnv({ path: ".env.local" });

// The build server per the plan's standing rule (owner 2026-10-13): build on :3210,
// reference on :3211. Port 3000 is never used.
const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";

// Field names / tokens that must never appear in a public response. Tokens are
// identifiers (snake_case field or kind names) and quoted shapes (`"shipping"`),
// never bare English words the marketing copy legitimately uses ("Shipping,
// clearing and delivery included."). `rate`/`cost` are word-boundaried so a
// framework name like `generateMetadata` (substring "rate") cannot trip the
// check; the genuine rate signal is `rate_minor`/`currency` (field names) plus
// the naira cost-value check below.
const FORBIDDEN: (string | RegExp)[] = [
  "purchase_price",
  '"shipping"',
  '"clearing"',
  "trucking_usa",
  "trucking_ng",
  "full_tank",
  "amount_minor",
  "rate_minor",
  "currency",
  "cost_line",
  "total_cost",
  "totalCost",
  "profit",
  "private_note",
  "doorstep_price_kobo",
  "kobo",
  /\bcost\b/,
  /\brate\b/,
];

async function listedRefs(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ ref: string }>(
    `SELECT c.ref
     FROM car c
     JOIN car_state s ON s.id = c.state_id
     LEFT JOIN sale ON sale.car_id = c.id
     WHERE c.deleted_at IS NULL
       AND c.doorstep_price_kobo IS NOT NULL
       AND sale.id IS NULL
       AND EXISTS (SELECT 1 FROM car_photo p WHERE p.car_id = c.id)
     ORDER BY c.ref`,
  );
  return rows.map((r) => r.ref);
}

async function costTotals(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{
    ref: string;
    kind: string;
    amount_minor: string | null;
    doorstep_price_kobo: string | null;
  }>(
    `SELECT c.ref, cl.kind, cl.amount_minor, c.doorstep_price_kobo
     FROM car c JOIN cost_line cl ON cl.car_id = c.id`,
  );
  const byCar = new Map<string, { lines: CostLineInput[]; price: number | null }>();
  for (const r of rows) {
    if (!byCar.has(r.ref)) {
      byCar.set(r.ref, {
        lines: [],
        price: r.doorstep_price_kobo === null ? null : Number(r.doorstep_price_kobo),
      });
    }
    byCar.get(r.ref)!.lines.push({
      kind: r.kind,
      amountMinor: r.amount_minor === null ? null : Number(r.amount_minor),
    });
  }
  const totals = new Set<string>();
  for (const { lines, price } of byCar.values()) {
    const total = totalCostKobo(lines);
    totals.add(formatNaira(total));
    // also the raw total-cost-in-kobo, in case a leak formats differently
    totals.add(String(total));
    if (price !== null) totals.delete(formatNaira(price));
  }
  return totals;
}

/**
 * The store's own references to private material: every photo's asset id and the imported PDF's
 * asset id and filename. A public page legitimately carries the *derived* CDN address, which holds
 * the asset's hash but is not the id — so the id itself appearing anywhere public means the office's
 * own reference escaped (and the PDF's id or filename means the customer's file did).
 */
async function privateReferences(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ ref: string | null }>(
    `SELECT sanity_asset_id AS ref FROM car_photo WHERE sanity_asset_id !~* '^https?://'
     UNION ALL
     SELECT sanity_asset_id FROM enquiry_pdf WHERE sanity_asset_id !~* '^https?://'
     UNION ALL
     SELECT filename FROM enquiry_pdf WHERE filename IS NOT NULL`,
  );
  return new Set(rows.map((r) => r.ref).filter((v): v is string => Boolean(v && v.length >= 6)));
}

/** Every enquiry's own detail — a name, a number, a note — none of which is public. */
async function customerDetail(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{
    name: string | null;
    number: string | null;
    note: string | null;
  }>(`SELECT name, number, note FROM enquiry`);
  const out = new Set<string>();
  for (const r of rows) {
    for (const value of [r.name, r.number, r.note]) {
      // Short values are skipped: a two-character note would match ordinary copy and turn a real
      // leak check into noise. Every demo value is well past this.
      if (value && value.length >= 6) out.add(value);
    }
  }
  return out;
}

/**
 * The owner's own office words: the labels of the *secondary* states — the states that are
 * not one of the four fixed primary states, and so are never shown (D15; R-SEC-5 — the
 * showroom speaks in sections, never in the office's own state vocabulary). Under D15 a
 * section and a primary state are one, so the office-private set is exactly the secondaries.
 */
async function officeStateLabels(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ label: string }>(
    `SELECT DISTINCT label FROM car_state WHERE kind = 'secondary' ORDER BY label`,
  );
  return new Set(rows.map((r) => r.label));
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const client = new Client({ connectionString });
  await client.connect();

  let failures = 0;
  let contentFailures = 0;
  let statusFailures = 0;
  try {
    const refs = await listedRefs(client);
    const costValues = await costTotals(client);
    const privateRefs = await privateReferences(client);
    const enquiries = await customerDetail(client);
    const officeLabels = await officeStateLabels(client);
    const routes = ["/", "/inventory", ...refs.map((r) => `/car/${r}`)];

    console.log(`leak-check against ${BASE} — ${routes.length} public route(s)`);
    console.log(
      `watching for: ${FORBIDDEN.length} token(s) · ${costValues.size} cost value(s) · ` +
        `${privateRefs.size} asset/file reference(s) · ${enquiries.size} customer value(s) · ` +
        `${officeLabels.size} office state label(s)\n`,
    );

    for (const route of routes) {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const body = await res.text();
      const contentHits: string[] = [];

      for (const token of FORBIDDEN) {
        const hit = typeof token === "string" ? body.includes(token) : token.test(body);
        if (hit) contentHits.push(`token "${token}"`);
      }
      for (const value of costValues) {
        // The cost totals include the raw kobo string, which is digits-only; a plain `includes`
        // finds it inside a longer public price (cost `5500000` inside price `4550000000`). The
        // boundary rule keeps a real whole-number leak and drops the collision. See lib/leak-match.ts.
        if (mentionsValue(body, value)) contentHits.push(`cost value ${value}`);
      }
      for (const value of privateRefs) {
        if (body.includes(value)) contentHits.push(`asset/file reference ${value}`);
      }
      for (const value of enquiries) {
        if (body.includes(value)) contentHits.push(`customer detail "${value}"`);
      }
      for (const value of officeLabels) {
        if (body.includes(value)) contentHits.push(`office state label "${value}"`);
      }

      const status = res.status;
      // A 5xx is a failure — but it is not the same failure as a leak, and calling it "forbidden
      // content" (as this summary used to) hides which one happened. A dev-mode error page can also
      // print the failing SQL, which is a leak vector in its own right, so it stays a failure.
      const statusHit = status >= 500 ? `did not render — status ${status}` : null;

      if (contentHits.length > 0 || statusHit) {
        failures += 1;
        if (contentHits.length > 0) contentFailures += 1;
        if (statusHit) statusFailures += 1;
        console.log(`FAIL ${route} (${status})`);
        for (const h of contentHits) console.log(`       ${h}`);
        if (statusHit) console.log(`       ${statusHit}`);
      } else {
        console.log(`ok   ${route} (${status}, ${body.length} bytes)`);
      }
    }
  } finally {
    await client.end();
  }

  console.log("");
  if (failures > 0) {
    console.log(
      `LEAK CHECK FAILED — ${failures} route(s): ${contentFailures} with forbidden content, ` +
        `${statusFailures} that did not render.`,
    );
    process.exit(1);
  }
  console.log(
    "LEAK CHECK PASSED — no cost, currency or profit value, no asset or file reference, no " +
      "customer detail and no office state label appeared on any public route.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
