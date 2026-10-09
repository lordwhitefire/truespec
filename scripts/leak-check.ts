import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { formatNaira, totalCostKobo, type CostLineInput } from "../lib/money";

loadEnv({ path: ".env.local" });

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3000";

// Field names / tokens that must never appear in a public response.
const FORBIDDEN = [
  "purchase",
  "shipping",
  "clearing",
  "trucking",
  "full_tank",
  "amount_minor",
  "rate_minor",
  "cost_line",
  "total_cost",
  "totalCost",
  "profit",
  "private_note",
  "doorstep_price_kobo",
  "kobo",
  "cost",
  "rate",
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
    currency: string;
    amount_minor: string | null;
    rate_minor: string | null;
    doorstep_price_kobo: string | null;
  }>(
    `SELECT c.ref, cl.kind, cl.currency, cl.amount_minor, cl.rate_minor, c.doorstep_price_kobo
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
      currency: r.currency as "USD" | "NGN",
      amountMinor: r.amount_minor === null ? null : Number(r.amount_minor),
      rateMinor: r.rate_minor === null ? null : Number(r.rate_minor),
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

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const client = new Client({ connectionString });
  await client.connect();

  let failures = 0;
  try {
    const refs = await listedRefs(client);
    const costValues = await costTotals(client);
    const routes = ["/", "/inventory", ...refs.map((r) => `/car/${r}`)];

    console.log(`leak-check against ${BASE} — ${routes.length} public route(s)\n`);

    for (const route of routes) {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      const body = await res.text();
      const hits: string[] = [];

      for (const token of FORBIDDEN) {
        if (body.includes(token)) hits.push(`token "${token}"`);
      }
      for (const value of costValues) {
        if (value && body.includes(value)) hits.push(`cost value ${value}`);
      }

      const status = res.status;
      if (status >= 500) hits.push(`status ${status}`);

      if (hits.length > 0) {
        failures += 1;
        console.log(`FAIL ${route} (${status})`);
        for (const h of hits) console.log(`       ${h}`);
      } else {
        console.log(`ok   ${route} (${status}, ${body.length} bytes)`);
      }
    }
  } finally {
    await client.end();
  }

  console.log("");
  if (failures > 0) {
    console.log(`LEAK CHECK FAILED — ${failures} route(s) with forbidden content.`);
    process.exit(1);
  }
  console.log("LEAK CHECK PASSED — no cost, rate or profit value on any public route.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
