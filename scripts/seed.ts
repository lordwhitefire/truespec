import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

const N = (naira: number) => Math.round(naira * 100); // naira -> kobo (integer)

// Owner's truespec images — the Unsplash car photos the reference uses, same `img()` form.
const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

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
  state: string; // car_state label
  features: string[];
  arrivalNote?: string;
  imgs: string[]; // 3 Unsplash ids
  sold?: string; // ISO date; marks a car that found a new owner (reaches the Sold state)
};

// The reference catalogue verbatim (test-truespec-v2/truespec.html CARS):
// 12 available, 6 on order, 6 landed. `was > 0` marks the four "Special" cars.
const DEMO: DemoCar[] = [
  // Available (12)
  { ref: "TS-1001", brand: "Toyota", model: "Camry", trim: "XSE V6", year: 2021, exterior: "Obsidian black", interior: "Black", mileage: 31000, price: N(34_500_000), was: 0, state: "Available", features: ["Panoramic roof", "Leather upholstery", "Heated and ventilated front seats", "Apple CarPlay and Android Auto", "JBL 9-speaker audio", "Adaptive cruise control", "Quad exhaust tips"], imgs: ["1621007947382-bb3c3994e3fb", "1623869675781-80aa31012a5a", "1663530079695-f7bea03451bd"] },
  { ref: "TS-1002", brand: "Toyota", model: "Camry", trim: "SE", year: 2021, exterior: "Alpine white", interior: "Cream", mileage: 38000, price: N(27_900_000), was: N(31_500_000), state: "Available", features: ["Eight-inch touchscreen", "Apple CarPlay and Android Auto", "Adaptive cruise control", "Lane departure alert", "Fabric upholstery", "LED headlights", "Push-button start"], imgs: ["1657872737697-737a2d123ef2", "1631930998583-72cddce04c69", "1705580655498-cb91e26d12a0"] },
  { ref: "TS-1003", brand: "Lexus", model: "RX 350", trim: "F Sport", year: 2020, exterior: "Sonic grey", interior: "Black", mileage: 41000, price: N(52_000_000), was: 0, state: "Available", features: ["F Sport body kit", "20-inch alloy wheels", "Adaptive variable suspension", "Heated and ventilated front seats", "Lexus Premium Sound", "Panoramic roof", "Power tailgate"], imgs: ["1742941129482-843e7492aa0b", "1748392029242-19b20e799ec8", "1742941158083-be03727c216b"] },
  { ref: "TS-1004", brand: "Mercedes-Benz", model: "GLE 350", trim: "4MATIC", year: 2019, exterior: "Obsidian black", interior: "Black", mileage: 62000, price: N(63_500_000), was: 0, state: "Available", features: ["Air suspension", "Burmester 3D audio", "Panoramic roof", "Heated front seats", "Ambient lighting", "360-degree camera", "Roof rails"], imgs: ["1563721911289-ada2924d66f1", "1692970095410-6bd548fc7f6c", "1692970093810-e47f696b37ed"] },
  { ref: "TS-1005", brand: "BMW", model: "X5", trim: "xDrive40i", year: 2021, exterior: "Alpine white", interior: "Black", mileage: 34000, price: N(88_000_000), was: 0, state: "Available", features: ["M Sport package", "Head-up display", "Parking Assistant", "Heated front seats", "Harman Kardon audio", "Panoramic roof", "Adaptive M suspension"], imgs: ["1635990215241-4d2805d729bb", "1635990215146-9931957ac509", "1696294586764-6baffd088b71"] },
  { ref: "TS-1006", brand: "Toyota", model: "Highlander", trim: "Platinum V6", year: 2021, exterior: "Celestial silver", interior: "Tan", mileage: 45000, price: N(61_000_000), was: 0, state: "Available", features: ["Third row seats", "JBL 12-speaker audio", "Ventilated and heated front seats", "Panoramic roof", "Powered tailgate", "Blind spot monitoring", "Wireless charging"], imgs: ["1600462456909-5d0014aa313d", "1667971289521-4c8050b844a3", "1624951352908-3579b7df9c05"] },
  { ref: "TS-1007", brand: "Honda", model: "Accord", trim: "Touring", year: 2021, exterior: "Graphite", interior: "Black", mileage: 29000, price: N(38_000_000), was: 0, state: "Available", features: ["Wireless charging", "Adaptive cruise control", "Sunroof", "Heated front seats", "12-speaker audio", "Head-up display", "Blind spot monitoring"], imgs: ["1578659258511-4a4e7dee7344", "1577112319788-377a2131e05b", "1706495100099-a25d9ddffe74"] },
  { ref: "TS-1008", brand: "Toyota", model: "RAV4 Prime", trim: "SE", year: 2022, exterior: "Wind chill pearl", interior: "Black", mileage: 12000, price: N(45_500_000), was: N(50_900_000), state: "Available", features: ["Plug-in hybrid", "18-inch alloy wheels", "Heated front seats", "Power tailgate", "Blind spot monitoring", "Qi wireless charging", "JBL audio"], imgs: ["1706509234538-9831b1b33d66", "1706509240407-7f3aa19ae740", "1632137924251-fcea5ff46035"] },
  { ref: "TS-1009", brand: "Lexus", model: "ES 350", trim: "350", year: 2021, exterior: "Midnight black", interior: "Black", mileage: 36000, price: N(43_000_000), was: 0, state: "Available", features: ["Digital cockpit", "Lexus Premium Sound", "Heated and ventilated front seats", "Panoramic roof", "Blind spot monitoring", "Wireless charging", "LED headlights"], imgs: ["1577496549804-8b05f1f67338", "1568074532275-b57393b08c64", "1568074532099-1e0dc3206a74"] },
  { ref: "TS-1010", brand: "Toyota", model: "4Runner", trim: "Limited", year: 2020, exterior: "Alpine white", interior: "Tan", mileage: 52000, price: N(58_000_000), was: 0, state: "Available", features: ["Body-on-frame construction", "Full-time four wheel drive", "Low range", "Leather upholstery", "Heated and cooled front seats", "Powered tailgate", "Adaptive cruise control"], imgs: ["1603094539392-0d73239f4682", "1603094543704-64cdce2d2532", "1603094539103-af7ea353eda4"] },
  { ref: "TS-1011", brand: "Mercedes-Benz", model: "C 300", trim: "AMG Line", year: 2018, exterior: "Obsidian black", interior: "Black", mileage: 71000, price: N(29_500_000), was: N(33_000_000), state: "Available", features: ["AMG Line exterior", "Dual-zone climate", "Sunroof", "Garage door opener", "Heated front seats", "Burmester audio", "Keyless entry"], imgs: ["1542230387-bfc77d26903e", "1605556816125-d752c226247b", "1551836989-b4622a17a792"] },
  { ref: "TS-1012", brand: "BMW", model: "X3", trim: "xDrive30i", year: 2019, exterior: "Santorini black", interior: "Black", mileage: 58000, price: N(41_000_000), was: 0, state: "Available", features: ["Adaptive suspension", "Panoramic roof", "Heated front seats", "Harman Kardon audio", "LED headlights", "Parking Assistant", "Leather upholstery"], imgs: ["1677961019377-d45643fde74f", "1681113163422-aab89b8935c5", "1605437139441-590d3a529b08"] },

  // On order (6) — each carries an arrival note (Q38)
  { ref: "TS-1013", brand: "Range Rover", model: "Sport", trim: "HSE", year: 2021, exterior: "Fuji white", interior: "Black", mileage: 0, price: N(115_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: November", features: ["Meridian Signature audio", "Terrain Response", "Adaptive air suspension", "Panoramic roof", "Heated and ventilated front seats", "Power tailgate", "21-inch alloy wheels"], imgs: ["1602013871952-8379f19a15f1", "1563458563737-e60b1f1b345f", "1677228447083-3245a27daf91"] },
  { ref: "TS-1014", brand: "Porsche", model: "Macan", trim: "S", year: 2021, exterior: "Gentian blue", interior: "Black", mileage: 0, price: N(96_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: December", features: ["Sport Chrono package", "Bose Surround Sound", "20-inch alloy wheels", "Adaptive air suspension", "Heated front seats", "Power panoramic roof", "Lane change assist"], imgs: ["1699325974549-fd06639650aa", "1643055359735-908c15445d09", "1672169538777-fb3211046a03"] },
  { ref: "TS-1015", brand: "Toyota", model: "Land Cruiser Prado", trim: "VX", year: 2022, exterior: "Alpine white", interior: "Tan", mileage: 0, price: N(92_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: January", features: ["Full-time four wheel drive", "Low range", "Leather upholstery", "Powered tailgate", "Moonroof", "Heated front seats", "Multi-terrain select"], imgs: ["1510776817148-07252939cf4d", "1708267416480-d139f1e0ec31", "1708161712107-4526f8726c63"] },
  { ref: "TS-1016", brand: "Chevrolet", model: "Tahoe", trim: "LT", year: 2020, exterior: "Summit white", interior: "Black", mileage: 0, price: N(74_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: November", features: ["Rear entertainment system", "Third row seats", "Power liftgate", "Heated second row seats", "Bose audio", "Safety alert system", "Remote start"], imgs: ["1564422426545-8a43cd6598ff", "1646844371347-e7eab6275747", "1547580092-6dcd4e7c3797"] },
  { ref: "TS-1017", brand: "Ford", model: "F-150", trim: "Lariat", year: 2021, exterior: "Oxford white", interior: "Black", mileage: 0, price: N(68_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: December", features: ["Pro Power Onboard generator", "Tow package", "Four wheel drive", "B&O audio", "Heated and cooled front seats", "Bed liner", "360-degree camera"], imgs: ["1551830820-330a71b99659", "1677637279719-b6698ac1765f", "1598043249911-1122b7faa4f3"] },
  { ref: "TS-1018", brand: "BMW", model: "X7", trim: "xDrive40i", year: 2022, exterior: "Alpine white", interior: "Black", mileage: 0, price: N(128_000_000), was: 0, state: "On the way", arrivalNote: "Expected arrival: January", features: ["Six seats with captain's chairs", "Panoramic roof", "Harman Kardon audio", "Heated front seats", "Driving Assistance Pro", "Air suspension", "Power tailgate"], imgs: ["1740815514959-07d12c339e8f", "1701985470695-e430a8fdc8d6", "1731988666769-ed4dabc44d53"] },

  // Landed this year (6) — state `Landed` (is_new_arrival = true)
  { ref: "TS-1019", brand: "Lexus", model: "RX 350", trim: "350", year: 2019, exterior: "Celestial silver", interior: "Black", mileage: 64000, price: N(44_500_000), was: 0, state: "Landed", features: ["Leather upholstery", "Heated and ventilated front seats", "Power tailgate", "Blind spot monitoring", "LED headlights", "Roof rails", "Dual-zone climate"], imgs: ["1702757329688-073f16ff8893", "1698122660387-64acb063dabe", "1777015558094-f92d538f9c80"] },
  { ref: "TS-1020", brand: "Honda", model: "CR-V", trim: "EX-L", year: 2020, exterior: "Platinum white", interior: "Black", mileage: 48000, price: N(36_000_000), was: 0, state: "Landed", features: ["Leather upholstery", "Panoramic sunroof", "Power tailgate", "Heated front seats", "Honda Sensing safety suite", "Wireless charging", "12-speaker audio"], imgs: ["1681697390363-1142eb46b76d", "1707070182914-fb69f596c98e", "1561823450-db08b67c8440"] },
  { ref: "TS-1021", brand: "Toyota", model: "Sienna", trim: "XLE", year: 2019, exterior: "Celestial silver", interior: "Black", mileage: 66000, price: N(33_500_000), was: 0, state: "Landed", features: ["Eight seats", "Power sliding doors", "Rear entertainment system", "Tri-zone climate", "Power tailgate", "Roof rails", "Blind spot monitoring"], imgs: ["1690533683990-cbe074826091", "1737488247093-f4484eac67ae", "1659029933222-8ce502a9fa7d"] },
  { ref: "TS-1022", brand: "Lexus", model: "ES 350", trim: "350", year: 2018, exterior: "Obsidian black", interior: "Black", mileage: 74000, price: N(31_000_000), was: 0, state: "Landed", features: ["Leather upholstery", "Heated front seats", "Power sunroof", "Mark Levinson audio", "LED headlights", "Dual-zone climate", "Wood trim"], imgs: ["1577496550006-f24a50e9d50c", "1568074532337-80968739967c", "1651872655139-2408c06d1c6e"] },
  { ref: "TS-1023", brand: "Mercedes-Benz", model: "E 350", trim: "350", year: 2020, exterior: "Obsidian black", interior: "Tan", mileage: 39000, price: N(48_000_000), was: N(52_500_000), state: "Landed", features: ["Burmester 3D audio", "Ambient lighting", "Heated front seats", "Wireless charging", "Air suspension", "Panoramic sunroof", "Driver Assistance package"], imgs: ["1609703048009-d3576872b32c", "1748569748174-33f4ba3ddcdf", "1652453822986-04f70788b118"] },
  { ref: "TS-1024", brand: "Toyota", model: "RAV4", trim: "XLE", year: 2019, exterior: "Celestial silver", interior: "Black", mileage: 61000, price: N(35_500_000), was: 0, state: "Landed", features: ["All wheel drive", "Power tailgate", "Heated front seats", "Blind spot monitoring", "Roof rails", "Apple CarPlay", "Dual-zone climate"], imgs: ["1739796216379-e5b6793f313a", "1633160847660-87506f1caa2d", "1621765523163-d2cd5f81948e"] },

  // Sold — reached via /car/TS-1025. In the reference a sold car is removed from
  // CARS and listed in SOLD; here the car exists but the sale row un-lists it and
  // routes the view to the Sold state. Mirrors SOLD[0] "2021 Honda Civic EX".
  // The photo is the reference's real Unsplash id for this exact car
  // (1552519507-da3b142c6e3d, verified 200); the sold view renders only photos[0].
  { ref: "TS-1025", brand: "Honda", model: "Civic", trim: "EX", year: 2021, exterior: "Sonic grey", interior: "Black", mileage: 42000, price: N(28_000_000), was: 0, state: "Available", sold: "2026-09-15", features: ["Adaptive cruise control", "Lane keeping assist", "Apple CarPlay and Android Auto", "Heated front seats", "Sunroof", "Blind spot monitoring", "LED headlights"], imgs: ["1552519507-da3b142c6e3d"] },
];

// Previous demo refs, replaced by the reference catalogue. Deleting a car cascades to
// its cost_line / car_photo / sale rows; enquiry.car_ref is plain text (re-pointed below).
const LEGACY_REFS = Array.from({ length: 15 }, (_, i) => `TS-${String(i + 1).padStart(4, "0")}`);

function usdLines(priceKobo: number, seed: number) {
  const rate = 145050 + (seed % 4) * 620; // ~₦1450.50–₦1470.36 per $ (kobo-per-dollar)
  const fullTank = 12_000_000 + (seed % 3) * 2_000_000; // ₦120k–₦160k (kobo)
  const truckNg = 32_000_000 + (seed % 4) * 3_000_000; // ₦320k–₦410k (kobo)
  const ngn = fullTank + truckNg;
  const usdBudget = Math.max(Math.round(priceKobo * 0.72) - ngn, 10_000_000);
  const kinds = ["purchase_price", "shipping", "clearing", "trucking_usa"] as const;
  const parts = [0.62, 0.2, 0.12, 0.06];
  const lines: { kind: string; currency: "USD" | "NGN"; amountMinor: number; rateMinor: number | null }[] = [];
  let allocated = 0;
  kinds.forEach((kind, i) => {
    const target = i === kinds.length - 1 ? usdBudget - allocated : Math.round(usdBudget * parts[i]);
    allocated += target;
    lines.push({ kind, currency: "USD", amountMinor: Math.round((target * 100) / rate), rateMinor: rate });
  });
  lines.push({ kind: "trucking_ng", currency: "NGN", amountMinor: truckNg, rateMinor: null });
  lines.push({ kind: "full_tank", currency: "NGN", amountMinor: fullTank, rateMinor: null });
  return lines;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set (expected in .env.local).");
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const stateRows = await client.query<{ id: string; label: string }>("SELECT id, label FROM car_state");
    const stateByLabel = new Map(stateRows.rows.map((r) => [r.label, r.id]));

    await client.query("BEGIN");

    // Replace the previous demo set so the showroom matches the reference catalogue exactly
    // (12 available / 6 on order / 6 landed). Targeted to the known legacy refs only.
    const removed = await client.query("DELETE FROM car WHERE ref = ANY($1) RETURNING ref", [LEGACY_REFS]);

    // Re-point any office enquiries that referenced a legacy ref to the equivalent new car.
    await client.query("UPDATE enquiry SET car_ref = 'TS-1001' WHERE car_ref = 'TS-0001'");
    await client.query("UPDATE enquiry SET car_ref = 'TS-1013' WHERE car_ref = 'TS-0007'");

    let inserted = 0;

    for (let i = 0; i < DEMO.length; i++) {
      const c = DEMO[i];
      const stateId = stateByLabel.get(c.state);
      if (!stateId) throw new Error(`seed: car state "${c.state}" not found (run migrations first).`);

      const res = await client.query<{ id: string }>(
        `INSERT INTO car (ref, brand, model, trim, year, exterior_color, interior_color, mileage,
                          features, was_price_kobo, arrival_note, doorstep_price_kobo, state_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (ref) DO NOTHING
         RETURNING id`,
        [c.ref, c.brand, c.model, c.trim, c.year, c.exterior, c.interior, c.mileage,
         JSON.stringify(c.features), c.was > 0 ? c.was : null, c.arrivalNote ?? null, c.price, stateId],
      );
      let carId: string;
      const isNew = res.rowCount === 1;
      if (isNew) {
        carId = res.rows[0].id;
      } else {
        // already seeded — reuse the row but still refresh its photos below
        const existing = await client.query<{ id: string }>("SELECT id FROM car WHERE ref = $1", [c.ref]);
        carId = existing.rows[0].id;
      }

      if (isNew) {
        for (const line of usdLines(c.price, i + 1)) {
          await client.query(
            `INSERT INTO cost_line (car_id, kind, currency, amount_minor, rate_minor)
             VALUES ($1,$2,$3,$4,$5)`,
            [carId, line.kind, line.currency, line.amountMinor, line.rateMinor],
          );
        }
      }

      // Photos are the owner's truespec images; synced every run so they stay correct.
      await client.query("DELETE FROM car_photo WHERE car_id = $1", [carId]);
      for (let p = 0; p < c.imgs.length; p++) {
        await client.query(
          `INSERT INTO car_photo (car_id, sanity_asset_id, position) VALUES ($1,$2,$3)`,
          [carId, img(c.imgs[p]), p],
        );
      }

      // Create a sale row if a sold date is provided
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

      inserted += isNew ? 1 : 0;
    }

    // A couple of enquiries, only when none exist (kept out of the showroom entirely).
    const enquiryCount = await client.query<{ n: string }>("SELECT count(*)::text AS n FROM enquiry");
    if (enquiryCount.rows[0].n === "0") {
      const newState = await client.query<{ id: string }>(
        "SELECT id FROM enquiry_state WHERE label = 'New' LIMIT 1",
      );
      const talking = await client.query<{ id: string }>(
        "SELECT id FROM enquiry_state WHERE label = 'Talking' LIMIT 1",
      );
      await client.query(
        `INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id) VALUES
         ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)`,
        ["Chidi O.", "+2348030000001", "TS-1001", "Asked about servicing history", newState.rows[0].id,
         "Aisha B.", "+2348030000002", "TS-1013", "Wants to see the Sport when it lands", talking.rows[0].id],
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
      inserted === 0
        ? "seed: cars already present — refreshed photos to the owner's images (idempotent)."
        : `seed: replaced ${removed.rowCount ?? 0} legacy car(s), inserted ${inserted} reference car(s) + photos.`,
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
