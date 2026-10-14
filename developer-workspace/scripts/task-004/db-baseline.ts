// TASK-004 baseline: the demo fleet's figures, read directly from the store.
// Sequential queries with a warm-up retry — Neon drops *concurrent cold* TCP
// (learned in TASK-003), so we never fire the pool up in parallel.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function warm(attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await sql.query("select 1 as ok");
      return;
    } catch (e) {
      if (i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}

async function q(label: string, s: string) {
  const r = await sql.query(s);
  console.log(label.padEnd(18), JSON.stringify(r));
}

async function main() {
  await warm();
  await q("cars_total", "select count(*)::int n from car");
  await q("cars_live", "select count(*)::int n from car where deleted_at is null");
  await q("cars_null_state", "select count(*)::int n from car where state_id is null");
  await q(
    "cars_by_state",
    "select s.label, s.section, count(*)::int n from car c join car_state s on s.id=c.state_id where c.deleted_at is null group by 1,2 order by 1",
  );
  await q("photos", "select count(*)::int n from car_photo");
  await q("cost_lines", "select count(*)::int n from cost_line");
  await q("sales", "select count(*)::int n from sale");
  await q("enquiries", "select count(*)::int n from enquiry");
  await q("enquiry_pdfs", "select count(*)::int n from enquiry_pdf");
  await q("taps", "select count(*)::int n from tap");
  await q("activity", "select count(*)::int n from activity_event");
  await q("settings", "select count(*)::int n from setting");
  await q("migrations", "select count(*)::int n, max(name) last from schema_migrations");
  await q(
    "states_car",
    "select label, section, is_new_arrival, sort, colour from car_state order by sort, label",
  );
  await q("states_enq", "select label, sort, colour from enquiry_state order by sort, label");
}

main().catch((e) => {
  console.error("DB BASELINE FAILED:", e?.message ?? e);
  process.exit(1);
});
