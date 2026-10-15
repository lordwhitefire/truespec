/**
 * A deterministic fingerprint of the fleet, for comparing one seed run with the next.
 * Prints sorted JSON so two runs can be diffed byte-for-byte.
 *
 *   node --import tsx developer-workspace/scripts/task-004/store-fingerprint.ts > fp.json
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const states = (
      await client.query(
        `SELECT label, kind, section, sort FROM car_state ORDER BY kind, sort, label`,
      )
    ).rows;
    const cars = (
      await client.query(
        `SELECT c.ref,
                s.label AS primary_label,
                s.section AS section,
                COALESCE(
                  (SELECT json_agg(sec.label ORDER BY sec.label)
                     FROM car_secondary_state css
                     JOIN car_state sec ON sec.id = css.state_id
                    WHERE css.car_id = c.id),
                  '[]'::json
                ) AS secondaries,
                (sale.id IS NOT NULL) AS has_sale,
                (SELECT count(*) FROM cost_line cl WHERE cl.car_id = c.id) AS cost_lines,
                (SELECT count(*) FROM car_photo p WHERE p.car_id = c.id) AS photos
           FROM car c
           JOIN car_state s ON s.id = c.state_id
           LEFT JOIN sale ON sale.car_id = c.id
          ORDER BY c.ref`,
      )
    ).rows;
    const totals = (
      await client.query(
        `SELECT
           (SELECT count(*) FROM car)  AS cars,
           (SELECT count(*) FROM sale) AS sales,
           (SELECT count(*) FROM car_secondary_state) AS secondary_links,
           (SELECT count(*) FROM enquiry) AS enquiries,
           (SELECT count(*) FROM cost_line) AS cost_lines`,
      )
    ).rows[0];
    console.log(JSON.stringify({ states, cars, totals }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
