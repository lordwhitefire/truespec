// car-compare.mjs — RECON-001 car-page runtime HTML + CSS comparison.
// Reuses analyzeSide/PROPS from screen-compare.mjs (plan §5). The car page has no
// inventory grid, so it supplies its own readiness predicate and a car-shaped extra
// extraction. Read-only: navigates and reads. Nothing here writes to the app.
import { analyzeSide, PROPS } from "./screen-compare.mjs";

// Ready when the car page has painted its heading (ref #crumb/#ti, build h1) — either side.
export const CAR_READY = `(() => {
  const crumb = document.querySelector("#crumb");
  const h1 = document.querySelector("h1");
  return (crumb && crumb.textContent.trim().length > 0) || (h1 && h1.textContent.trim().length > 0);
})()`;

// Car-shaped structural extraction. Runs in the page; must not close over anything.
export function carExtra() {
  const q = (s) => document.querySelector(s);
  const txt = (s) => {
    const el = typeof s === "string" ? document.querySelector(s) : s;
    return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : null;
  };
  const all = (s) => [...document.querySelectorAll(s)];
  const vis = (s) => {
    const el = q(s);
    return el ? getComputedStyle(el).display !== "none" : false;
  };
  const thumbSel = "#thumbs button, .gallery .thumbs img";
  const thumbs = all(thumbSel);
  return {
    car: {
      crumb: txt("#crumb"),
      h1: txt("h1"),
      ti: txt("#ti"),
      chipsWrap: !!q("#chips, .chips"),
      chips: all(".chips .chip, #chips .chip").map((c) => ({
        tag: c.tagName.toLowerCase(),
        cls: c.className,
        text: (c.textContent || "").replace(/\s+/g, " ").trim(),
      })),
      speak: txt("#speak, .speak"),
      gallery: {
        present: !!q("#gal, .gallery"),
        mainSrc: (q("#gal img, .gallery .stage img") || {}).getAttribute
          ? q("#gal img, .gallery .stage img").getAttribute("src")
          : null,
        thumbs: thumbs.length,
        activeThumb: thumbs.findIndex((b) => b.classList.contains("on") || b.getAttribute("data-active") === "true"),
        counter: txt("#cn"),
        rib: txt("#rib"),
        prevBtn: !!q("#gal .gb.l, .gallery .arrow.prev"),
        nextBtn: !!q("#gal .gb.r, .gallery .arrow.next"),
      },
      litebox: { present: !!q("#lb, .lb"), open: q("#lb") ? q("#lb").classList.contains("open") : null },
      tabs: {
        present: !!q("#tabs"),
        buttons: all("#tabs button").map((b) => ({
          text: (b.textContent || "").replace(/\s+/g, " ").trim(),
          selected: b.getAttribute("aria-selected"),
        })),
        bar: !!q("#bar"),
        panels: all(".pn").map((p) => ({ id: p.id, on: p.classList.contains("on") })),
      },
      aside: {
        present: !!q(".aside"),
        price: txt(".pc .num, .big-price"),
        was: txt(".pc s, .big-price .was"),
        savings: txt("#sv"),
        savingsHidden: q("#sv") ? q("#sv").hidden : null,
        waTxt: txt("#waTxt"),
        offer: txt("#of"),
        viewing: txt("#vw"),
        specRows: all(".spec div, .specs li").length,
        specText: all(".spec div, .specs li").map((r) => (r.textContent || "").replace(/\s+/g, " ").trim()),
        trust: all(".trust p").map((p) => (p.textContent || "").replace(/\s+/g, " ").trim()),
      },
      related: {
        present: !!q(".rel"),
        heading: txt("#rt"),
        cards: all("#rt2 .rc, .related .rc").length,
        labels: all("#rt2 .rc h3, .related .rc h3").map((h) => (h.textContent || "").replace(/\s+/g, " ").trim()),
        railButtons: all(".rn button").length,
      },
      mbar: {
        present: !!q("#mbar, .mbar"),
        display: q("#mbar") ? getComputedStyle(q("#mbar")).display : null,
        visible: vis("#mbar"),
        price: txt("#mp"),
        txt: txt("#mwTxt"),
      },
      modal: {
        present: !!q("#ovl, .ovl"),
        hidden: q("#ovl") ? q("#ovl").hidden : null,
        title: txt("#mtitle"),
      },
      stoast: !!q("#stoast, .stoast"),
      ptoast: !!q("#ptoast, .ptoast"),
      themeToggle: !!q("#thm, .thm"),
      notice: txt(".notice"),
      detailBlocks: { p1: !!q("#p1"), p2: !!q("#p2"), p3: !!q("#p3") },
      features: all(".feature-list li, #p2 .fl li").length,
    },
  };
}

