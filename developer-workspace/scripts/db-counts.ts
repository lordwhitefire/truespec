import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

(async () => {
  try {
    const rows = await sql.query(
      "SELECT ref, state, sold_at FROM office_car ORDER BY ref",
    );
    const c: Record<string, number> = {};
    for (const r of rows) {
      const k = (r.sold_at ? "SOLD:" : "") + r.state;
      c[k] = (c[k] || 0) + 1;
    }
    console.log("total", rows.length, JSON.stringify(c));
  } catch (e) {
    console.log("DB ERR", String(e).slice(0, 300));
  }
})();
