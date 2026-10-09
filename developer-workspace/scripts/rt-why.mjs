// RECON-001: definitive "which CSS rules match this element".
// Uses CDP CSS.getMatchedStylesForNode — the browser's own cascade answer.
// Usage: node rt-why.mjs <url> <selector>
import { chromium } from "playwright-core";
const [, , url, selector] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem("ts-theme","dark"); localStorage.setItem("ts-asked","true"); localStorage.setItem("ts-visits","3"); } catch {} });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
await page.waitForTimeout(1500);

const client = await page.context().newCDPSession(page);
await client.send("DOM.enable");
await client.send("CSS.enable");
const { root } = await client.send("DOM.getDocument", { depth: -1 });
const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector });
console.log(`url: ${url}  selector: ${selector}  nodeId=${nodeId}`);
if (nodeId) {
  const box = await client.send("DOM.getBoxModel", { nodeId }).catch(() => null);
  if (box) console.log(`  box: ${Math.round(box.model.width)}x${Math.round(box.model.height)}`);
  const m = await client.send("CSS.getMatchedStylesForNode", { nodeId });
  const interesting = (name) => /^(display|padding|padding-(top|right|bottom|left|inline|block))$/.test(name);
  const show = (rules, label) => {
    for (const entry of rules) {
      const r = entry.rule;
      if (!r || !r.style) continue;
      const props = (r.style.cssProperties || []).filter((p) => interesting(p.name));
      if (!props.length) continue;
      const origin = r.origin || (entry.matchingSelectors ? "author" : "?");
      console.log(`  [${label} ${origin}] ${r.selectorList.text}  ->  ${props.map((p) => p.name + ":" + p.value).join("; ")}`);
    }
  };
  show(m.matchedCSSRules || [], "match");
  show(m.inherited || [], "inherit");
}
await browser.close();
