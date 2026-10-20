// Decisive probe: what does the template upload actually do in the browser?
// Captures the /api/upload response body and the CreateFromFile status/alert text.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows");
mkdirSync(RUNS, { recursive: true });

const PROBE = () => {
  const hasSide = !!document.querySelector("aside.side");
  const topbar = !!document.querySelector("header.topbar");
  return { url: location.href, hasSide, topbar, signedIn: hasSide && topbar };
};

async function hydrated(page, sel) {
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
    },
    sel,
    { timeout: 60000 },
  );
}

async function main() {
  const lib = await import("./_lib.mjs");
  const browser = await lib.attach();
  await lib.assertOurs(browser);

  let page = null;
  let base = "http://127.0.0.1:3210";
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        const u = new URL(p.url());
        if (u.pathname.startsWith("/office")) base = `${u.protocol}//${u.host}`;
        const s = await p.evaluate(PROBE);
        if (s.signedIn && !page) page = p;
      } catch {}
    }
  }
  if (!page) {
    console.log("NOT SIGNED IN");
    await lib.detach(browser);
    process.exit(3);
  }
  console.log(`signed-in page: ${page.url()}`);

  const responses = [];
  page.on("response", async (r) => {
    if (r.url().includes("/api/upload")) {
      let body = "";
      try {
        body = await r.text();
      } catch {}
      responses.push({ status: r.status(), body: body.slice(0, 500) });
    }
  });

  await page.goto(`${base}/office/inventory`, { waitUntil: "domcontentloaded" });
  await hydrated(page, 'input[aria-label="Create drafts from a file"]');
  console.log("inventory hydrated");

  const fixture = join(RUNS, "fixtures/car-template-filled.pdf");
  await page.setInputFiles('input[aria-label="Create drafts from a file"]', fixture);

  // Wait for a content-bearing status or an alert.
  await page
    .waitForFunction(
      () => {
        const st = [...document.querySelectorAll('[role="status"]')].some((d) =>
          /waiting/.test(d.textContent || ""),
        );
        const al = [...document.querySelectorAll('[role="alert"]')].some((d) =>
          /./.test(d.textContent || ""),
        );
        return st || al;
      },
      { timeout: 45000 },
    )
    .catch(() => console.log("no status/alert appeared within 45s"));

  await new Promise((r) => setTimeout(r, 1500));

  const dom = await page.evaluate(() => ({
    statuses: [...document.querySelectorAll('[role="status"]')].map((d) => (d.textContent || "").trim()),
    alerts: [...document.querySelectorAll('[role="alert"]')].map((d) => (d.textContent || "").trim()),
    uploadInputPending: !!document.querySelector('input[aria-label="Create drafts from a file"]:disabled'),
  }));

  console.log("responses:", JSON.stringify(responses, null, 2));
  console.log("dom:", JSON.stringify(dom, null, 2));

  writeFileSync(join(RUNS, "upload-probe.json"), JSON.stringify({ responses, dom }, null, 2));
  await lib.detach(browser);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
