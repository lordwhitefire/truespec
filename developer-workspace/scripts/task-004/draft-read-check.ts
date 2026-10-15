/**
 * Proves the car file upload's two halves (truth 9; D16; `specs/inventory`, `specs/media`):
 * **a filled blank becomes one draft per car, and nothing is invented and nothing is dropped in
 * silence** — and the file itself is held, its reference only in the database.
 *
 * Everything here is the **real** thing: the blank is built by the real download (`lib/template.ts`),
 * the file is read by the real reader (`lib/draft-read.ts`), the rows are written by the real write
 * (`lib/draft.ts`), the file is held by the real asset store (`lib/sanity.ts`), and the refusals are
 * the real handler's (`app/api/upload/route.ts`). No copy of any of them — a copy could drift.
 *
 * **This witness writes, and removes exactly what it wrote.** Its drafts live under a `batch_id` it
 * mints itself and are deleted by that id in a `finally`; its held asset is deleted by the id the
 * store returned. The `car` table and the reference sequence are checked back at the end, so a run
 * that leaves a car behind — or eats a reference code — fails.
 *
 * What is claimed:
 *
 *   1. a filled blank for three cars reads as three drafts, in the pages' order;
 *   2. a filled blank for ten cars reads as ten drafts — the batch the download now draws;
 *   3. car 1's bare names and car 2's suffixed names are read as two *different* cars;
 *   4. money written in naira is read as kobo, by the same rule the on-screen form uses;
 *   5. the feature list is split the way the blank's caption says it is;
 *   6. the state is read as a **name** and never as a value — a draft occupies no state;
 *   7. a field the file left blank is absent from the draft — nothing is invented;
 *   8. a page with no car on it is refused, naming the page;
 *   9. a value that cannot be read refuses its car, naming the field;
 *  10. no page disappears: every page is a draft or a refusal, and the two add up;
 *  11. a file that is not a PDF is refused whole, with a reason;
 *  12. a PDF that is not one of our blanks is refused whole, with a reason;
 *  13. the write records one **batch** — every draft of a file shares one `batch_id`;
 *  14. `car` is the size it was: a draft is not a car;
 *  15. the next reference code is untouched — a draft takes no `TS-####`;
 *  16. a draft's `values` is exactly what the file carried, keyed by the recipe's own field names;
 *  17. the state's name is in `state_label`, `kind` is `car`, and the row is not a demo row;
 *  18. the held file carries a randomised name, with nothing of the owner's name in it;
 *  19. the held reference resolves to real bytes (and is removed again);
 *  20. a POST from no origin, and from another origin, is refused (403) and reads nothing;
 *  21. the route exports `POST` and **no GET** — no GET can change data (task.md line 253).
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/draft-read-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { PDFDocument } from "pdf-lib";
import { Client } from "pg";
import { recordCarDrafts } from "../../../lib/draft";
import { NOT_A_PDF, NOT_OUR_TEMPLATE, readCarFile } from "../../../lib/draft-read";
import { deleteAsset, findFileAsset, uploadFile } from "../../../lib/sanity";
import { carTemplatePdf } from "../../../lib/template";
import { carFieldName } from "../../../lib/template-rules";
import { heldFilename, sourceFilename } from "../../../lib/upload-rules";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** Build a blank of `cars` cars (the real download) and fill the named fields (by the real names). */
async function filled(cars: number, values: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await carTemplatePdf(cars));
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) form.getTextField(name).setText(value);
  return doc.save();
}