export async function analyzeCar(browser, url, { width, mode }) {
  return analyzeSide(browser, url, { width, mode, ready: CAR_READY, extra: carExtra });
}

const s = (v) => (v === undefined ? "<absent>" : v === null ? "<null>" : String(v));
const yn = (v) => (v ? "yes" : "no");
const line = (P, label, ref, build) => P(`${label}  ref=${s(ref)}  build=${s(build)}${String(ref) === String(build) ? "  MATCH" : "  DIFF"}`);

export function renderCarCompare(ref, build, width, mode, label = "Car") {
  const out = [];
  const P = (x = "") => out.push(x);
  const R = ref.car, B = build.car;

  P(`# ${label} runtime comparison @ ${width}px, ${mode}`);
  P(`ref   : ${ref.url}`);
  P(`build : ${build.url}`);
  P();
  P(`## Load`);
  P(`ref   HTTP ${ref.status}  rendered=${ref.rendered}  failed-requests=${ref.failed.length}`);
  P(`build HTTP ${build.status}  rendered=${build.rendered}  failed-requests=${build.failed.length}`);
  P();
  P(`## Page`);
  line(P, `title`, ref.title, build.title);
  line(P, `total elements`, ref.totalEls, build.totalEls);
  P();
  P(`## Landmarks / element counts (ref/build)`);
  const tags = [...new Set([...Object.keys(ref.tagCount), ...Object.keys(build.tagCount)])];
  const tagDiffs = tags.filter((t) => ref.tagCount[t] !== build.tagCount[t]);
  for (const t of tagDiffs) P(`${t}: ref=${ref.tagCount[t]}  build=${build.tagCount[t]}`);
  if (!tagDiffs.length) P("(no count differences)");
  P(`all: ` + tags.map((t) => `${t}:${ref.tagCount[t]}/${build.tagCount[t]}`).join(" "));
  P();

  P(`## Breadcrumb`);
  line(P, `#crumb`, R.crumb, B.crumb);
  P();
  P(`## Title`);
  line(P, `h1`, R.h1, B.h1);
  line(P, `#ti (ref only)`, R.ti, B.ti);
  P();
  P(`## Chips row (#chips)`);
  line(P, `chips wrapper present`, yn(R.chipsWrap), yn(B.chipsWrap));
  line(P, `chip count`, R.chips.length, B.chips.length);
  const cn = Math.max(R.chips.length, B.chips.length);
  for (let i = 0; i < cn; i++) {
    const a = R.chips[i], b = B.chips[i];
    P(`  ${i + 1}: ref=${a ? `"${a.text}" [${a.tag}.${a.cls}]` : "<none>"}   build=${b ? `"${b.text}" [${b.tag}.${b.cls}]` : "<none>"}`);
  }
  P();
  P(`## Speak line (Umar's in-view answer)`);
  line(P, `speak`, R.speak, B.speak);
  P();
  P(`## Gallery`);
  line(P, `gallery present`, yn(R.gallery.present), yn(B.gallery.present));
  line(P, `main image src`, R.gallery.mainSrc, B.gallery.mainSrc);
  line(P, `thumbnail count`, R.gallery.thumbs, B.gallery.thumbs);
  line(P, `active thumb index`, R.gallery.activeThumb, B.gallery.activeThumb);
  line(P, `counter (#cn)`, R.gallery.counter, B.gallery.counter);
  line(P, `corner ribbon (#rib)`, R.gallery.rib, B.gallery.rib);
  line(P, `prev button`, yn(R.gallery.prevBtn), yn(B.gallery.prevBtn));
  line(P, `next button`, yn(R.gallery.nextBtn), yn(B.gallery.nextBtn));
  line(P, `lightbox present`, yn(R.litebox.present), yn(B.litebox.present));
  P();
  P(`## Details tabs`);
  line(P, `tabs present`, yn(R.tabs.present), yn(B.tabs.present));
  line(P, `tab buttons`, R.tabs.buttons.map((b) => b.text).join(" | ") || "(none)", B.tabs.buttons.map((b) => b.text).join(" | ") || "(none)");
  line(P, `sliding bar (#bar)`, yn(R.tabs.bar), yn(B.tabs.bar));
  line(P, `panels`, R.tabs.panels.map((p) => `${p.id}${p.on ? "*" : ""}`).join(",") || "(none)", B.tabs.panels.map((p) => `${p.id}${p.on ? "*" : ""}`).join(",") || "(none)");
  P();
  P(`## Desktop aside (price / CTAs / specs / trust)`);
  line(P, `aside present`, yn(R.aside.present), yn(B.aside.present));
  line(P, `price`, R.aside.price, B.aside.price);
  line(P, `was/crossed price`, R.aside.was, B.aside.was);
  line(P, `savings line (#sv)`, R.aside.savings, B.aside.savings);
  line(P, `savings hidden`, s(R.aside.savingsHidden), s(B.aside.savingsHidden));
  line(P, `WhatsApp CTA text`, R.aside.waTxt, B.aside.waTxt);
  line(P, `offer CTA`, R.aside.offer, B.aside.offer);
  line(P, `viewing CTA`, R.aside.viewing, B.aside.viewing);
  line(P, `spec rows`, R.aside.specRows, B.aside.specRows);
  P(`  ref spec   : [${R.aside.specText.join(" ; ")}]`);
  P(`  build spec : [${B.aside.specText.join(" ; ")}]`);
  line(P, `trust items`, R.aside.trust.length, B.aside.trust.length);
  P();
  P(`## Related rail`);
  line(P, `related present`, yn(R.related.present), yn(B.related.present));
  line(P, `heading (#rt)`, R.related.heading, B.related.heading);
  line(P, `cards`, R.related.cards, B.related.cards);
  line(P, `rail prev/next buttons`, R.related.railButtons, B.related.railButtons);
  P(`  ref cards: [${R.related.labels.join(" ; ")}]`);
  P(`  build cards: [${B.related.labels.join(" ; ")}]`);
  P();
  P(`## Mobile bar / modal / toasts / theme`);
  line(P, `mbar present`, yn(R.mbar.present), yn(B.mbar.present));
  line(P, `mbar display`, s(R.mbar.display), s(B.mbar.display));
  line(P, `mbar price`, R.mbar.price, B.mbar.price);
  line(P, `mbar text`, R.mbar.txt, B.mbar.txt);
  line(P, `covering modal present`, yn(R.modal.present), yn(B.modal.present));
  line(P, `stop toast present`, yn(R.stoast), yn(B.stoast));
  line(P, `proof toast present`, yn(R.ptoast), yn(B.ptoast));
  line(P, `theme toggle`, yn(R.themeToggle), yn(B.themeToggle));
  P();
  P(`## Detail blocks / features`);
  line(P, `#p1/#p2/#p3 present`, `${yn(R.detailBlocks.p1)}/${yn(R.detailBlocks.p2)}/${yn(R.detailBlocks.p3)}`, `${yn(B.detailBlocks.p1)}/${yn(B.detailBlocks.p2)}/${yn(B.detailBlocks.p3)}`);
  line(P, `feature items`, R.features, B.features);
  line(P, `on-order notice`, R.notice, B.notice);
  P();
  P(`## Headings`);
  P(`ref   [${ref.headings.length}]: ${ref.headings.join(" | ")}`);
  P(`build [${build.headings.length}]: ${build.headings.join(" | ")}`);
  P();
  P(`## Shared ids (tag[type])`);
  const wanted = ["crumb", "ti", "chips", "speak", "gal", "gi", "cn", "rib", "thumbs", "tabs", "bar", "p1", "p2", "p3", "wa", "waTxt", "of", "vw", "spec", "rt", "rt2", "mbar", "mp", "mw", "mwTxt", "lb", "li", "stoast", "ovl", "mx", "mtitle", "ptoast", "thm"];
  for (const id of wanted) {
    const a = ref.ids[id], b = build.ids[id];
    const f = (x) => (x ? `${x.tag}${x.type ? `[${x.type}]` : ""}` : "<absent>");
    P(`${id}: ref=${f(a)}  build=${f(b)}${a && b && f(a) !== f(b) ? "  DIFF" : ""}`);
  }
  P();
  P(`## :root token differences`);
  const allVars = new Set([...Object.keys(ref.rootVars), ...Object.keys(build.rootVars)]);
  let vd = 0;
  for (const k of [...allVars].sort()) {
    const a = ref.rootVars[k], b = build.rootVars[k];
    if (a !== b) { vd++; P(`${k}\n    ref   = ${s(a)}\n    build = ${s(b)}`); }
  }
  if (!vd) P("(no token differences)");
  P();
  P(`## Classes present in the reference but not the build`);
  const missingInBuild = Object.keys(ref.classes).sort().filter((c) => !build.classes[c]);
  P(missingInBuild.length ? missingInBuild.join(", ") : "(none)");
  P();
  P(`## Build-only classes`);
  const buildOnly = Object.keys(build.classes).sort().filter((c) => !ref.classes[c]);
  P(buildOnly.length ? buildOnly.join(", ") : "(none)");
  P();
  P(`## Per-class computed-style differences (classes shared by both)`);
  const classDiffs = [];
  for (const c of Object.keys(ref.classes).sort()) {
    const b = build.classes[c];
    if (!b) continue;
    const a = ref.classes[c].snap, bs = b.snap;
    if (!a || !bs) continue;
    const ds = [];
    for (const p of PROPS) if (a[p] !== bs[p]) ds.push([p, a[p], bs[p]]);
    if (ds.length) classDiffs.push({ c, ds, a, bs });
  }
  classDiffs.sort((x, y) => y.ds.length - x.ds.length);
  for (const { c, ds, a, bs } of classDiffs) {
    P(`### .${c}   (ref ${a.__tag} ${a.__rect} | build ${bs.__tag} ${bs.__rect})`);
    for (const [p, x, y] of ds) P(`    ${p}: ref="${x}"  build="${y}"`);
  }
  if (!classDiffs.length) P("(no shared-class style differences)");
  P();
  P(`## Class count differences (same class, different number of elements)`);
  let cd = 0;
  for (const c of Object.keys(ref.classes).sort()) {
    const b = build.classes[c];
    if (!b) continue;
    if (ref.classes[c].count !== b.count) { cd++; P(`.${c}: ref=${ref.classes[c].count}  build=${b.count}`); }
  }
  if (!cd) P("(no count differences)");
  P();
  P(`## Console / JS + failed requests`);
  for (const [name, r] of [["REF", ref], ["BUILD", build]]) {
    const interesting = r.logs.filter((l) => !/\[Fast Refresh\]|Download the React DevTools|DevTools/.test(l));
    P(`${name}: ${interesting.length} console message(s), ${r.failed.length} failed request(s)`);
    for (const l of interesting.slice(0, 40)) P(`    ${l}`);
    for (const f of r.failed.slice(0, 20)) P(`    HTTP ${f}`);
  }
  P();
  return out.join("\n");
}

// ---- standalone CLI (one browser, one cell) ----
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , refUrl, buildUrl, widthArg = "1100", mode = "dark", outFile] = process.argv;
  if (!refUrl || !buildUrl) {
    console.error("usage: node car-compare.mjs <refUrl> <buildUrl> [width] [dark|light] [outFile]");
    process.exit(2);
  }
  const { chromium } = await import("playwright-core");
  const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const ref = await analyzeCar(browser, refUrl, { width: Number(widthArg), mode });
    const build = await analyzeCar(browser, buildUrl, { width: Number(widthArg), mode });
    const md = renderCarCompare(ref, build, Number(widthArg), mode);
    if (outFile) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(outFile, md);
      console.log(`wrote ${outFile}`);
    } else {
      console.log(md);
    }
  } finally {
    await browser.close();
  }
  process.exit(0);
}
