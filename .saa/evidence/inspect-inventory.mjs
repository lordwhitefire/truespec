// inspect-inventory.mjs — read the inventory's shape (read-only).
import { readFileSync } from "node:fs";
const INV = "developer-workspace/scripts/runtime-ui-diff/runs/extract-001";
const ref = JSON.parse(readFileSync(`${INV}/reference.json`, "utf8"));
const meta = JSON.parse(readFileSync(`${INV}/meta.json`, "utf8"));

const out = {};
out.topKeys = Object.keys(ref);
out.ruleRegistryLen = Object.keys(ref.ruleRegistry).length;
const rr = Object.values(ref.ruleRegistry);
const byKind = {};
for (const r of rr) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
out.ruleRegistryByKind = byKind;

// sample entries
out.sampleRules = rr.slice(0, 4).map((r) => ({
  sig: r.sig, kind: r.kind, selector: r.selector, sheetURL: r.sheetURL,
  matchedInStates: r.matchedInStates, unmatchable: r.unmatchable,
  firstSeen: r.firstSeen, inactiveConds: r.inactiveConds
}));

// what sheetURL looks like for the inline sheet vs cross-origin
const sheetURLs = {};
for (const r of rr) sheetURLs[r.sheetURL] = (sheetURLs[r.sheetURL] || 0) + 1;
out.sheetURLHistogram = sheetURLs;

// how a rule records usage + reason
const usedSample = rr.find((r) => r.used === false) || null;
out.usedSample = usedSample ? { sig: usedSample.sig, keys: Object.keys(usedSample), value: usedSample } : "no used===false";
out.ruleKeys = Object.keys(rr[0]);

// planted rule
out.plant = ref.plant;
out.firstMatchedNewly = ref.firstMatchedNewly;
out.closedListSize = ref.closedListSize;
out.closedListLen = ref.closedList.length;

// snapshot / element shape
const snaps = ref.snapshots || {};
const snapKeys = Object.keys(snaps);
out.snapshotShape = Array.isArray(ref.snapshots) ? "array" : typeof ref.snapshots;
out.snapshotKeys = snapKeys;
out.snapshots = Array.isArray(snaps)
  ? snaps.map((s) => ({ state: s.state, countQSA: s.countQSA, closedLen: (s.closed || []).length }))
  : Object.fromEntries(snapKeys.map((k) => {
      const s = snaps[k];
      return [k, { countQSA: s && s.countQSA, closedLen: s && (s.closed || []).length, els: s && s.elements && s.elements.length }];
    }));
const firstSnap = Array.isArray(snaps) ? snaps[0] : snaps[snapKeys[0]];
const el = firstSnap ? firstSnap.elements && firstSnap.elements[0] : (ref.elements && ref.elements[0]);
out.elementSample = el ? { elKeys: Object.keys(el), path: el.path, valsLen: (el.vals || []).length, cls: el.cls, id: el.id, tag: el.tag } : null;
// keep output small: drop giant unrelated blobs
delete out.closedList;
const rr2 = Object.values(ref.ruleRegistry).find((r) => r.used === false);
out.usedFalseKeys = rr2 ? Object.keys(rr2) : "none";
out.usedFalseSample = rr2 ? { sig: rr2.sig, used: rr2.used, reason: rr2.reason, unmatchable: rr2.unmatchable, matchedInStates: rr2.matchedInStates } : null;
const rr3 = Object.values(ref.ruleRegistry)[0];
out.allRuleKeyNames = Object.keys(rr3);
out.states = ref.states;
out.coverage = ref.coverage;
out.handlerCount = ref.handlerCount;
out.inlineHandlers = ref.inlineHandlers;
out.propsOnlyInDrivenStates = ref.propsOnlyInDrivenStates;
out.meta = meta;

console.log(JSON.stringify(out, null, 2));
