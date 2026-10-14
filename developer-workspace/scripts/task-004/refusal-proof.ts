/**
 * Task 6 witness — the office's door refuses, and no office data rides along.
 *
 * `specs/office-access` requires the server to refuse, not the link to be hidden:
 * "Every office page and data request is refused when the session check fails, and
 * the refusal reveals no office data." This walks every office route with no session
 * and asserts (a) it is refused, and (b) nothing office-shaped is in the answer.
 *
 * It also walks the public routes to prove the door did not close on them, and the
 * routes that must no longer exist.
 *
 * Run (needs the office server on :3210):
 *   node --import tsx developer-workspace/scripts/task-004/refusal-proof.ts
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

/** Every office route that exists today. */
const OFFICE_ROUTES = [
  "/office",
  "/office/inventory",
  "/office/activity",
  "/office/enquiries",
  "/office/settings",
  "/office/car",
  "/office/car/new",
];

/** Office routes that do not exist yet — added by later steps of this layer. */
const OFFICE_ROUTES_PENDING = ["/office/drafts"];

/** Public routes that must stay open. */
const PUBLIC_ROUTES = ["/", "/inventory", "/privacy"];

/** Routes that must no longer exist at all. */
const REMOVED_ROUTES = ["/sign-in", "/sign-up", "/office/login"];

/**
 * Anything that would prove an office surface reached the browser.
 *
 * `Dashboard` is deliberately NOT a marker: Next's development-mode error payload
 * names the component (`"DashboardPage`) even on a clean redirect. These are either
 * office data shapes or markup only the office shell emits.
 */
const OFFICE_MARKERS = [
  "Signed in as", // the shell's own words
  "TS-10", // a car reference
  "₦", // a currency figure
  "Landing cost", // the office's own cost vocabulary
  "profit",
  "customer",
  'class="shell"', // markup only the office shell emits
  'class="side"',
  "fa-gauge-high",
];

function findApiRoutes(dir = "app/api"): string[] {
  try {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((e) => {
        const p = join(d, e);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith("route.ts") ? [p] : [];
      });
    return walk(dir);
  } catch {
    return [];
  }
}

async function get(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...opts });
  const body = await res.text().catch(() => "");
  return { status: res.status, location: res.headers.get("location") ?? "", body };
}

async function main() {
  // --- office pages are refused, silently -----------------------------------
  for (const route of OFFICE_ROUTES) {
    const { status, location, body } = await get(route);
    const refused = status === 307 || status === 308 || status === 303;
    const toDoor = location.endsWith("/office/sign-in");
    check(`no session → ${route} refused`, refused, `status ${status}`);
    check(`no session → ${route} goes to the door`, toDoor, location || "(no location)");

    const leaked = OFFICE_MARKERS.filter((m) => body.includes(m));
    check(`no session → ${route} leaks no office data`, leaked.length === 0, leaked.join(", "));
  }

  // --- a fabricated provider cookie is refused just the same ------------------
  for (const route of ["/office", "/office/inventory"]) {
    const { status, body } = await get(route, {
      headers: { cookie: "__session=not-a-real-token; __client_uat=9999999999" },
    });
    const refused = status === 307 || status === 308 || status === 303;
    const leaked = OFFICE_MARKERS.filter((m) => body.includes(m));
    check(`forged cookie → ${route} refused`, refused, `status ${status}`);
    check(`forged cookie → ${route} leaks nothing`, leaked.length === 0, leaked.join(", "));
  }

  // --- the door itself is reachable, and holds no office data ---------------
  {
    const { status, body } = await get("/office/sign-in");
    check("the door renders without a session", status === 200, `status ${status}`);
    const leaked = OFFICE_MARKERS.filter((m) => body.includes(m));
    check("the door leaks no office data", leaked.length === 0, leaked.join(", "));
  }

  // --- public routes stay open ----------------------------------------------
  for (const route of PUBLIC_ROUTES) {
    const { status } = await get(route);
    check(`public route stays open → ${route}`, status === 200, `status ${status}`);
  }

  // --- removed routes are gone ----------------------------------------------
  for (const route of REMOVED_ROUTES) {
    const { status } = await get(route);
    check(`removed route is gone → ${route}`, status === 404, `status ${status}`);
  }

  // --- office API routes, if any exist yet, must answer 401 -----------------
  const apiRoutes = findApiRoutes();
  if (apiRoutes.length === 0) {
    check("no office API routes exist yet (none to refuse)", true, "app/api is absent");
  } else {
    for (const file of apiRoutes) {
      const path = "/" + file.replace(/^app\//, "").replace(/\/route\.ts$/, "");
      const { status } = await get(path);
      check(`office API route refused → ${path}`, status === 401, `status ${status}`);
    }
  }

  // --- pending office routes must NOT be standing open ----------------------
  for (const route of OFFICE_ROUTES_PENDING) {
    const { status } = await get(route);
    const safe = status === 404 || status === 307 || status === 308 || status === 303;
    check(`not-yet-built office route is not open → ${route}`, safe, `status ${status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error("\nFAILED:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
