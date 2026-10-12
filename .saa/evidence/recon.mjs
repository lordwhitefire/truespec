// recon.mjs — small read-only recon to explain the census gap.
import { connect, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";
import { writeFileSync } from "node:fs";

const browser = await connect();
const ctx = browser.contexts()[0];
const pages = ctx.pages().filter((p) => p.url().startsWith("http"));

async function recon(page, tag) {
  await page.bringToFront().catch(() => {});
  await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(600);

  const info = await page.evaluate(eval(`() => {
    const sheets = [];
    for (const s of document.styleSheets) {
      let n = null, err = null;
      try { n = s.cssRules.length; } catch (e) { err = e.name; }
      sheets.push({ href: s.href, ownerTag: s.ownerNode ? s.ownerNode.tagName : null, readable: n !== null, ruleCount: n, err });
    }
    const adopted = (document.adoptedStyleSheets || []).length;
    let ls = {};
    try { for (let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); ls[k]=localStorage.getItem(k);} } catch(e){}
    return {
      url: location.href,
      dataTheme: document.documentElement.getAttribute("data-theme") || null,
      htmlClass: document.documentElement.className,
      hasThm: !!document.querySelector('#thm'),
      thmText: document.querySelector('#thm') ? document.querySelector('#thm').textContent.trim().slice(0,40) : null,
      localStorage: ls,
      sheets, adoptedStyleSheetCount: adopted
    };
  }`));
  return { tag, info };
}

const out = {};
for (const p of pages) {
  if (p.url().startsWith("http://localhost:3211")) out.reference = await recon(p, "reference");
  if (p.url().startsWith("http://localhost:3210")) out.build = await recon(p, "build");
}

// For each unreadable (cross-origin) sheet, fetch its text from Node (no CORS)
// and re-parse it with the browser's OWN CSSOM via a constructable stylesheet,
// to see whether the CSSOM path can be completed independently.
const refPage = pages.find((p) => p.url().startsWith("http://localhost:3211"));
const fetched = {};
for (const s of (out.reference?.info.sheets || [])) {
  if (s.href && !s.readable) {
    try {
      const r = await fetch(s.href);
      const text = await r.text();
      fetched[s.href] = { status: r.status, bytes: text.length };
      // re-parse in the browser CSSOM
      const n = await refPage.evaluate(eval(`(text) => {
        const sh = new CSSStyleSheet();
        sh.replaceSync(text);
        let style=0, atBlock=0, kf=0, frame=0, ff=0, other=0;
        const walk=(list)=>{ for(const r of list){ const c=r.constructor.name;
          if(c==='CSSStyleRule')style++;
          else if(c==='CSSKeyframesRule')kf++;
          else if(c==='CSSKeyframeRule')frame++;
          else if(c==='CSSFontFaceRule')ff++;
          else if(c==='CSSMediaRule'||c==='CSSSupportsRule'||c==='CSSLayerBlockRule'||c==='CSSContainerRule'){atBlock++; if(r.cssRules)walk(r.cssRules);}
          else other++; } };
        walk(sh.cssRules);
        return { total: sh.cssRules.length, style, atBlock, kf, frame, ff, other };
      }`), text);
      fetched[s.href].cssom = n;
    } catch (e) {
      fetched[s.href] = { error: String(e) };
    }
  }
}

out.fetchedCrossOrigin = fetched;
writeFileSync(".saa/evidence/recon-result.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await detach(browser);
