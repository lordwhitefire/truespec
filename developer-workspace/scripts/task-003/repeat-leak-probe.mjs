// Repeat probe: does a public route ever answer non-200, and when it does, is the
// body a *data* leak or a framework error page?
//
// The first leak-check run after the seed failed on one route. leak-check counts a
// 5xx as a hit, so the question is whether that 500 was a transient database timeout
// (the Neon HTTP driver) or a forbidden value on a healthy page. This hits the
// busiest route repeatedly and reports, per attempt, the status and which forbidden
// token (if any) the body contains.
//
//   node developer-workspace/scripts/task-003/repeat-leak-probe.mjs [attempts]

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";
const ATTEMPTS = Number(process.argv[2] ?? 12);

// The same signals leak-check blocks on. `doorstep_price_kobo` and `cost_line` are
// the two that appear in the public-cars query text, so a dev error page that prints
// the failing SQL would trip them.
const TOKENS = [
  "doorstep_price_kobo",
  "cost_line",
  "purchase_price",
  "amount_minor",
  "rate_minor",
  "currency",
  "private_note",
  "total_cost",
];

const routes = ["/", "/inventory"];
const results = [];

for (let i = 1; i <= ATTEMPTS; i++) {
  for (const route of routes) {
    let status = 0;
    let body = "";
    try {
      const res = await fetch(BASE + route, { signal: AbortSignal.timeout(30000) });
      status = res.status;
      body = await res.text();
    } catch (err) {
      status = -1;
      body = String(err?.message ?? err);
    }
    const hits = TOKENS.filter((t) => body.includes(t));
    results.push({ route, status, bytes: body.length, hits, body: status !== 200 ? body : "" });
  }
  const soFar = results.slice(-routes.length);
  process.stdout.write(
    `pass ${String(i).padStart(2)}: ` + soFar.map((r) => `${r.route}=${r.status}`).join("  ") + "\n",
  );
}

const nonOk = results.filter((r) => r.status !== 200);
console.log(`\nattempts: ${results.length}  non-200: ${nonOk.length}  (${nonOk.filter((r) => r.status >= 500).length} of them 5xx)`);
for (const r of nonOk.filter((x) => x.status === -1 || x.status >= 500)) {
  console.log(`\n--- ${r.route} answered ${r.status} (${r.bytes} bytes) ---`);
  console.log(`forbidden tokens in body: ${r.hits.length ? r.hits.join(", ") : "none"}`);
  const marker = r.body.search(/SELECT|Error|⨯|stack/i);
  console.log(marker >= 0 ? r.body.slice(Math.max(0, marker - 200), marker + 900) : r.body.slice(0, 600));
}
