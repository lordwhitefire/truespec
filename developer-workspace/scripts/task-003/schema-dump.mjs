// schema-dump.mjs — print a connection's public schema as canonical, diffable text.
//
// Used by TASK-003 Checkpoint A to prove that the corrective path (0001…0014 applied to the live
// database) and the from-nothing path (the same chain applied to an empty database) end in the
// SAME shape — and reusable later for the store inspection (Task 22).
//
// Usage:  node schema-dump.mjs "<connection-string>"   > dump.txt
//
// Read-only: only information_schema / pg_catalog are queried.
import { Client } from "pg";

const url = process.argv[2];
if (!url) {
  console.error("usage: node schema-dump.mjs <connection-string>");
  process.exit(2);
}

const QUERIES = {
  columns: `
    SELECT table_name || '.' || column_name || ' ' || data_type
           || ' null=' || is_nullable
           || ' default=' || coalesce(column_default, '-') AS line
      FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`,
  constraints: `
    SELECT c.relname || ' ' || con.conname || ' :: ' || pg_get_constraintdef(con.oid) AS line
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
     ORDER BY 1`,
  indexes: `
    SELECT indexname || ' :: ' || indexdef AS line
      FROM pg_indexes
     WHERE schemaname = 'public'
     ORDER BY 1`,
  sequences: `
    SELECT sequencename || ' start=' || start_value || ' increment=' || increment_by AS line
      FROM pg_sequences
     WHERE schemaname = 'public'
     ORDER BY 1`,
};

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const [section, sql] of Object.entries(QUERIES)) {
      const { rows } = await client.query(sql);
      console.log(`## ${section} (${rows.length})`);
      for (const r of rows) console.log(r.line);
      console.log("");
    }
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error("ERR", err.message);
  process.exit(1);
});
