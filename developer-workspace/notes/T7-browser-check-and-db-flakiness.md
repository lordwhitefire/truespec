# T7 — the browser check, and the Neon cold-connection finding

**Date:** 2026-10-14 · **Layer:** TASK-003 key-and-hash follow-up, Task 7 (the proof)
**Status:** browser check ✅ PASS on the rebuilt demo — **with one environment caveat, recorded here.**

---

## 1. The run (the witness)

`node developer-workspace/scripts/task-003/browser-check.mjs` — attach-only on CDP `:9222`, both tabs on
the build `:3210` (office vs showroom, per the procedure's §7). Guard `chromium 6 → 6` (no launch).
No screenshots. Detached on exit. Exit code 0.

| verdict | result |
|---|---|
| every cell loaded (HTTP 200) on both surfaces | PASS — 40 cells (8 office × 2 screens · 6 public × 4 screens) |
| mileage is labelled in km wherever it appears — one unit | PASS — 26/40 cells show a mileage, units seen: `km` |
| the office and the showroom agree on the same car (TS-1001) at every shared cell | PASS — 4/4: office **₦34,500,000 / 31,000 km** = showroom **₦34,500,000 / 31,000 km** at w560/w820 × dark/light |
| no public surface renders an office state label, a cost figure, an asset reference or a customer's number | PASS — 24 public cells, none (prose "delivered fully cleared" on home is not a state) |
| the sold car (TS-1025) has left the showroom — no price, no section | PASS — 6 cells |

Evidence: `scripts/task-003/runs/browser-check/` (`surface-probe.json`, `surface-probe.txt`, per-screen
`compare-report.txt`). The Task 23 evidence was preserved first as `runs/browser-check-task23/`.

## 2. The caveat — the first run failed, and why

The **first** run of the same script the same day FAILED: `office-inventory` returned **500 on 5 of 8
cells**, which blanked the office side of the comparison. The dev log showed every 500 was
`NeonDbError … TypeError: fetch failed` → `AggregateError { code: 'ETIMEDOUT' }`, thrown from
`lib/office.ts` (`getOfficeCars`, `getOfficeStates`, `sectionsByState`, `getOfficeCounts`).

**Cause — the network path to Neon drops concurrent connections while cold.** Measured this session:

- raw TCP, 12 concurrent connects to the Neon host (IPv4): **3/12 dropped** (`000`), connect times 8–12 s.
- the Neon driver, 12 concurrent queries: 4/12 failed (`fetch failed`); sequential 20 queries: 19/20 (fast, ~200 ms).
- **warm-up curve** on `GET /office/inventory`: first concurrent burst `200 500 500 500 500`; by rounds
  4–6 all `200`. Once connections are established it is stable.

**Why the office page is hit hardest:** `app/office/(shell)/inventory/page.tsx:66` fires
`Promise.all([getOfficeCarViews(), getOfficeStates(), getOfficeCounts()])` — and `getOfficeCarViews`
itself is `Promise.all([getOfficeCars(), sectionsByState()])`, while `getOfficeCounts` calls
`getOfficeCarViews()` **again**. So one load opens **5 concurrent DB connections** (and runs
`getOfficeCars` twice). Under the cold-concurrency drop, that page fails first.

**Mitigation used:** warm the pool (20 sequential + a few concurrent `office/inventory` requests, until
5 consecutive `200`), then run the harness immediately. The run above is clean and its cell facts are
the real rendered surfaces.

## 3. Findings handed over

| finding | where |
|---|---|
| the neon endpoint flakily drops *concurrent, cold* connections; the office inventory page opens 5 per load, so it 500s on a cold start under a cold pool | environment / owner — **not** a code fault; production egress may differ |
| `getOfficeCarViews()` is computed twice per office-inventory load (page + `getOfficeCounts`) — a duplicated query | TASK-004 / perf — minor |
| the office pages have no graceful degradation: a transient DB blip 500s the whole screen | TASK-004 / design — worth considering |
| the four gates and witness b are **not yet run** for T7 in this session | next step |

## 4. What was NOT checked

- Look/CSS/pixels — no screenshots, by the procedure (the owner checks the look by hand).
- Interactive behaviour — not driven.
- Anything outside this layer's surface (the write layer is TASK-004's).
- The reference site (:3211) was not compared — §7 applies (the demo legitimately differs from the old
  site), so the witness is **build-office vs build-showroom**.
