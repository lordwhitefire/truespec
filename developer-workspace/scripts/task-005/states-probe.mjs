// Diagnostic: what is actually on /office/settings, and does the states editor exist?
import { BASE, attach, assertOurs, detach } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const browser = await attach();
try {
  await assertOurs(browser);
  const { page, opened } = await signedInPage(browser, BASE);
  if (!page) throw new Error("no signed-in office tab");
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);

  const probe = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role="tab"]')].map((t) => ({
      id: t.id,
      text: t.textContent.trim(),
      selected: t.getAttribute("aria-selected"),
    }));
    const panels = [...document.querySelectorAll('[role="tabpanel"]')].map((p) => p.id);
    return {
      url: location.href,
      title: document.title,
      signedIn: !!document.querySelector("aside.side") && !!document.querySelector("header.topbar"),
      door: !!document.querySelector("main.office-door"),
      tabs,
      panels,
      edwrap: document.querySelectorAll(".edwrap").length,
      edrow: document.querySelectorAll("div.edrow").length,
      cards: [...document.querySelectorAll("section.card h2, section.card h3")].map((h) => h.textContent.trim()).slice(0, 12),
      bodySnippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 400),
    };
  });
  console.log(JSON.stringify(probe, null, 2));

  // Click the Car states tab (if present) and look again.
  const hasTabCar = await page.$("#tab-car");
  if (hasTabCar) {
    await page.click("#tab-car");
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => ({
      selectedTab: document.querySelector('[role="tab"][aria-selected="true"]')?.id ?? null,
      panel: document.querySelector('[role="tabpanel"]')?.id ?? null,
      edwrap: document.querySelectorAll(".edwrap").length,
      edrow: document.querySelectorAll("div.edrow").length,
      edadd: document.querySelectorAll("button.edadd").length,
      edin: document.querySelectorAll("input.edin").length,
      edpick: document.querySelectorAll("input.edpick").length,
      eddel: document.querySelectorAll("button.eddel").length,
      edgrip: document.querySelectorAll("span.edgrip").length,
      labels: [...document.querySelectorAll(".edwrap .edsample")].map((s) => s.textContent.trim()),
      snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 400),
    }));
    console.log("\n=== after clicking #tab-car ===");
    console.log(JSON.stringify(after, null, 2));
  } else {
    console.log("\n#tab-car NOT FOUND");
  }
  if (opened) await page.close();
} finally {
  await detach(browser);
}
