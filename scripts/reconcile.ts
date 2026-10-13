// TASK-003 — reconciliation (plan Task 16; task.md §5: re-pointed, not deleted).
//
// The office shows figures. Every one of them must be the shared rule's output over
// the one car table. Two independent paths are compared, figure by figure:
//
//   RENDERED — the live office pages on :3210 (/office and /office/inventory), read
//              out of the HTML: what the owner actually sees.
//   STORE    — `car` + `cost_line` + `sale` + `car_state` read directly here, with the
//              shared rules (lib/counts.ts, lib/money.ts, lib/overview.ts). It does
//              NOT go through lib/office.ts, so a mistake in the office read layer
//              cannot hide behind the same mistake on this side.
//
// A figure that differs is a DEFECT: it fails the run (exit 1). The TASK-002 witness
// (`developer-workspace/scripts/office-data/ref-*.txt` — the old office over its own
// `office_car` table) is frozen historical evidence. Its headline figures are printed
// for context and are never compared: in TASK-003 both the office's table and the data
// changed, so comparing across them would compare two different datasets, not a rule.
//
// Run (needs the office server, per the standing rule on :3210):
//   node --env-file=.env.local --conditions=react-server --import tsx scripts/reconcile.ts
//
// `--conditions=react-server` lets this plain server-side script import lib/db.ts;
// that module's `server-only` guard is meant for the client bundle, not a script.

import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";

import { db } from "../lib/db";
import { countStock } from "../lib/counts";
import { costLabelFor, formatNaira, isCostComplete, profitKobo, totalCostKobo } from "../lib/money";
import { reachLine, stillBuildingLine, stockOverview, type OverviewCar } from "../lib/overview";
import { sectionOfState, type Section } from "../lib/sections";

loadEnv({ path: ".env.local" });

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";
const HISTORICAL = "developer-workspace/scripts/office-data/ref-dashboard.txt";

// --- the rendered office ----------------------------------------------------

