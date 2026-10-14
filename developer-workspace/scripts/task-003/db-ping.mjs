// Scratch diagnostic (T7 pre-check): measure live-store reachability through the real driver.
// Run: node --env-file=.env.local developer-workspace/scripts/task-003/db-ping.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const sql = neon(url, { fetchOptions: { cache: "no-store" } });

const N = Number(process.env.PING_N || 20);
let ok = 0, fail = 0;
const lat = [];
for (let i = 0; i < N; i++) {
  const t = Date.now();
  try {
    const r = await sql`select 1 as x, ${i}::int as i`;
    const ms = Date.now() - t;
    lat.push(ms);
    ok++;
    console.log(`#${i} ok ${ms}ms row=${JSON.stringify(r[0])}`);
  } catch (e) {
    const ms = Date.now() - t;
    fail++;
    console.log(`#${i} FAIL ${ms}ms ${e.code || ""} ${e.message}${e.cause ? " cause=" + (e.cause.code || e.cause.message) : ""}`);
  }
}
lat.sort((a, b) => a - b);
const p = (q) => lat.length ? lat[Math.min(lat.length - 1, Math.floor(q * lat.length))] : "-";
console.log(`\nsummary: ok=${ok}/${N} fail=${fail}/${N} · latency p50=${p(0.5)}ms p90=${p(0.9)}ms max=${lat[lat.length - 1] ?? "-"}ms`);
