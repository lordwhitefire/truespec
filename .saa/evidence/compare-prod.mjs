// compare-prod.mjs — the apples-to-apples build-side check.
// Extractor inventory of the STABLE production page  vs  my independent census
// of the same production page. Same normalization as the reference run.
import { readFileSync, writeFileSync } from "node:fs";

const normSel = (s) => (s || "")
  .replace(/\s+/g, " ").replace(/\s*,\s*/g, ",")
  .replace(/="([-\w]+)"/g, "=$1")
  .replace(/(^|[^:]):(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|part)\b/g, "$1::$2")
  .replace(/\s*([>+~])\s*/g, "$1").replace(/\*::/g, "::").trim();
const key = (u, s) => u + "||" + normSel(s);
const setOf = (rules) => { const m = new Map(); for (const r of rules) if (r.kind === "style") { const k = key(r.sheetURL, r.selector); m.set(k, (m.get(k) || 0) + 1); } return m; };
const diff = (a, b) => [...a.keys()].filter((k) => !b.has(k) || b.get(k) !== a.get(k));

const inv = JSON.parse(readFileSync(".saa/evidence/extract001-prod/build.json", "utf8"));
const ind = JSON.parse(readFileSync(".saa/evidence/independent-rules-build-prod.json", "utf8"));
const dev = JSON.parse(readFileSync("developer-workspace/scripts/runtime-ui-diff/runs/extract-001/build.json", "utf8"));

const rr = Object.values(inv.ruleRegistry);
const snap = inv.snapshots.default;
const bk = (rs) => { const o = {}; for (const r of rs) o[r.kind] = (o[r.kind] || 0) + 1; return o; };
const ps = (rs) => { const o = {}; for (const r of rs) o[r.sheetURL] = (o[r.sheetURL] || 0) + 1; return o; };

const invSet = setOf(rr), indSet = setOf(ind);
const onlyInv = diff(invSet, indSet), onlyInd = diff(indSet, invSet);

const devRR = Object.values(dev.ruleRegistry);
const devSet = setOf(devRR);

const out = {
  when: new Date().toISOString(),
  prodUrl: inv.url || snap.url,
  elementCount: { extractor: snap.countQSA, independentQSA: 177, match: snap.countQSA === 177 },
  ruleTotal: { extractor: rr.length, independent: ind.length, match: rr.length === ind.length },
  byKind: { extractor: bk(rr), independent: bk(ind), match: JSON.stringify(bk(rr)) === JSON.stringify(bk(ind)) },
  perSheet: { extractor: ps(rr), independent: ps(ind), match: JSON.stringify(ps(rr)) === JSON.stringify(ps(ind)) },
  styleSelectorSet: { extractorDistinct: invSet.size, independentDistinct: indSet.size, onlyInExtractor: onlyInv.length, onlyInIndependent: onlyInd.length, match: onlyInv.length === 0 && onlyInd.length === 0 },
  examples: { onlyInExtractor: onlyInv.slice(0, 10), onlyInIndependent: onlyInd.slice(0, 10) },
  savedDevInventory: { elementQSA: (dev.snapshots && (dev.snapshots.default || Object.values(dev.snapshots)[0]).countQSA), rules: devRR.length, styleSelectors: devSet.size },
  note: "Extractor build.json here was captured from the STABLE production server (:3212). The 'savedDevInventory' is the original build.json captured from `next dev` (:3210) — shown only to explain why the dev snapshot could not be verified."
};
writeFileSync(".saa/evidence/build-prod-check.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
