import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

// RETIRED (TASK-003 Task 14). Superseded by `scripts/seed.ts`, the one demo-fleet
// seed. This script wrote `office_car` and `office_users` — the office's separate
// 15-car table with one lump cost per car and mileage in miles. The office now
// reads the one `car` table with `cost_line` and `car_state`, and `office_car` is
// dropped by migration `0015`. Kept (not deleted) only so the change is visible;
// its npm script is removed, so nothing runs it.

loadEnv({ path: '.env.local' });

const N = (naira: number) => Math.round(naira * 100); // naira -> kobo

// The reference office dataset, extracted from the running pages
// (office-inventory.html / office-car.html — see developer-workspace/scripts/
// office-data/ref-*.txt). 15 cars: 11 Available, 1 Landed (new arrival),
// 1 On the way, 1 At port, 1 Sold. Idempotent: upsert on ref.
type OfficeCar = {
  ref: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number;
  mileage: number; // miles, as the office shows it
  state: string;
  isNewArrival?: boolean;
  price: number; // kobo — the one price a buyer sees
  landed: number | null; // kobo — NULL = costs incomplete
  arrivalNote?: string;
  soldAt?: string; // ISO date
  salePrice?: number; // kobo
};

const DEMO: OfficeCar[] = [
  {
    ref: 'TS-1001',
    brand: 'Toyota',
    model: 'Land Cruiser V8',
    trim: 'ZX',
    year: 2019,
    mileage: 61204,
    state: 'Available',
    price: N(96_500_000),
    landed: N(89_600_000),
  },
  {
    ref: 'TS-1002',
    brand: 'Toyota',
    model: 'Corolla',
    trim: 'LE',
    year: 2020,
    mileage: 48905,
    state: 'Available',
    price: N(24_750_000),
    landed: N(21_270_000),
  },
  {
    ref: 'TS-1003',
    brand: 'Honda',
    model: 'Accord',
    trim: 'EX-L',
    year: 2019,
    mileage: 55730,
    state: 'Available',
    price: N(28_900_000),
    landed: N(25_550_000),
  },
  {
    ref: 'TS-1004',
    brand: 'Toyota',
    model: 'Highlander',
    trim: 'XLE',
    year: 2018,
    mileage: 68142,
    state: 'Available',
    price: N(38_750_000),
    landed: N(34_520_000),
  },
  {
    ref: 'TS-1005',
    brand: 'Toyota',
    model: 'RAV4',
    trim: 'XLE AWD',
    year: 2020,
    mileage: 41876,
    state: 'Available',
    price: N(35_200_000),
    landed: N(31_415_000),
  },
  {
    ref: 'TS-1006',
    brand: 'Toyota',
    model: 'Tacoma',
    trim: 'TRD Off-Road',
    year: 2021,
    mileage: 33158,
    state: 'Available',
    price: N(62_000_000),
    landed: N(55_590_000),
  },
  {
    ref: 'TS-1007',
    brand: 'Lexus',
    model: 'RX 350',
    trim: null,
    year: 2019,
    mileage: 47209,
    state: 'Available',
    price: N(47_500_000),
    landed: N(40_605_000),
  },
  {
    ref: 'TS-1008',
    brand: 'Toyota',
    model: 'Venza',
    trim: 'XLE',
    year: 2019,
    mileage: 58033,
    state: 'Available',
    price: N(36_400_000),
    landed: N(32_210_000),
  },
  {
    ref: 'TS-1009',
    brand: 'Toyota',
    model: 'Sienna',
    trim: 'LE',
    year: 2020,
    mileage: 52614,
    state: 'Available',
    price: N(33_900_000),
    landed: N(32_655_000),
  },
  {
    ref: 'TS-1010',
    brand: 'Toyota',
    model: 'Hilux',
    trim: 'SRV',
    year: 2019,
    mileage: 81375,
    state: 'Available',
    price: N(41_000_000),
    landed: N(28_760_000),
  },
  {
    ref: 'TS-1011',
    brand: 'Honda',
    model: 'CR-V',
    trim: 'EX-L',
    year: 2020,
    mileage: 45290,
    state: 'Available',
    price: N(29_400_000),
    landed: N(26_455_000),
  },
  {
    ref: 'TS-1012',
    brand: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    year: 2021,
    mileage: 26908,
    state: 'Landed',
    isNewArrival: true,
    price: N(34_500_000),
    landed: N(32_410_000),
  },
  {
    ref: 'TS-1013',
    brand: 'Toyota',
    model: 'Fortuner',
    trim: null,
    year: 2021,
    mileage: 29844,
    state: 'On the way',
    price: N(58_000_000),
    landed: null,
    arrivalNote: 'Expected 18th',
  },
  {
    ref: 'TS-1014',
    brand: 'Toyota',
    model: 'Land Cruiser Prado',
    trim: 'TX',
    year: 2020,
    mileage: 37461,
    state: 'At port',
    price: N(78_000_000),
    landed: null,
    arrivalNote: 'Arriving 12th · clearing in progress',
  },
  {
    ref: 'TS-1015',
    brand: 'Toyota',
    model: 'Camry',
    trim: 'XLE',
    year: 2018,
    mileage: 72418,
    state: 'Available',
    price: N(31_500_000),
    landed: N(27_650_000),
    soldAt: '2026-09-29',
    salePrice: N(31_500_000),
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (expected in .env.local).');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');
    for (const c of DEMO) {
      await client.query(
        `INSERT INTO office_car (ref, brand, model, trim, year, mileage, state, is_new_arrival,
                                 doorstep_price_kobo, landed_cost_kobo, arrival_note, sold_at, sale_price_kobo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (ref) DO UPDATE SET
           brand = EXCLUDED.brand, model = EXCLUDED.model, trim = EXCLUDED.trim, year = EXCLUDED.year,
           mileage = EXCLUDED.mileage, state = EXCLUDED.state, is_new_arrival = EXCLUDED.is_new_arrival,
           doorstep_price_kobo = EXCLUDED.doorstep_price_kobo, landed_cost_kobo = EXCLUDED.landed_cost_kobo,
           arrival_note = EXCLUDED.arrival_note, sold_at = EXCLUDED.sold_at,
           sale_price_kobo = EXCLUDED.sale_price_kobo, updated_at = now()`,
        [
          c.ref,
          c.brand,
          c.model,
          c.trim,
          c.year,
          c.mileage,
          c.state,
          c.isNewArrival ?? false,
          c.price,
          c.landed,
          c.arrivalNote ?? null,
          c.soldAt ? new Date(c.soldAt).toISOString() : null,
          c.salePrice ?? null,
        ]
      );
    }
    await client.query('COMMIT');
    console.log(`seed-office: upserted ${DEMO.length} office demo car(s) (idempotent).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