async function html(path: string): Promise<string> {
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${path} answered ${res.status} — is the office server up on ${BASE}?`);
  return res.text();
}

// Tags out, entities in: the office's own words, with the markup removed.
function textOf(h: string): string {
  return h
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const digits = (s: string | undefined | null) => (s == null ? null : Number(s.replace(/[^\d]/g, "")));

// --- the store, read directly ----------------------------------------------

type StoreCar = {
  ref: string;
  name: string;
  /** The office's own way of naming a car: year + model + trim, no brand. */
  officeLabel: string;
  year: number | null;
  state: string;
  section: Section;
  isNewArrival: boolean;
  sold: boolean;
  priceKobo: number | null;
  salePriceKobo: number | null;
  costLines: { kind: string; amountMinor: number | null }[];
};

type RawStoreRow = {
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  state: string;
  section: string;
  is_new_arrival: boolean;
  doorstep_price_kobo: string | null;
  sold_at: string | null;
  sale_price_kobo: string | null;
  lines: { kind: string; amountMinor: string | null }[];
};

async function storeCars(): Promise<StoreCar[]> {
  const sql = db();
  const rows = (await sql.query(`
    SELECT c.ref, c.brand, c.model, c.trim, c.year, s.label AS state, s.section, s.is_new_arrival,
           c.doorstep_price_kobo, sale.sold_at, sale.sale_price_kobo,
           COALESCE(
             json_agg(json_build_object('kind', cl.kind, 'amountMinor', cl.amount_minor)
                      ORDER BY cl.kind) FILTER (WHERE cl.id IS NOT NULL),
             '[]'
           ) AS lines
      FROM car c
      JOIN car_state s ON s.id = c.state_id
      LEFT JOIN sale ON sale.car_id = c.id
      LEFT JOIN cost_line cl ON cl.car_id = c.id
     GROUP BY c.id, s.id, sale.id
     ORDER BY c.ref`)) as RawStoreRow[];

  return rows.map((r) => ({
    ref: r.ref,
    name: [r.brand, r.model, r.trim].filter(Boolean).join(" "),
    officeLabel: [r.year, r.model, r.trim].filter(Boolean).join(" "),
    year: r.year,
    state: r.state,
    // The one section rule, from the registry's own mapping (never the state label).
    section: sectionOfState(r.state, r.section),
    isNewArrival: r.is_new_arrival,
    sold: r.sold_at !== null,
    priceKobo: r.doorstep_price_kobo === null ? null : Number(r.doorstep_price_kobo),
    salePriceKobo: r.sale_price_kobo === null ? null : Number(r.sale_price_kobo),
    // bigint arrives as a string; the conversion stays at this edge.
    costLines: r.lines.map((l) => ({
      kind: l.kind,
      amountMinor: l.amountMinor === null ? null : Number(l.amountMinor),
    })),
  }));
}

const toOverview = (c: StoreCar): OverviewCar => ({
  section: c.section,
  isNewArrival: c.isNewArrival,
  sold: c.sold,
  priceKobo: c.priceKobo,
  salePriceKobo: c.sold ? c.salePriceKobo : null,
  costLines: c.costLines,
});

// --- comparison -------------------------------------------------------------

const failures: string[] = [];

function check(label: string, rule: string, office: string | null, note = "") {
  const same = office !== null && rule === office;
  if (!same) failures.push(label);
  console.log(
    `  ${same ? "✓" : "✗"} ${label.padEnd(24)} rule ${rule.padStart(18)}   ` +
      `office ${(office ?? "?").padStart(18)}${note ? `   ${note}` : ""}`,
  );
}

const checkNumber = (label: string, rule: number, office: number | null, note = "") =>
  check(label, String(rule), office === null ? null : String(office), note);

// --- per-car rows out of the office's inventory table -----------------------

type RenderedRow = { ref: string; state: string; price: string | null; cost: string | null; profit: string | null };

function renderedRows(invHtml: string): RenderedRow[] {
  const body = /<tbody[\s\S]*?<\/tbody>/.exec(invHtml)?.[0] ?? "";
  const out: RenderedRow[] = [];
  for (const tr of body.split("</tr>")) {
    if (!tr.includes('class="carx"')) continue;
    const refNo = /<small>TS-(\d{4})/.exec(tr)?.[1];
    const state = /<span class="st [a-z]+"><i><\/i>([^<]+)<\/span>/.exec(tr)?.[1];
    if (!refNo || !state) continue;
    const ref = `TS-${refNo}`;
    const cells = [...tr.matchAll(/<td class="r[^"]*">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    // Price, cost, profit; the last `class="r"` cell is the row's actions.
    const amount = (cell: string | undefined) => {
      if (cell === undefined) return null;
      if (cell.includes("Costs incomplete")) return "incomplete";
      const m = /₦([\d,]+)/.exec(cell);
      return m ? `₦${m[1]}` : null;
    };
    out.push({ ref, state, price: amount(cells[0]), cost: amount(cells[1]), profit: amount(cells[2]) });
  }
  return out;
}

// The card view's own per-car cost name (R-MON-7), read from the card for that car.
function renderedCostLabels(invHtml: string): Map<string, string> {
  const labels = new Map<string, string>();
  for (const m of invHtml.matchAll(/<small>TS-(\d{4})[\s\S]{0,80}?<\/small>/g)) {
    const window = invHtml.slice(m.index, m.index + 1500);
    const smalls = [...window.matchAll(/<small>([^<]+)<\/small>/g)].map((x) => x[1]);
    const costLabel = smalls.find(
      (l) => l === "Landed cost" || l === "Estimated total cost" || l === "Total cost",
    );
    if (costLabel) labels.set(`TS-${m[1]}`, costLabel);
  }
  return labels;
}

// --- run --------------------------------------------------------------------

async function main() {
  const [dashHtml, invHtml, cars] = await Promise.all([html("/office"), html("/office/inventory"), storeCars()]);

  const dash = textOf(dashHtml);
  const overviewCars = cars.map(toOverview);
  const counts = countStock(overviewCars);
  const overview = stockOverview(overviewCars);

  console.log("TASK-003 reconciliation — the office against the one car table");
  console.log("=".repeat(78));
  console.log(`store: ${cars.length} cars · rendered from ${BASE}`);
  console.log();

  // --- the dashboard's figures ----------------------------------------------
  console.log("DASHBOARD  (R-CNT, R-MON-8/9, R-SLD — lib/counts.ts + lib/overview.ts)");
  checkNumber("cars in stock", overview.moneyTiedUp.counted, digits(/Across (\d[\d,]*) cars in stock/.exec(dash)?.[1]));
  checkNumber("available", counts.available, digits(/(\d[\d,]*) available of which/.exec(dash)?.[1]));
  checkNumber("of which new arrival", counts.newArrivals, digits(/(\d[\d,]*) new arrival/.exec(dash)?.[1]));
  checkNumber("on order", counts.onOrder, digits(/(\d[\d,]*) on order/.exec(dash)?.[1]));
  check(
    "money tied up",
    formatNaira(overview.moneyTiedUp.kobo),
    (() => {
      const m = /Money tied up\s*₦\s*([\d,]+)/.exec(dash)?.[1];
      return m ? `₦${m}` : null;
    })(),
    `(${overview.moneyTiedUp.counted} cars in stock)`,
  );
  check(
    "projected profit",
    formatNaira(overview.projectedProfit.kobo),
    (() => {
      const m = /Projected profit\s*₦\s*([\d,]+)/.exec(dash)?.[1];
      return m ? `₦${m}` : null;
    })(),
    `(${reachLine(overview.projectedProfit)}${stillBuildingLine(overview.projectedProfit) ? "; " + stillBuildingLine(overview.projectedProfit) : ""})`,
  );
  checkNumber("  profit reach", overview.projectedProfit.counted, digits(/From (\d[\d,]*) of/.exec(dash)?.[1]));
  checkNumber("  profit of", overview.projectedProfit.of, digits(/of (\d[\d,]*) cars\./.exec(dash)?.[1]));
  checkNumber("  still building", overview.projectedProfit.stillBuilding, digits(/(\d[\d,]*) excluded: costs incomplete/.exec(dash)?.[1]));
  check(
    "real profit (sold)",
    formatNaira(overview.realProfit.kobo),
    (() => {
      const m = /Real profit \(sold\)\s*₦\s*([\d,]+)/.exec(dash)?.[1];
      return m ? `₦${m}` : null;
    })(),
  );
  const soldCar = cars.find((c) => c.sold) ?? null;
  check(
    "sold sale price",
    soldCar?.salePriceKobo == null ? "—" : formatNaira(soldCar.salePriceKobo),
    (() => {
      const m = /sale price\s*₦\s*([\d,]+)/.exec(dash)?.[1];
      return m ? `₦${m}` : null;
    })(),
  );
  check(
    "sold car named",
    soldCar ? soldCar.officeLabel : "—",
    (() => {
      const m = /1 car sold\s*—\s*([^,]+?)\s*,/.exec(dash)?.[1];
      return m ? m.replace(/\s+/g, " ").trim() : null;
    })(),
  );
  console.log();

  // --- every car in the inventory table -------------------------------------
  console.log("INVENTORY — every car, price / cost / profit  (lib/money.ts)");
  const rows = renderedRows(invHtml);
  checkNumber("rows rendered", cars.length, rows.length);
  const byRef = new Map(rows.map((r) => [r.ref, r]));
  let priceChecked = 0;
  let costChecked = 0;
  let incompleteChecked = 0;
  for (const c of cars) {
    const r = byRef.get(c.ref);
    if (!r) {
      failures.push(`row ${c.ref}`);
      console.log(`  ✗ ${c.ref.padEnd(24)} not rendered`);
      continue;
    }
    const complete = isCostComplete(c.costLines);
    const cost = totalCostKobo(c.costLines);
    const profit = complete
      ? profitKobo({
          totalCostKobo: cost,
          priceKobo: c.sold ? null : c.priceKobo,
          salePriceKobo: c.sold ? c.salePriceKobo : null,
        })
      : null;
    const priceWant = c.priceKobo == null ? "—" : formatNaira(c.priceKobo);
    const costWant = complete ? formatNaira(cost) : "incomplete";
    const profitWant = profit && profit.kobo !== null ? formatNaira(profit.kobo) : "incomplete";
    // R-SLD — "Sold is a flag, not a state": a sold car is presented as Sold,
    // whatever its state label is.
    const stateWant = c.sold ? "Sold" : c.state;

    const bad: string[] = [];
    if (r.price !== priceWant) bad.push(`price ${r.price} ≠ ${priceWant}`);
    if (r.cost !== costWant) bad.push(`cost ${r.cost} ≠ ${costWant}`);
    if (r.profit !== profitWant) bad.push(`profit ${r.profit} ≠ ${profitWant}`);
    if (r.state !== stateWant) bad.push(`state ${r.state} ≠ ${stateWant}`);
    if (bad.length) {
      failures.push(`row ${c.ref}`);
      console.log(`  ✗ ${c.ref.padEnd(24)} ${bad.join("; ")}`);
    }
    if (r.price === priceWant) priceChecked += 1;
    if (r.cost === costWant) costChecked += 1;
    if (costWant === "incomplete") incompleteChecked += 1;
  }
  console.log(
    `  ✓ ${priceChecked} price(s), ${costChecked} cost/profit figure(s) agree` +
      (incompleteChecked ? `, ${incompleteChecked} car(s) honestly shown "Costs incomplete"` : ""),
  );
  console.log();

  // --- the cost's name per car (R-MON-7) ------------------------------------
  console.log("COST NAME BY CAR  (R-MON-7 — never \"Landed cost\" before landing)");
  const renderedLabels = renderedCostLabels(invHtml);
  checkNumber("labels rendered", cars.length, renderedLabels.size);
  let labelOk = 0;
  const wrongLabels: string[] = [];
  for (const c of cars) {
    const want = costLabelFor(c.section, c.sold);
    const got = renderedLabels.get(c.ref) ?? null;
    if (got === want) labelOk += 1;
    else wrongLabels.push(`${c.ref}: ${got ?? "none"} ≠ ${want}`);
  }
  checkNumber("labels the rule's name", cars.length, labelOk);
  for (const w of wrongLabels) failures.push(`label ${w.split(":")[0]}`);
  for (const w of wrongLabels) console.log(`  ✗ ${w}`);
  console.log();

  // --- the frozen TASK-002 witness (context only, never compared) -----------
  try {
    const hist = textOf(readFileSync(HISTORICAL, "utf8"));
    const tied = /MONEY TIED UP\s*₦([\d,]+)/.exec(hist)?.[1];
    const stock = /Across (\d+) cars in stock/.exec(hist)?.[1];
    console.log("FROZEN TASK-002 WITNESS (the old office over `office_car` — historical, not compared)");
    console.log(`  it showed money tied up ₦${tied ?? "?"} across ${stock ?? "?"} cars in stock, from a different dataset.`);
    console.log("  TASK-002's reconciliation is recorded in openspec/tasks/TASK-002/; this run replaces the live check.");
    console.log();
  } catch {
    console.log("FROZEN TASK-002 WITNESS: not found (nothing compared against it).\n");
  }

  // --- verdict ---------------------------------------------------------------
  if (failures.length) {
    console.log(`FAIL — the office and the shared tables disagree: ${[...new Set(failures)].join(", ")}`);
    console.log("      (this is a defect: the office must show the shared rule's output, not its own arithmetic)");
    process.exit(1);
  }
  console.log("VERDICT: every figure the office shows is the shared rule's output over the one car table.");
  console.log("         Counts, money tied up, projected and real profit, the sold car, every car's price,");
  console.log("         cost and profit, and the cost's name by state — all reproduced.");
}

main().catch((err) => {
  console.error("reconcile error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
