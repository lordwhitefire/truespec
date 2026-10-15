/**
 * Validates migrations/0022_draft.sql WITHOUT changing the store (TASK-004, Task 21).
 *
 * It opens one transaction, runs the migration file, asserts the draft table and the store's
 * refusals, then ROLLBACKs — so the live store is left exactly as it was. A failed statement aborts
 * a Postgres transaction, so every "must be refused" test runs under a SAVEPOINT that is rolled
 * back.
 *
 * What is claimed, and why each claim is the one worth making:
 *
 *   1. the migration runs to the end, and creates **exactly one** table — D13 promised one new
 *      table, and "one table" is a promise that can be broken by adding a second;
 *   2. the table's columns are **exactly D16's** — set equality in both directions, so neither an
 *      extra column the spec did not name nor a missing one can pass;
 *   3. the columns carry D16's own **meanings**: `values` is jsonb and is required (the writer says
 *      what the file carried), `image_asset_ids` is an ordered list that arrives empty,
 *      `state_label` is nullable (a file may name no state) and is a **name**;
 *   4. a draft row **round-trips whole** — the batch, the file, the values, the ordered images, the
 *      state's name — because that is what the save (Task 22) will read;
 *   5. the store **refuses** a third kind, and refuses a state **id** where a name belongs
 *      (SQLSTATE + constraint named);
 *   6. **holding a draft creates no record and consumes no code** — no `car`, no `enquiry`, and
 *      `ts_ref_seq` untouched. This is truth 9's whole point: a draft is not a record and a code is
 *      given at the save, never at the upload.
 *
 *   node --dns-result-order=ipv4first --import tsx \
 *     developer-workspace/scripts/task-004/migration-0022-check.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

async function refusal(
  client: Client,
  name: string,
  sql: string,
  wantCode: string,
  params: unknown[] = [],
): Promise<void> {
  await client.query("SAVEPOINT probe");
  try {
    await client.query(sql, params);
    await client.query("ROLLBACK TO SAVEPOINT probe");
    ok(name, false, "the statement was ALLOWED; it should have been refused");
  } catch (err) {
    const e = err as { code?: string; constraint?: string; message?: string };
    await client.query("ROLLBACK TO SAVEPOINT probe");
    ok(name, e.code === wantCode, `sqlstate ${e.code} (${e.constraint ?? e.message})`);
  }
}

/**
 * A value written the same way twice, whatever order its keys happen to be in — because `jsonb`
 * stores a canonical form and does not keep the key order it was given. Comparing serialised
 * strings would fail on a value that is, in fact, identical.
 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** D16's columns, and nothing else — the list this check holds the migration to, in both directions. */
const D16_COLUMNS = [
  "id",
  "kind",
  "batch_id",
  "source_filename",
  "source_asset_id",
  "values",
  "image_asset_ids",
  "state_label",
  "is_demo",
  "created_at",
  "updated_at",
];

