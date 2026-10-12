import { readFileSync } from "node:fs";
const INV = "developer-workspace/scripts/runtime-ui-diff/runs/extract-001";
const ref = JSON.parse(readFileSync(`${INV}/reference.json`, "utf8"));

const snaps = ref.snapshots;
const snapKeys = Object.keys(snaps);
const s0 = snaps[snapKeys[0]];
console.log("snapKeys:", snapKeys);
console.log("snapshot keys:", Object.keys(s0));
console.log("top closedList len:", ref.closedList.length, "closedListSize:", ref.closedListSize);
console.log("s0.closed len:", s0.closed && s0.closed.length);
console.log("s0.elements len:", s0.elements && s0.elements.length);
console.log("s0.elements[0] keys:", s0.elements && Object.keys(s0.elements[0]));
const vlen = {}; for (const e of s0.elements) vlen[(e.vals || []).length] = (vlen[(e.vals || []).length] || 0) + 1;
console.log("vals length distribution:", JSON.stringify(vlen));
console.log("top.closedList == s0.closed (order)?", JSON.stringify(ref.closedList) === JSON.stringify(s0.closed));
// set equality
const a = new Set(ref.closedList), b = new Set(s0.closed);
console.log("onlyInTop:", [...a].filter((x) => !b.has(x)).length, "onlyInSnap:", [...b].filter((x) => !a.has(x)).length);

// <absent> occurrences across all snapshots
let absent = 0, nulls = 0, empties = 0, valsCount = 0;
for (const k of snapKeys) for (const e of (snaps[k].elements || [])) for (const v of (e.vals || [])) {
  valsCount++;
  if (v === "<absent>") absent++;
  else if (v === null) nulls++;
  else if (v === "") empties++;
}
console.log("total vals:", valsCount, "-> '<absent>':", absent, "null:", nulls, "'' :", empties);

// what does an absent look like? find an element+prop that's absent
outer67: for (const k of snapKeys) {
  const cl = snaps[k].closed;
  for (const e of (snaps[k].elements || [])) {
    for (let i = 0; i < cl.length; i++) {
      const v = e.vals[i];
      if (v === "<absent>" || v === null || v === "") { console.log("example absent-ish:", k, e.path, cl[i], JSON.stringify(v)); break outer67; }
    }
  }
}
// distinct property names that are ever "<absent>"
const absentProps = new Set();
for (const k of snapKeys) { const cl = snaps[k].closed; for (const e of (snaps[k].elements || [])) for (let i = 0; i < cl.length; i++) if (e.vals[i] === "<absent>") absentProps.add(cl[i]); }
console.log("distinct <absent> props:", absentProps.size, [...absentProps].slice(0, 10));

console.log("\n--- comparison.json ---");
const comp = JSON.parse(readFileSync(`${INV}/comparison.json`, "utf8"));
console.log(JSON.stringify(comp, null, 1).slice(0, 2500));

console.log("\n--- ledger parse ---");
const led = readFileSync(`${INV}/reference-rule-ledger.txt`, "utf8").split("\n");
const ruleLines = led.filter((l) => /^\[/.test(l));
const reasonLines = led.filter((l) => /^\s+reason:/.test(l));
const stateLines = led.filter((l) => /^\s+states:/.test(l));
console.log("ruleLines:", ruleLines.length, "reasonLines:", reasonLines.length, "stateLines:", stateLines.length);
const cat = {};
for (const l of reasonLines) {
  const r = l.replace(/^\s+reason:\s*/, "");
  let c = "other";
  if (/^used/.test(r)) c = "used";
  else if (/no element matched/.test(r)) c = "noElement";
  else if (/inactive|media|support/i.test(r)) c = "inactiveCond";
  else if (/unmatchable/i.test(r)) c = "unmatchable";
  else if (/^n\/a/.test(r)) c = "n/a";
  cat[c] = (cat[c] || 0) + 1;
}
console.log("reason categories:", JSON.stringify(cat));
const usedLines = ruleLines.filter((l) => /USED/.test(l));
const unusedLines = ruleLines.filter((l) => /\bunused\b/.test(l));
console.log("USED rule lines:", usedLines.length, "unused rule lines:", unusedLines.length);
// kinds on rule lines
const kindCount = {};
for (const l of ruleLines) { const m = l.match(/^\[([^\]]+)\]/); if (m) kindCount[m[1]] = (kindCount[m[1]] || 0) + 1; }
console.log("rule-line kinds:", JSON.stringify(kindCount));
// sample unused non-style reasons
const unusual = led.filter((l) => /^\s+reason:/.test(l)).filter((l) => !/used|no element matched|@font-face|@keyframes|@media|unmatchable/i.test(l));
console.log("unusual reasons sample:", unusual.slice(0, 8));