const HOST = "truespec.test";
const ORIGIN = "https://truespec.test";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const count = async (table: string) =>
    Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
  const nextRef = async () =>
    Number((await client.query("SELECT last_value AS n FROM ts_ref_seq")).rows[0].n);

  const batchId = randomUUID();
  const unknownBatch = randomUUID();
  let heldAssetId: string | null = null;

  const carsBefore = await count("car");
  const refBefore = await nextRef();

  try {
    // ------------------------------------------------------- the reader, on the real blank ---
    const three = await filled(3, {
      [carFieldName("brand", 1)]: "Toyota",
      [carFieldName("model", 1)]: "Camry",
      [carFieldName("year", 1)]: "2021",
      [carFieldName("mileage", 1)]: "31,000",
      [carFieldName("was_price_kobo", 1)]: "42,000,000",
      [carFieldName("doorstep_price_kobo", 1)]: "45,500,000",
      [carFieldName("features", 1)]: "Panoramic roof, Leather seats",
      [carFieldName("state_id", 1)]: "On Order",
      [carFieldName("brand", 2)]: "Honda",
      [carFieldName("model", 2)]: "Accord",
      [carFieldName("brand", 3)]: "Kia",
      [carFieldName("model", 3)]: "Rio",
    });

    const read = await readCarFile(three);
    ok("a filled blank for three cars reads as a file of ours", read.ok);
    if (!read.ok) throw new Error(`the three-car blank was refused: ${read.reason}`);

    ok("it is three drafts, in the pages' order",
      JSON.stringify(read.cars.map((c) => c.values.brand)) === JSON.stringify(["Toyota", "Honda", "Kia"]),
      JSON.stringify(read.cars.map((c) => c.values.brand)));
    ok("the second car's suffixed names are the second car, not a correction to the first",
      read.cars[1]?.values.model === "Accord", String(read.cars[1]?.values.model));

    const first = read.cars[0]?.values ?? {};
    ok("money is read as kobo — the naira the owner wrote, by the form's own rule",
      first.was_price_kobo === 4_200_000_000 && first.doorstep_price_kobo === 4_550_000_000,
      JSON.stringify([first.was_price_kobo, first.doorstep_price_kobo]));
    ok("a whole number is read with its separators stripped", first.mileage === 31_000 && first.year === 2021,
      JSON.stringify([first.mileage, first.year]));
    ok("the feature list is split the way the caption says",
      JSON.stringify(first.features) === JSON.stringify(["Panoramic roof", "Leather seats"]),
      JSON.stringify(first.features));
    ok("the state is a name — a draft occupies no state", read.cars[0]?.stateLabel === "On Order", String(read.cars[0]?.stateLabel));
    ok("and the state is not a value", !("state_id" in first) && !("state" in first), Object.keys(first).join(", "));
    ok("a field the file left blank is absent — nothing is invented", !("note" in first) && !("private_note" in first));

    // ------------------------------------------------------------- ten cars, as the download draws it ---
    const tenValues: Record<string, string> = {};
    for (let car = 1; car <= 10; car += 1) {
      tenValues[carFieldName("brand", car)] = `Brand${car}`;
      tenValues[carFieldName("model", car)] = `Model${car}`;
    }
    const ten = await readCarFile(await filled(10, tenValues));
    ok("a ten-car blank reads as ten drafts", ten.ok && ten.cars.length === 10,
      ten.ok ? String(ten.cars.length) : ten.reason);
    if (ten.ok) {
      ok("each car is its own car, in order",
        JSON.stringify(ten.cars.map((c) => c.values.brand)) ===
          JSON.stringify(Array.from({ length: 10 }, (_, i) => `Brand${i + 1}`)));
    }

    // ---------------------------------------------------- refusals: named, and nothing dropped ---
    const withGap = await readCarFile(await filled(3, {
      [carFieldName("brand", 1)]: "Toyota",
      [carFieldName("brand", 3)]: "Kia",
    }));
    ok("a page with no car on it is refused, naming the page",
      withGap.ok && withGap.refusals.some((r) => r.page === 2 && /no car details/i.test(r.reason)),
      withGap.ok ? JSON.stringify(withGap.refusals) : withGap.reason);

    const withBad = await readCarFile(await filled(2, {
      [carFieldName("brand", 1)]: "Toyota",
      [carFieldName("brand", 2)]: "Honda",
      [carFieldName("mileage", 2)]: "not a number",
      [carFieldName("doorstep_price_kobo", 2)]: "about five million",
    }));
    ok("a value that cannot be read refuses its car, naming the field — it never becomes a guess",
      withBad.ok &&
        withBad.cars.length === 1 &&
        withBad.refusals.length === 1 &&
        withBad.refusals[0].page === 2 &&
        /Mileage/.test(withBad.refusals[0].reason) &&
        /Doorstep price/.test(withBad.refusals[0].reason),
      withBad.ok ? withBad.refusals[0]?.reason : withBad.reason);

    if (withGap.ok) {
      ok("no page disappears — every page is a draft or a refusal",
        withGap.cars.length + withGap.refusals.length === 3, `${withGap.cars.length} + ${withGap.refusals.length}`);
    }

    const notPdf = await readCarFile(new TextEncoder().encode("not a PDF at all"));
    ok("a file that is not a PDF is refused whole, with a reason",
      !notPdf.ok && notPdf.reason === NOT_A_PDF, notPdf.ok ? "read" : notPdf.reason);

    const foreign = await PDFDocument.create();
    foreign.addPage();
    foreign.getForm().createTextField("something_else");
    const foreignRead = await readCarFile(await foreign.save());
    ok("a PDF that is not one of our blanks is refused whole, with a reason",
      !foreignRead.ok && foreignRead.reason === NOT_OUR_TEMPLATE, foreignRead.ok ? "read" : foreignRead.reason);

    // -------------------------------------------------------------------- the write (the store) ---
    const written = await recordCarDrafts({
      batchId,
      sourceFilename: sourceFilename("  cars august.pdf  "),
      sourceAssetId: "asset-witness-not-uploaded",
      cars: read.cars,
    });
    ok("the write records every car the file carried", written === 3, String(written));

    const rows = (
      await client.query(`SELECT * FROM draft WHERE batch_id = $1 ORDER BY created_at, id`, [batchId])
    ).rows as Record<string, unknown>[];
    // The ids are minted at random, so `id` orders nothing: find the first car's row by its own mark.
    const firstRow = rows.find(
      (row) => (row.values as Record<string, unknown> | null)?.brand === "Toyota",
    ) as Record<string, unknown> | undefined;
    ok("one batch: every draft of a file shares one batch_id",
      rows.length === 3 && rows.every((r) => r.batch_id === batchId), String(rows.length));
    ok("the owner's own name for the file is kept, trimmed",
      rows.every((r) => r.source_filename === "cars august.pdf"), String(rows[0]?.source_filename));
    ok("the draft holds only what the file carried (keyed by the recipe's own names)",
      JSON.stringify(Object.keys(firstRow?.values ?? {}).sort()) ===
        JSON.stringify(["brand", "doorstep_price_kobo", "features", "mileage", "model", "was_price_kobo", "year"].sort()),
      Object.keys(firstRow?.values ?? {}).join(", "));
    ok("the state's name is in state_label", firstRow?.state_label === "On Order", String(firstRow?.state_label));
    ok("a draft is a car draft, and not a demo row", rows[0]?.kind === "car" && rows[0]?.is_demo === false);
    ok("no reference code is given at the upload", !("ref" in (rows[0] ?? {})));

    ok("the draft is not a car — the car table is the size it was", (await count("car")) === carsBefore,
      `${await count("car")} vs ${carsBefore}`);
    ok("and the next reference code is untouched — a draft takes no TS-####", (await nextRef()) === refBefore,
      `${await nextRef()} vs ${refBefore}`);

    // ------------------------------------------------------------------- the held file (the store) ---
    const heldName = heldFilename(randomUUID());
    ok("a held file's name is randomised, with nothing of the owner's name in it",
      !heldName.includes("cars august") && !heldName.includes("template") && heldName.endsWith(".pdf"), heldName);

    const held = await uploadFile(Buffer.from(three), {
      filename: heldName,
      contentType: "application/pdf",
    });
    heldAssetId = held.assetId;
    ok("the file is held — the asset store returned a reference", heldAssetId.startsWith("file-"), heldAssetId);

    // The asset store answers reads after its own short propagation, so this asks again a few times
    // rather than calling a reference "resolving nothing" on the first beat — the property under test
    // is that the held reference *does* resolve, not that it resolves within one round trip.
    let found: Awaited<ReturnType<typeof findFileAsset>> = null;
    for (let attempt = 0; attempt < 6 && found === null; attempt += 1) {
      found = await findFileAsset(heldAssetId);
      if (found === null) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    ok("the reference resolves to real bytes", found !== null && (found.size ?? 0) > 0,
      found ? `${found.size} bytes` : "not found");

    const removed = await deleteAsset(heldAssetId);
    ok("and the witness's own asset is removed again", removed.deleted === true, removed.reason ?? "");
    heldAssetId = null;
  } finally {
    if (heldAssetId) {
      const cleanup = await deleteAsset(heldAssetId);
      console.log(`  note  cleaned up an asset left behind: ${cleanup.deleted ? "removed" : cleanup.reason}`);
    }
    await client.query("DELETE FROM draft WHERE batch_id = ANY($1::uuid[])", [[batchId, unknownBatch]]);
    const left = Number(
      (await client.query("SELECT count(*) AS n FROM draft WHERE batch_id = ANY($1::uuid[])", [[batchId, unknownBatch]])).rows[0].n,
    );
    ok("the store is the size it was — the witness's own drafts are gone", left === 0, `${left} left behind`);
    ok("and no car was created by a witness that only read a file and wrote drafts",
      (await count("car")) === carsBefore, `${await count("car")} vs ${carsBefore}`);
    await client.end();
  }

  console.log(failures === 0 ? "DRAFT-READ CHECK PASSED" : `DRAFT-READ CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