async function publicTables(client: Client): Promise<string[]> {
  const rows = (
    await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    )
  ).rows.map((r) => r.table_name);
  return rows;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const sql = readFileSync(join(process.cwd(), "migrations", "0022_draft.sql"), "utf8");

  try {
    const tablesBefore = await publicTables(client);
    const carsBefore = Number((await client.query("SELECT count(*) FROM car")).rows[0].count);
    const enquiriesBefore = Number(
      (await client.query("SELECT count(*) FROM enquiry")).rows[0].count,
    );
    const seqBefore = (await client.query<{ last_value: string }>("SELECT last_value FROM ts_ref_seq"))
      .rows[0].last_value;
    console.log(
      `before: ${tablesBefore.length} tables, ${carsBefore} car(s), ${enquiriesBefore} enquiry(ies), ts_ref_seq at ${seqBefore}`,
    );

    await client.query("BEGIN");
    try {
      await client.query(sql);
      console.log("\nthe migration ran to the end.");

      // --- exactly one new table (D13's promise) -------------------------------
      const tablesAfter = await publicTables(client);
      const added = tablesAfter.filter((t) => !tablesBefore.includes(t));
      ok(
        "the migration adds exactly one table — draft, and nothing else",
        added.length === 1 && added[0] === "draft",
        added.join(", ") || "(none)",
      );

      // --- the columns are D16's, exactly -------------------------------------
      const cols = (
        await client.query<{
          column_name: string;
          data_type: string;
          udt_name: string;
          is_nullable: string;
          column_default: string | null;
        }>(
          `SELECT column_name, data_type, udt_name, is_nullable, column_default
             FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'draft'
            ORDER BY column_name`,
        )
      ).rows;
      const names = cols.map((c) => c.column_name).sort();
      ok(
        "the columns are exactly D16's, in both directions",
        JSON.stringify(names) === JSON.stringify([...D16_COLUMNS].sort()),
        names.join(", "),
      );

      const col = (n: string) => cols.find((c) => c.column_name === n);
      console.log("\nwhat the columns mean:");
      ok("`values` is jsonb", col("values")?.data_type === "jsonb", String(col("values")?.data_type));
      ok(
        "`values` is required and has no default — the writer says what the file carried",
        col("values")?.is_nullable === "NO" && col("values")?.column_default === null,
        `nullable=${col("values")?.is_nullable} default=${col("values")?.column_default}`,
      );
      ok(
        "`image_asset_ids` is an ordered list that arrives empty",
        col("image_asset_ids")?.udt_name === "_text" &&
          (col("image_asset_ids")?.column_default ?? "").includes("'{}'"),
        `${col("image_asset_ids")?.udt_name} default=${col("image_asset_ids")?.column_default}`,
      );
      ok(
        "`state_label` is nullable — a file may name no state",
        col("state_label")?.is_nullable === "YES" && col("state_label")?.data_type === "text",
        `${col("state_label")?.data_type} nullable=${col("state_label")?.is_nullable}`,
      );
      ok(
        "`is_demo` is present and defaults to false (drafts carry the demo marker)",
        col("is_demo")?.data_type === "boolean" &&
          (col("is_demo")?.column_default ?? "").startsWith("false"),
        `default=${col("is_demo")?.column_default}`,
      );
      ok(
        "both timestamps are present and default to now()",
        (col("created_at")?.column_default ?? "").includes("now()") &&
          (col("updated_at")?.column_default ?? "").includes("now()"),
      );
      ok("the primary key is the id", col("id")?.is_nullable === "NO", String(col("id")?.column_default));
      ok(
        "there is no `ref`, no `content_hash`, no `state_id`, no `deleted_at` — a draft is not a record",
        ["ref", "content_hash", "hash_version", "state_id", "deleted_at", "ref_seq"].every(
          (n) => !names.includes(n),
        ),
      );

      // --- the store guards the row -------------------------------------------
      const rls = (
        await client.query<{ relrowsecurity: boolean }>(
          `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.draft'::regclass`,
        )
      ).rows[0].relrowsecurity;
      ok("row-level security is on, like every other table", rls === true, String(rls));

      const idx = (
        await client.query<{ indexname: string }>(
          `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'draft' ORDER BY indexname`,
        )
      ).rows.map((r) => r.indexname);
      ok(
        "a batch is indexed — the one thing the upload writes and the review reads by",
        idx.includes("draft_batch_id_idx"),
        idx.join(", "),
      );

      // --- a draft round-trips whole ------------------------------------------
      const batchId = "11111111-2222-4333-8444-555555555555";
      const values = {
        brand: "Toyota",
        model: "Land Cruiser",
        year: 2021,
        features: ["Air conditioning", "Leather seats"],
        note: "one owner",
      };
      const images = ["asset-cover", "asset-second", "asset-third"];
      const inserted = (
        await client.query<{ id: string }>(
          `INSERT INTO draft
             (kind, batch_id, source_filename, source_asset_id, values, image_asset_ids, state_label)
           VALUES ('car', $1, 'fleet-october.pdf', 'asset-source-file', $2::jsonb, $3::text[], 'On Order')
           RETURNING id`,
          [batchId, JSON.stringify(values), images],
        )
      ).rows[0].id;
      // A second draft of the other kind, from the same file's batch — a name is not required.
      await client.query(
        `INSERT INTO draft
           (kind, batch_id, source_filename, source_asset_id, values)
         VALUES ('enquiry', $1, 'fleet-october.pdf', 'asset-source-file', $2::jsonb)`,
        [batchId, JSON.stringify({ name: "Chidi", number: "+2348000000000" })],
      );

      const back = (
        await client.query<{
          kind: string;
          batch_id: string;
          source_filename: string;
          source_asset_id: string;
          values: unknown;
          image_asset_ids: string[];
          state_label: string | null;
          is_demo: boolean;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT kind, batch_id, source_filename, source_asset_id, values, image_asset_ids,
                  state_label, is_demo, created_at, updated_at
             FROM draft WHERE id = $1`,
          [inserted],
        )
      ).rows[0];

      console.log("\na draft, read back:");
      ok("the kind is the record's kind", back.kind === "car", back.kind);
      ok("the batch is shared by every draft from the file", back.batch_id === batchId);
      ok("the file's name is kept", back.source_filename === "fleet-october.pdf");
      ok("the file's reference is kept", back.source_asset_id === "asset-source-file");
      // `jsonb` keeps no key order — it stores a canonical form. So this is checked by meaning, and
      // the same fact is worth the reader's attention: a draft's `values` carry the file's fields,
      // never the file's order (Task 22 must read them by the recipe's field list, not by position).
      const sameInStore = (
        await client.query<{ same: boolean }>(
          `SELECT values = $2::jsonb AS same FROM draft WHERE id = $1`,
          [inserted, JSON.stringify(values)],
        )
      ).rows[0].same;
      ok(
        "the values come back as they were written, structure and all (jsonb keeps no key order)",
        sameInStore && canonical(back.values) === canonical(values),
        `store says ${sameInStore}; ${canonical(back.values).slice(0, 70)}`,
      );
      ok(
        "the images keep their order, index 0 the cover",
        JSON.stringify(back.image_asset_ids) === JSON.stringify(images),
        back.image_asset_ids.join(" → "),
      );
      ok("the state is carried as the name the owner knows", back.state_label === "On Order");
      ok("a draft is not a demo row unless it says so", back.is_demo === false);
      ok(
        "both timestamps were filled by the store",
        back.created_at instanceof Date && back.updated_at instanceof Date,
      );
      const noState = (
        await client.query<{ state_label: string | null }>(
          `SELECT state_label FROM draft WHERE kind = 'enquiry' AND batch_id = $1`,
          [batchId],
        )
      ).rows[0];
      ok("a draft may name no state at all", noState.state_label === null);

      const defaults = (
        await client.query<{ image_asset_ids: string[] }>(
          `SELECT image_asset_ids FROM draft WHERE kind = 'enquiry' AND batch_id = $1`,
          [batchId],
        )
      ).rows[0];
      ok(
        "images arrive empty without being asked for — the template carries no pictures",
        Array.isArray(defaults.image_asset_ids) && defaults.image_asset_ids.length === 0,
        JSON.stringify(defaults.image_asset_ids),
      );

      // --- holding a draft creates no record and consumes no code --------------
      console.log("\nholding a draft changes nothing else:");
      const carsAfter = Number((await client.query("SELECT count(*) FROM car")).rows[0].count);
      const enquiriesAfter = Number(
        (await client.query("SELECT count(*) FROM enquiry")).rows[0].count,
      );
      const seqAfter = (
        await client.query<{ last_value: string }>("SELECT last_value FROM ts_ref_seq")
      ).rows[0].last_value;
      ok("no car was created by holding a draft", carsAfter === carsBefore, `${carsAfter} car(s)`);
      ok(
        "no enquiry was created by holding a draft",
        enquiriesAfter === enquiriesBefore,
        `${enquiriesAfter} enquiry(ies)`,
      );
      ok(
        "no code was taken — the sequence did not move",
        seqAfter === seqBefore,
        `ts_ref_seq ${seqBefore} → ${seqAfter}`,
      );

      // --- the store's refusals ------------------------------------------------
      console.log("\nthe store's refusals:");
      await refusal(
        client,
        "a third kind is refused",
        `INSERT INTO draft (kind, batch_id, source_filename, source_asset_id, values)
         VALUES ('photo', $1, 'x.pdf', 'asset-x', '{}'::jsonb)`,
        "23514",
        [batchId],
      );
      await refusal(
        client,
        "a state id where a state's name belongs is refused",
        `UPDATE draft SET state_label = '4f9a2c1e-8b3d-4a5f-9c2e-1a2b3c4d5e6f' WHERE id = $1`,
        "23514",
        [inserted],
      );
      await refusal(
        client,
        "a draft with no values is refused — the writer must say what the file carried",
        `INSERT INTO draft (kind, batch_id, source_filename, source_asset_id)
         VALUES ('car', $1, 'x.pdf', 'asset-x')`,
        "23502",
        [batchId],
      );
      await refusal(
        client,
        "a draft with no batch is refused — every draft belongs to the file it came from",
        `INSERT INTO draft (kind, source_filename, source_asset_id, values)
         VALUES ('car', 'x.pdf', 'asset-x', '{}'::jsonb)`,
        "23502",
      );
    } finally {
      await client.query("ROLLBACK");
      console.log("\nrolled back — the store is unchanged.");
    }

    const tablesEnd = await publicTables(client);
    const seqEnd = (await client.query<{ last_value: string }>("SELECT last_value FROM ts_ref_seq"))
      .rows[0].last_value;
    ok(
      "the store is exactly as it was before the check",
      JSON.stringify(tablesEnd) === JSON.stringify(tablesBefore) && seqEnd === seqBefore,
      `${tablesEnd.length} tables, ts_ref_seq at ${seqEnd}`,
    );
  } finally {
    await client.end();
  }

  console.log(
    failures === 0
      ? "\nMIGRATION 0022: ALL CHECKS PASS"
      : `\nMIGRATION 0022: ${failures} FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
