import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

const N = (naira: number) => Math.round(naira * 100); // naira -> kobo (integer)

// THE demo fleet (task.md Task 9 — approved by the owner 2026-10-13,
// `developer-workspace/plans/TASK-003-demo-fleet.md`). Seventeen cars, every one
// taken from the public list, so every one already has photographs. Mileage is in
// km — the unit a buyer reads here; a car that has not landed is 0.
//
// It is shaped so every office state has something in it, all three showroom
// sections look full, one car is sold, and one car's costs are genuinely
// incomplete rather than merely displayed as such.
type DemoCar = {
  ref: string;
  brand: string;
  model: string;
  trim: string;
  year: number;
  exterior: string;
  interior: string;
  mileage: number;
  price: number; // kobo
  was: number; // kobo, 0 = no "was" price
  state: string; // car_state label: Available | On the way | At port | Cleared | Landed
  features: string[];
  arrivalNote?: string;
  sold?: string; // ISO date — a sale row, which is what hides it from the showroom
  // Cost lines deliberately not yet entered. A car still on the water has not paid
  // Nigerian trucking or filled its tank; TS-1018 is furthest out, so neither.
  missingCosts?: readonly string[];
};

const DEMO: DemoCar[] = [
  // Available — on the lot, fully costed (7)
  { ref: "TS-1001", brand: "Toyota", model: "Camry", trim: "XSE V6", year: 2021, exterior: "Obsidian black", interior: "Black", mileage: 31000, price: N(34_500_000), was: 0, state: "Available", features: ["Panoramic roof", "Leather upholstery", "Heated and ventilated front seats", "Apple CarPlay and Android Auto", "JBL 9-speaker audio", "Adaptive cruise control", "Quad exhaust tips"] },
  { ref: "TS-1003", brand: "Lexus", model: "RX 350", trim: "F Sport", year: 2020, exterior: "Sonic grey", interior: "Black", mileage: 41000, price: N(52_000_000), was: 0, state: "Available", features: ["F Sport body kit", "20-inch alloy wheels", "Adaptive variable suspension", "Heated and ventilated front seats", "Lexus Premium Sound", "Panoramic roof", "Power tailgate"] },
  { ref: "TS-1005", brand: "BMW", model: "X5", trim: "xDrive40i", year: 2021, exterior: "Alpine white", interior: "Black", mileage: 34000, price: N(88_000_000), was: 0, state: "Available", features: ["M Sport package", "Head-up display", "Parking Assistant", "Heated front seats", "Harman Kardon audio", "Panoramic roof", "Adaptive M suspension"] },
  { ref: "TS-1007", brand: "Honda", model: "Accord", trim: "Touring", year: 2021, exterior: "Graphite", interior: "Black", mileage: 29000, price: N(38_000_000), was: 0, state: "Available", features: ["Wireless charging", "Adaptive cruise control", "Sunroof", "Heated front seats", "12-speaker audio", "Head-up display", "Blind spot monitoring"] },
  { ref: "TS-1008", brand: "Toyota", model: "RAV4 Prime", trim: "SE", year: 2022, exterior: "Wind chill pearl", interior: "Black", mileage: 12000, price: N(45_500_000), was: N(50_900_000), state: "Available", features: ["Plug-in hybrid", "18-inch alloy wheels", "Heated front seats", "Power tailgate", "Blind spot monitoring", "Qi wireless charging", "JBL audio"] },
  { ref: "TS-1011", brand: "Mercedes-Benz", model: "C 300", trim: "AMG Line", year: 2018, exterior: "Obsidian black", interior: "Black", mileage: 71000, price: N(29_500_000), was: N(33_000_000), state: "Available", features: ["AMG Line exterior", "Dual-zone climate", "Sunroof", "Garage door opener", "Heated front seats", "Burmester audio", "Keyless entry"] },
  { ref: "TS-1012", brand: "BMW", model: "X3", trim: "xDrive30i", year: 2019, exterior: "Santorini black", interior: "Black", mileage: 58000, price: N(41_000_000), was: 0, state: "Available", features: ["Adaptive suspension", "Panoramic roof", "Heated front seats", "Harman Kardon audio", "LED headlights", "Parking Assistant", "Leather upholstery"] },

  // On the way — bought, on the water, an arrival note each (3)
  { ref: "TS-1013", brand: "Range Rover", model: "Sport", trim: "HSE", year: 2021, exterior: "Fuji white", interior: "Black", mileage: 0, price: N(115_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: November", missingCosts: ["full_tank"], features: ["Meridian Signature audio", "Terrain Response", "Adaptive air suspension", "Panoramic roof", "Heated and ventilated front seats", "Power tailgate", "21-inch alloy wheels"] },
  { ref: "TS-1014", brand: "Porsche", model: "Macan", trim: "S", year: 2021, exterior: "Gentian blue", interior: "Black", mileage: 0, price: N(96_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: December", features: ["Sport Chrono package", "Bose Surround Sound", "20-inch alloy wheels", "Adaptive air suspension", "Heated front seats", "Power panoramic roof", "Lane change assist"] },
  { ref: "TS-1018", brand: "BMW", model: "X7", trim: "xDrive40i", year: 2022, exterior: "Alpine white", interior: "Black", mileage: 0, price: N(128_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: January", missingCosts: ["trucking_ng", "full_tank"], features: ["Six seats with captain's chairs", "Panoramic roof", "Harman Kardon audio", "Heated front seats", "Driving Assistance Pro", "Air suspension", "Power tailgate"] },

  // At port — cleared customs paperwork, not yet released (2)
  { ref: "TS-1015", brand: "Toyota", model: "Land Cruiser Prado", trim: "VX", year: 2022, exterior: "Alpine white", interior: "Tan", mileage: 0, price: N(92_000_000), was: 0, state: "At port", arrivalNote: "Expected arrival: January", features: ["Full-time four wheel drive", "Low range", "Leather upholstery", "Powered tailgate", "Moonroof", "Heated front seats", "Multi-terrain select"] },
  { ref: "TS-1016", brand: "Chevrolet", model: "Tahoe", trim: "LT", year: 2020, exterior: "Summit white", interior: "Black", mileage: 0, price: N(74_000_000), was: 0, state: "At port", arrivalNote: "Expected arrival: November", features: ["Rear entertainment system", "Third row seats", "Power liftgate", "Heated second row seats", "Bose audio", "Safety alert system", "Remote start"] },

  // Cleared — the completed gap between At port and Landed (1)
  { ref: "TS-1017", brand: "Ford", model: "F-150", trim: "Lariat", year: 2021, exterior: "Oxford white", interior: "Black", mileage: 0, price: N(68_000_000), was: 0, state: "Cleared", arrivalNote: "Expected arrival: November", features: ["Pro Power Onboard generator", "Tow package", "Four wheel drive", "B&O audio", "Heated and cooled front seats", "Bed liner", "360-degree camera"] },

  // Landed — this year's group (Landed carries is_new_arrival) (3)
  { ref: "TS-1019", brand: "Lexus", model: "RX 350", trim: "350", year: 2019, exterior: "Celestial silver", interior: "Black", mileage: 64000, price: N(44_500_000), was: 0, state: "Landed", features: ["Leather upholstery", "Heated and ventilated front seats", "Power tailgate", "Blind spot monitoring", "LED headlights", "Roof rails", "Dual-zone climate"] },
  { ref: "TS-1020", brand: "Honda", model: "CR-V", trim: "EX-L", year: 2020, exterior: "Platinum white", interior: "Black", mileage: 48000, price: N(36_000_000), was: 0, state: "Landed", features: ["Leather upholstery", "Panoramic sunroof", "Power tailgate", "Heated front seats", "Honda Sensing safety suite", "Wireless charging", "12-speaker audio"] },
  { ref: "TS-1023", brand: "Mercedes-Benz", model: "E 350", trim: "350", year: 2020, exterior: "Obsidian black", interior: "Tan", mileage: 39000, price: N(48_000_000), was: N(52_500_000), state: "Landed", features: ["Burmester 3D audio", "Ambient lighting", "Heated front seats", "Wireless charging", "Air suspension", "Panoramic sunroof", "Driver Assistance package"] },

  // Sold — the sale row is what un-lists it; `car_state` has no Sold label and the
  // office derives the sold condition from `sale` + `sold_at` (lib/office.ts).
  { ref: "TS-1025", brand: "Honda", model: "Civic", trim: "EX", year: 2021, exterior: "Sonic grey", interior: "Black", mileage: 42000, price: N(28_000_000), was: 0, state: "Available", sold: "2026-09-15", features: ["Adaptive cruise control", "Lane keeping assist", "Apple CarPlay and Android Auto", "Heated front seats", "Sunroof", "Blind spot monitoring", "LED headlights"] },
];

// The refs the previous seed wrote — TS-1001…TS-1025. They are demonstration rows
// too, so they are marked as such; never deleted here. They leave with the demo
// wipe (Task 24) or the rebuild-from-nothing (Task 20), not silently in a seed run.
const PREVIOUS_SEED_REFS = Array.from({ length: 25 }, (_, i) => `TS-${1001 + i}`);

// Six naira cost lines per car — no currency, no rate (R-MON-3); every amount is
// kobo. `missingCosts` on a car leaves the named kinds unentered, so the office's
// incomplete-costs view shows a real gap rather than a zero.
function nairaLines(priceKobo: number, seed: number) {
  const fullTank = 12_000_000 + (seed % 3) * 2_000_000; // ₦120k–₦160k (kobo)
  const truckNg = 32_000_000 + (seed % 4) * 3_000_000; // ₦320k–₦410k (kobo)
  const ngn = fullTank + truckNg;
  const nairaBudget = Math.max(Math.round(priceKobo * 0.72) - ngn, 10_000_000);
  const kinds = ["purchase_price", "shipping", "clearing", "trucking_usa"] as const;
  const parts = [0.62, 0.2, 0.12, 0.06];
  const lines: { kind: string; amountMinor: number }[] = [];
  let allocated = 0;
  kinds.forEach((kind, i) => {
    const target = i === kinds.length - 1 ? nairaBudget - allocated : Math.round(nairaBudget * parts[i]);
    allocated += target;
    lines.push({ kind, amountMinor: target });
  });
  lines.push({ kind: "trucking_ng", amountMinor: truckNg });
  lines.push({ kind: "full_tank", amountMinor: fullTank });
  return lines;
}

// The demo's two handwritten enquiries (plan §"The enquiries the seed will write").
// Chidi is dated more than twelve months back so the year-mark notice has a real
// case; Aisha is current.
const ENQUIRIES = [
  { name: "Chidi O.", number: "+2348030000001", carRef: "TS-1001", note: "Asked about servicing history", state: "New", date: "2025-08-14" },
  { name: "Aisha B.", number: "+2348030000002", carRef: "TS-1013", note: "Wants to see the Sport when it lands", state: "Talking", date: "2026-10-01" },
];

// Written by the photo upload (Task 12): the Sanity asset id and the recorded
// origin of each uploaded image, in display order.
type PhotoManifest = {
  images: { ref: string; position: number; origin: string; assetId: string }[];
};

// Written by Task 13: the stored result of the one demo enquiry PDF. The seed
// reproduces it rather than inventing a second copy.
type EnquiryImport = {
  originalFilename: string;
  sanityAssetId: string;
  rowsTotal: number;
  importedAt: string;
  rows: { name: string; phone: string; car: string; note: string; date: string; state: string }[];
};

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (expected in .env.local).");
  const client = new Client({ connectionString });
  await client.connect();

  const photos: PhotoManifest = JSON.parse(readFileSync("scripts/demo-photo-manifest.json", "utf8"));
  const imported: EnquiryImport = JSON.parse(readFileSync("scripts/demo-enquiry-import.json", "utf8"));

  try {
    const stateRows = await client.query<{ id: string; label: string }>("SELECT id, label FROM car_state");
    const stateByLabel = new Map(stateRows.rows.map((r) => [r.label, r.id]));
    const enquiryStateRows = await client.query<{ id: string; label: string }>(
      "SELECT id, label FROM enquiry_state",
    );
    const enquiryStateByLabel = new Map(enquiryStateRows.rows.map((r) => [r.label, r.id]));

    await client.query("BEGIN");

    // The previous seed's rows are demonstration rows too. Bounded to the refs that
    // seed wrote; nothing is removed.
    const marked = await client.query(
      "UPDATE car SET is_demo = true WHERE ref = ANY($1) AND is_demo = false",
      [PREVIOUS_SEED_REFS],
    );

    for (let i = 0; i < DEMO.length; i++) {
      const c = DEMO[i];
      const stateId = stateByLabel.get(c.state);
      if (!stateId) throw new Error(`seed: car state "${c.state}" not found (run migrations first).`);
      const carPhotos = photos.images
        .filter((p) => p.ref === c.ref)
        .sort((a, b) => a.position - b.position);
      if (carPhotos.length === 0) {
        throw new Error(`seed: no uploaded photos for ${c.ref} — run the photo upload (Task 12) first.`);
      }

      // Upsert, not insert-only: the fleet is the seed's own data and a re-seed
      // must converge a row written by an earlier version (state, mileage, price).
      const res = await client.query<{ id: string }>(
        `INSERT INTO car (ref, brand, model, trim, year, exterior_color, interior_color, mileage,
                          features, was_price_kobo, arrival_note, doorstep_price_kobo, state_id, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
         ON CONFLICT (ref) DO UPDATE SET
           brand = EXCLUDED.brand, model = EXCLUDED.model, trim = EXCLUDED.trim,
           year = EXCLUDED.year, exterior_color = EXCLUDED.exterior_color,
           interior_color = EXCLUDED.interior_color, mileage = EXCLUDED.mileage,
           features = EXCLUDED.features, was_price_kobo = EXCLUDED.was_price_kobo,
           arrival_note = EXCLUDED.arrival_note, doorstep_price_kobo = EXCLUDED.doorstep_price_kobo,
           state_id = EXCLUDED.state_id, is_demo = true
         RETURNING id`,
        [c.ref, c.brand, c.model, c.trim, c.year, c.exterior, c.interior, c.mileage,
         JSON.stringify(c.features), c.was > 0 ? c.was : null, c.arrivalNote ?? null, c.price, stateId],
      );
      const carId = res.rows[0].id;

      // Cost lines are re-synced every run, so a re-seed converges any stale row and
      // the intended gaps stay gaps (the kinds in `missingCosts` are simply absent).
      await client.query("DELETE FROM cost_line WHERE car_id = $1", [carId]);
      for (const line of nairaLines(c.price, i + 1)) {
        if (c.missingCosts?.includes(line.kind)) continue;
        await client.query(
          `INSERT INTO cost_line (car_id, kind, amount_minor) VALUES ($1,$2,$3)`,
          [carId, line.kind, line.amountMinor],
        );
      }

      // Photos come from the upload record: the store holds the asset reference and
      // the recorded origin, never an outside address.
      await client.query("DELETE FROM car_photo WHERE car_id = $1", [carId]);
      for (const p of carPhotos) {
        await client.query(
          `INSERT INTO car_photo (car_id, sanity_asset_id, origin, position) VALUES ($1,$2,$3,$4)`,
          [carId, p.assetId, p.origin, p.position],
        );
      }

      if (c.sold) {
        await client.query(
          `INSERT INTO sale (car_id, sale_price_kobo, sold_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (car_id) DO UPDATE SET
             sale_price_kobo = EXCLUDED.sale_price_kobo,
             sold_at = EXCLUDED.sold_at`,
          [carId, c.price, new Date(c.sold).toISOString()],
        );
      } else {
        await client.query(`DELETE FROM sale WHERE car_id = $1`, [carId]);
      }
    }

    // The two handwritten enquiries. The seed owns them: it deletes exactly the
    // rows it is about to write (matched on name and number) and re-inserts them
    // marked, so a re-run cannot duplicate them and no other enquiry is touched.
    for (const e of ENQUIRIES) {
      await client.query("DELETE FROM enquiry WHERE name = $1 AND number = $2", [e.name, e.number]);
      const stateId = enquiryStateByLabel.get(e.state);
      if (!stateId) throw new Error(`seed: enquiry state "${e.state}" not found.`);
      await client.query(
        `INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id, created_at, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [e.name, e.number, e.carRef, e.note, stateId, `${e.date}T10:00:00.000Z`],
      );
    }

    // The imported PDF and the enquiries it produced, reproduced from the record.
    // Same ownership rule: only this import's row and its enquiries are replaced.
    const stale = await client.query<{ id: string }>("SELECT id FROM enquiry_pdf WHERE filename = $1", [
      imported.originalFilename,
    ]);
    for (const row of stale.rows) {
      await client.query("DELETE FROM enquiry WHERE pdf_import_id = $1", [row.id]);
    }
    await client.query("DELETE FROM enquiry_pdf WHERE filename = $1", [imported.originalFilename]);
    const pdf = await client.query<{ id: string }>(
      `INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total, imported_at)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [imported.sanityAssetId, imported.originalFilename, imported.rowsTotal, imported.importedAt],
    );
    for (const row of imported.rows) {
      const stateId = enquiryStateByLabel.get(row.state);
      if (!stateId) throw new Error(`seed: enquiry state "${row.state}" not found.`);
      await client.query(
        `INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id, pdf_import_id, created_at, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [row.name, row.phone, row.car, row.note, stateId, pdf.rows[0].id, `${row.date}T10:00:00.000Z`],
      );
    }

    // Keep the ref sequence ahead of every seeded/real ref (idempotent, never rewinds).
    await client.query(`
      SELECT setval(
        'ts_ref_seq',
        COALESCE((SELECT MAX(NULLIF(regexp_replace(ref, '\\D', '', 'g'), '')::int) FROM car), 0)
      )
    `);

    await client.query("COMMIT");
    console.log(
      `seed: ${DEMO.length} fleet car(s) synced, ${marked.rowCount ?? 0} earlier demo row(s) marked is_demo, ` +
        `${photos.images.length} photo(s) referenced, ${ENQUIRIES.length + imported.rows.length} enquiry(ies) written.`,
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
