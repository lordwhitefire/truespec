// LAUNCH-001 Task 1 — capture the current runtime truth before any change.
// Attach-only to the visible Chrome on :9222. Reuses the existing 3210 and 3211 tabs.
// No new tab, no launch, no screenshot. Surfaces only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE,
  REF,
  attach,
  assertOurs,
  chromiumCount,
  detach,
  findTab,
  guardCount,
  tabUrls,
} from "./_lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runDir = path.join(here, "runs");
fs.mkdirSync(runDir, { recursive: true });

const gaps = [];
const results = [];

async function probe(page, label, pathname) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(err.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    const response = await page.goto(`${BASE}${pathname}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    const facts = await page.evaluate(() => {
      const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content ?? null;
      const prop = (p) => document.querySelector(`meta[property="${p}"]`)?.content ?? null;
      const h1s = [...document.querySelectorAll("h1")];
      const h2s = [...document.querySelectorAll("h2")];
      return {
        title: document.title,
        description: meta("description"),
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        ogTitle: prop("og:title"),
        ogDescription: prop("og:description"),
        ogImage: prop("og:image"),
        twitterCard: meta("twitter:card"),
        h1Count: h1s.length,
        h1Text: h1s.map((h) => h.textContent?.trim()).filter(Boolean),
        h2Count: h2s.length,
        bodyLength: document.body.innerText.length,
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
        theme: document.documentElement.dataset.theme ?? null,
        finalUrl: location.href,
      };
    });
    const headers = response ? response.headers() : {};
    const row = {
      label,
      path: pathname,
      status: response ? response.status() : null,
      ...facts,
      headers: {
        "content-type": headers["content-type"] ?? null,
        "content-security-policy": headers["content-security-policy"] ?? null,
        "content-security-policy-report-only":
          headers["content-security-policy-report-only"] ?? null,
        "x-content-type-options": headers["x-content-type-options"] ?? null,
        "x-frame-options": headers["x-frame-options"] ?? null,
        "referrer-policy": headers["referrer-policy"] ?? null,
        "permissions-policy": headers["permissions-policy"] ?? null,
        "strict-transport-security": headers["strict-transport-security"] ?? null,
      },
      consoleErrors,
      pageErrors,
    };
    results.push(row);
    console.log(
      `${label.padEnd(14)} ${String(row.status).padEnd(4)} h1=${facts.h1Count} ` +
        `h2=${facts.h2Count} overflow=${facts.overflow} ` +
        `console=${consoleErrors.length} pageErrors=${pageErrors.length} ` +
        `title=${facts.title.slice(0, 48)}`,
    );
    return row;
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function main() {
  const before = guardCount();
  const browser = await attach();
  try {
    const ua = await assertOurs(browser);
    const build = findTab(browser, BASE);
    const ref = findTab(browser, REF);
    const tabsBefore = tabUrls(browser).length;
    console.log(`attached :9222 — ours (UA has no Headless)`);
    console.log(`  UA: ${ua}`);
    console.log(`build tab: ${build.url()}`);
    console.log(`ref tab:   ${ref.url()}`);
    console.log(`tabs before: ${tabsBefore}; chromium before: ${before}`);

    await probe(build, "home", "/");
    await probe(build, "inventory", "/inventory");

    const carHref = await build.evaluate(
      () => document.querySelector('a[href^="/car/"]')?.getAttribute("href") ?? null,
    );
    if (carHref) await probe(build, "car", carHref);
    else gaps.push("no car link on /inventory — car baseline not captured");

    await probe(build, "privacy", "/privacy");
    await probe(build, "office-sign-in", "/office/sign-in");

    const tabsAfter = tabUrls(browser).length;
    const after = chromiumCount();
    const summary = {
      at: new Date().toISOString(),
      buildUrl: BASE,
      refUrl: REF,
      tabsBefore,
      tabsAfter,
      chromiumBefore: before,
      chromiumAfter: after,
      gaps,
      results,
    };
    fs.writeFileSync(path.join(runDir, "baseline.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(
      path.join(runDir, "baseline.txt"),
      results
        .map(
          (r) =>
            `${r.label} ${r.status} ${r.finalUrl}\n` +
            `  title=${r.title}\n` +
            `  h1=${r.h1Count} ${JSON.stringify(r.h1Text)} h2=${r.h2Count}\n` +
            `  canonical=${r.canonical ?? "none"}\n` +
            `  og=${r.ogTitle ? "yes" : "no"} twitter=${r.twitterCard ?? "none"}\n` +
            `  overflow=${r.overflow} consoleErrors=${r.consoleErrors.length} pageErrors=${r.pageErrors.length}\n` +
            `  headers=${JSON.stringify(r.headers)}`,
        )
        .join("\n\n") + "\n",
    );
    console.log(`tabs after: ${tabsAfter}; chromium after: ${after}`);
    console.log(`gaps: ${gaps.length}`);
    if (after > before) throw new Error(`a Chrome was launched during the check (${before} -> ${after})`);
    if (tabsAfter !== tabsBefore) {
      throw new Error(`a tab was opened during the check (${tabsBefore} -> ${tabsAfter})`);
    }
  } finally {
    await detach(browser);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
