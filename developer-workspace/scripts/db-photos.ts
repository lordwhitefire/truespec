import { config } from "dotenv";
import { Client } from "pg";
config({ path: ".env.local" });
async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(
    "select car.ref, count(cp.id) as n, min(cp.sanity_asset_id) as sample from car_photo cp join car on car.id=cp.car_id group by car.ref order by car.ref",
  );
  console.log(r.rows.map((x: { ref: string; n: string; sample: string }) => `${x.ref}  photos=${x.n}  ${x.sample}`).join("\n"));
  await c.end();
}
main();
