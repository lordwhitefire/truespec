// Cleanup readiness — the witness for TASK-003 Task 19.
//
// Prints what the store says is waiting to be cleared, and nothing else. It reads; it removes
// nothing. No code path in this project removes a record (task.md truth 10 / line 154).
//
//   node --env-file=.env.local --conditions=react-server --import tsx scripts/cleanup-readiness.ts
//
// Verification (plan, Task 19): "the helper lists the demo cases; no code path removes a record."

import { listWaitingToBeCleared } from '../lib/cleanup';

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(Math.max(title.length, 40)));
}

async function main(): Promise<void> {
  const w = await listWaitingToBeCleared();

  console.log('TASK-003 — what is waiting to be cleared, as it stands');
  console.log('========================================================================');
  console.log(
    `asset store: ${
      w.assetStore.readable
        ? `${w.assetStore.assets} asset(s) readable`
        : (w.assetStore.note ?? 'unreadable')
    }`
  );

  section('1. a car the owner deleted (the tombstone, and what goes with it)');
  if (w.deletedCars.length === 0) {
    console.log('   none — the store holds no deleted car. Nothing here is hidden from him.');
  } else {
    for (const c of w.deletedCars) {
      console.log(
        `   ${c.ref}  ${c.name}  deleted ${c.deletedAt.slice(0, 10)} (${c.ageDays} day(s) ago)`
      );
      console.log(
        `        goes with it: ${c.photos} photo(s)` +
          `${c.photoAssets.length ? ` — ${c.photoAssets.length} asset(s)` : ''}, ` +
          `${c.costLines} cost line(s)${c.sold ? ', the sale recorded for it' : ''}`
      );
    }
  }

  section('2. an enquiry recorded at its year');
  if (w.enquiriesAtTheirYear.length === 0) {
    console.log('   none — every enquiry is younger than a year.');
  } else {
    for (const e of w.enquiriesAtTheirYear) {
      console.log(`   ${e.id}`);
      console.log(
        `        ${e.name ?? '(no name)'} · ${e.number ?? '(no number)'} · asked for: ${e.askedFor ?? '(nothing recorded)'}`
      );
      console.log(`        recorded ${e.recordedAt.slice(0, 10)} — ${e.ageDays} day(s) ago`);
    }
  }
  console.log("   the clock is the row's own created_at — retention runs from creation");

  section('3. the asset store and the rows that hold an address');
  console.log(`   asset store: ${w.assetStore.assets} asset(s)`);
  console.log(`   rows that hold an address: ${w.rowsHoldingAnAddress.length}`);

  section('4. a row pointing at an asset the store does not hold');
  if (!w.assetStore.readable) {
    console.log('   not checked — the asset store could not be read (see the line at the top).');
  } else if (w.rowsPointingAtMissingAssets.length === 0) {
    console.log('   none — every referenced asset is in the store.');
  } else {
    for (const r of w.rowsPointingAtMissingAssets) {
      console.log(
        `   ${r.rowKind} ${r.rowId} (${r.ref ?? '—'}) names ${r.assetId} — not in the store`
      );
    }
  }

  section('5. rows still holding a third-party address (not ours to clear)');
  if (w.rowsHoldingAnAddress.length === 0) {
    console.log('   none — every stored image and file is an asset reference.');
  } else {
    const byRef = new Map<string, number>();
    for (const r of w.rowsHoldingAnAddress) {
      const key = r.ref ?? `(${r.rowKind})`;
      byRef.set(key, (byRef.get(key) ?? 0) + 1);
    }
    console.log(
      `   ${w.rowsHoldingAnAddress.length} row(s) on ${byRef.size} car(s): ` +
        [...byRef].map(([ref, n]) => `${ref}(${n})`).join(' ')
    );
    console.log(
      '   a row is either a reference or an address — never both. Addresses go at the rebuild.'
    );
  }

  section("6. the machine's own litter — the only things a job may clear");
  console.log(`   assets no row references: ${w.machineLitter.unreferenced.length}`);
  for (const a of w.machineLitter.unreferenced) {
    console.log(`        ${a.kind} ${a.assetId} ${a.filename ?? ''} (${a.bytes} byte(s))`);
  }
  console.log(`   sign-in attempts past 90 days: ${w.machineLitter.staleAuthAttempts}`);

  console.log('\n========================================================================');
  console.log('Nothing above is removed by this script, or by any code path in the application.');
  console.log('The owner clears, by his own hand, through the office.');
}

main().catch((err) => {
  console.error('cleanup-readiness error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
