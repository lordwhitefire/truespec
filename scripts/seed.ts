import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { CHANGE_CHECK_VERSION, carChangeCheck, enquiryChangeCheck } from "../lib/change-check";

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
// case; Aisha is current. `askedFor` is the customer's own words for what they are
// after — not a code, and not necessarily a car we hold (D11):
// Chidi names no car at all; Aisha asks for one in the fleet.
//
// `handle` is the recipe's own name for the row — the name the filler finds it by and
// writes it with. It is the recipe's, never the customer's, and it is what makes a
// second run leave this enquiry alone rather than write it again (decision 6).
const ENQUIRIES = [
  { handle: "demo-enquiry-01", name: "Chidi O.", number: "+2348030000001", askedFor: "a clean automatic saloon under ₦10 million — anything you have", note: "Asked about servicing history", state: "New", date: "2025-08-14" },
  { handle: "demo-enquiry-02", name: "Aisha B.", number: "+2348030000002", askedFor: "the Range Rover Sport when it lands", note: "Wants to see the Sport when it lands", state: "Talking", date: "2026-10-01" },
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
  rows: { name: string; phone: string; askedFor: string; note: string; date: string; state: string }[];
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

      // The car is found by its ref — the code the owner and the customer both read,
      // now immutable. There is no delete: the row written last time is the same row
      // this time. The recipe's fourteen editable details are gathered, the
      // change-check is computed over them, and the row is left alone unless that
      // check differs. `note` and `private_note` are editable details the demo recipe
      // never writes, so they are read back and folded into the check as they stand.
      const stored = (
        await client.query<{
          id: string;
          note: string | null;
          private_note: string | null;
          content_hash: string;
          hash_version: number;
        }>("SELECT id, note, private_note, content_hash, hash_version FROM car WHERE ref = $1", [c.ref])
      ).rows[0];

      const carRow = {
        brand: c.brand,
        model: c.model,
        trim: c.trim,
        year: c.year,
        exterior_color: c.exterior,
        interior_color: c.interior,
        mileage: c.mileage,
        features: JSON.stringify(c.features),
        note: stored?.note ?? null,
        private_note: stored?.private_note ?? null,
        was_price_kobo: c.was > 0 ? c.was : null,
        arrival_note: c.arrivalNote ?? null,
        doorstep_price_kobo: c.price,
        state_id: stateId,
      };
      const carFields = [
        carRow.brand, carRow.model, carRow.trim, carRow.year, carRow.exterior_color,
        carRow.interior_color, carRow.mileage, carRow.features, carRow.note, carRow.private_note,
        carRow.was_price_kobo, carRow.arrival_note, carRow.doorstep_price_kobo, carRow.state_id,
      ];
      const carHash = carChangeCheck(carRow);

      let carId: string;
      if (!stored) {
        carId = (
          await client.query<{ id: string }>(
            `INSERT INTO car (ref, brand, model, trim, year, exterior_color, interior_color, mileage,
                              features, note, private_note, was_price_kobo, arrival_note,
                              doorstep_price_kobo, state_id, content_hash, hash_version, is_demo)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true)
             RETURNING id`,
            [c.ref, ...carFields, carHash, CHANGE_CHECK_VERSION],
          )
        ).rows[0].id;
      } else if (stored.content_hash === carHash && stored.hash_version === CHANGE_CHECK_VERSION) {
        // The same details, under the same recipe — the row is not touched at all.
        carId = stored.id;
      } else {
        carId = stored.id;
        await client.query(
          `UPDATE car SET brand=$2, model=$3, trim=$4, year=$5, exterior_color=$6,
                          interior_color=$7, mileage=$8, features=$9, note=$10, private_note=$11,
                          was_price_kobo=$12, arrival_note=$13, doorstep_price_kobo=$14, state_id=$15,
                          content_hash=$16, hash_version=$17, is_demo=true
             WHERE id=$1`,
          [carId, ...carFields, carHash, CHANGE_CHECK_VERSION],
        );
      }

      // The cost lines are found by (car, kind) and written only where the amount
      // differs. The kinds a car is missing stay missing — a gap is a fact, not a row.
      for (const line of nairaLines(c.price, i + 1)) {
        if (c.missingCosts?.includes(line.kind)) continue;
        await client.query(
          `INSERT INTO cost_line (car_id, kind, amount_minor) VALUES ($1,$2,$3)
             ON CONFLICT (car_id, kind) DO UPDATE SET amount_minor = EXCLUDED.amount_minor
             WHERE cost_line.amount_minor IS DISTINCT FROM EXCLUDED.amount_minor`,
          [carId, line.kind, line.amountMinor],
        );
      }

      // The photographs are found by (car, position) and written only where the asset
      // or its recorded origin differs. The store holds asset references, never URLs.
      for (const p of carPhotos) {
        await client.query(
          `INSERT INTO car_photo (car_id, sanity_asset_id, origin, position) VALUES ($1,$2,$3,$4)
             ON CONFLICT (car_id, position) DO UPDATE
               SET sanity_asset_id = EXCLUDED.sanity_asset_id, origin = EXCLUDED.origin
             WHERE car_photo.sanity_asset_id IS DISTINCT FROM EXCLUDED.sanity_asset_id
                OR car_photo.origin IS DISTINCT FROM EXCLUDED.origin`,
          [carId, p.assetId, p.origin, p.position],
        );
      }

      if (c.sold) {
        // The sale is found by its car and written only where it differs. A car with
        // no sale in the recipe is left alone — nothing is removed on its behalf.
        await client.query(
          `INSERT INTO sale (car_id, sale_price_kobo, sold_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (car_id) DO UPDATE SET
             sale_price_kobo = EXCLUDED.sale_price_kobo, sold_at = EXCLUDED.sold_at
           WHERE sale.sale_price_kobo IS DISTINCT FROM EXCLUDED.sale_price_kobo
              OR sale.sold_at IS DISTINCT FROM EXCLUDED.sold_at`,
          [carId, c.price, new Date(c.sold).toISOString()],
        );
      }
    }

    // The two handwritten enquiries. The seed owns each one through the handle the
    // recipe gives it — `demo-enquiry-01`, `demo-enquiry-02`. Written again, the row
    // is found by its handle and left alone; the change-check decides, not the name.
    for (const e of ENQUIRIES) {
      const stateId = enquiryStateByLabel.get(e.state);
      if (!stateId) throw new Error(`seed: enquiry state "${e.state}" not found.`);
      const hash = enquiryChangeCheck({
        name: e.name,
        number: e.number,
        asked_for: e.askedFor,
        note: e.note,
        enquiry_state_id: stateId,
      });
      await client.query(
        `INSERT INTO enquiry (name, number, asked_for, note, enquiry_state_id, created_at, is_demo,
                              handle, content_hash, hash_version)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9)
         ON CONFLICT (handle) WHERE handle IS NOT NULL DO UPDATE SET
           name = EXCLUDED.name, number = EXCLUDED.number, asked_for = EXCLUDED.asked_for,
           note = EXCLUDED.note, enquiry_state_id = EXCLUDED.enquiry_state_id, is_demo = true,
           content_hash = EXCLUDED.content_hash, hash_version = EXCLUDED.hash_version
         WHERE enquiry.content_hash IS DISTINCT FROM EXCLUDED.content_hash`,
        [e.name, e.number, e.askedFor, e.note, stateId, `${e.date}T10:00:00.000Z`, e.handle, hash, CHANGE_CHECK_VERSION],
      );
    }

    // The one imported PDF, found by its filename. `enquiry_pdf.filename` is not
    // unique in the store, so this lookup is only honest while it stays inside the
    // demo's own rows — and it does: the recipe names the file.
    const existingPdf = (
      await client.query<{ id: string; sanity_asset_id: string; rows_total: number }>(
        "SELECT id, sanity_asset_id, rows_total FROM enquiry_pdf WHERE filename = $1",
        [imported.originalFilename],
      )
    ).rows[0];

    let pdfId: string;
    if (!existingPdf) {
      pdfId = (
        await client.query<{ id: string }>(
          `INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total, imported_at)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [imported.sanityAssetId, imported.originalFilename, imported.rowsTotal, imported.importedAt],
        )
      ).rows[0].id;
    } else {
      pdfId = existingPdf.id;
      if (
        existingPdf.sanity_asset_id !== imported.sanityAssetId ||
        existingPdf.rows_total !== imported.rowsTotal
      ) {
        await client.query(
          `UPDATE enquiry_pdf SET sanity_asset_id = $2, rows_total = $3 WHERE id = $1`,
          [pdfId, imported.sanityAssetId, imported.rowsTotal],
        );
      }
    }

    // The enquiries the PDF produced carry their own handles, so a second run finds
    // them and leaves them alone rather than writing them again.
    for (let i = 0; i < imported.rows.length; i++) {
      const row = imported.rows[i];
      const stateId = enquiryStateByLabel.get(row.state);
      if (!stateId) throw new Error(`seed: enquiry state "${row.state}" not found.`);
      const handle = `demo-enquiry-pdf-${String(i + 1).padStart(2, "0")}`;
      const hash = enquiryChangeCheck({
        name: row.name,
        number: row.phone,
        asked_for: row.askedFor,
        note: row.note,
        enquiry_state_id: stateId,
      });
      await client.query(
        `INSERT INTO enquiry (name, number, asked_for, note, enquiry_state_id, pdf_import_id, created_at,
                              is_demo, handle, content_hash, hash_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10)
         ON CONFLICT (handle) WHERE handle IS NOT NULL DO UPDATE SET
           name = EXCLUDED.name, number = EXCLUDED.number, asked_for = EXCLUDED.asked_for,
           note = EXCLUDED.note, enquiry_state_id = EXCLUDED.enquiry_state_id,
           pdf_import_id = EXCLUDED.pdf_import_id, is_demo = true,
           content_hash = EXCLUDED.content_hash, hash_version = EXCLUDED.hash_version
         WHERE enquiry.content_hash IS DISTINCT FROM EXCLUDED.content_hash`,
        [row.name, row.phone, row.askedFor, row.note, stateId, pdfId, `${row.date}T10:00:00.000Z`, handle, hash, CHANGE_CHECK_VERSION],
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
      `seed: ${DEMO.length} fleet car(s) synced (found by ref, written only where changed), ` +
        `${marked.rowCount ?? 0} earlier demo row(s) marked is_demo, ` +
        `${photos.images.length} photo(s) referenced, ` +
        `${ENQUIRIES.length + imported.rows.length} enquiry(ies) synced by handle — nothing deleted.`,
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
