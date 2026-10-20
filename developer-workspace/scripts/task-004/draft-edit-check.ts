/**
 * Proves the draft edit's two writes (owner ruling 2026-10-20, #3; P4).
 *
 * The claim: **"Save as draft" keeps the row waiting — no record, no `TS-####`, no activity — and
 * "Save car" sends the same edited form through the office form's own reader and makes exactly one
 * record.** It also proves the state label follows the chosen primary, and that the owner's edit
 * layer (`draft.form`) really is what the save reads.
 *
 * Writes only its own rows and removes them in `finally`; the one thing it cannot put back is the
 * `TS-####` it spends, which is the point of the save, not a leak.
 *
 * Run:
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *     developer-workspace/scripts/task-004/draft-edit-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { getDraft } from "../../../lib/draft-store";
import { runSaveDraft, runSaveDraftAsDraft } from "../../../lib/draft-save-run";
import type { DraftFields } from "../../../lib/device-draft";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  const q = (text: string, params?: unknown[]) => client.query(text, params);

  const batchId = randomUUID();
  const brand = `Witness Draft Edit ${batchId.slice(0, 8)}`;
  const draftId = randomUUID();
  let actorId: string | null = null;
  let carId: string | null = null;

  try {
    actorId = (
      await q(`INSERT INTO office_user (email) VALUES ($1) RETURNING id`, [
        `witness-draft-edit-${randomUUID()}@example.invalid`,
      ])
    ).rows[0].id as string;

    const states = (
      await q(
        `SELECT id, label, section FROM car_state
          WHERE kind = 'primary' AND section <> 'sold'
          ORDER BY sort, label`,
      )
    ).rows as { id: string; label: string; section: string }[];
    if (states.length === 0) throw new Error("no non-sold primary car state");
    const chosen = states.length > 1 ? states[1] : states[0];
    const original = states[0];

    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label)
       VALUES ($1, 'car', $2, $3, $4, $5::jsonb, $6)`,
      [
        draftId,
        batchId,
        "witness draft edit.pdf",
        "asset-witness-not-uploaded",
        JSON.stringify({
          brand: "File Brand",
          model: "File Model",
          year: 2018,
          mileage: 1000,
          exterior_color: "Black",
          interior_color: "Grey",
          features: ["From the file"],
          note: "file note",
          private_note: "",
          was_price_kobo: null,
          arrival_note: "",
          doorstep_price_kobo: 1500000,
        }),
        original.label,
      ],
    );

    const seqBefore = Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value);
    const carsBefore = Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n);

    // ------------------------------------------------------------- Save as draft (in place) ---
    const fields: DraftFields = {
      brand: "Edited Brand",
      model: "Edited Model",
      trim: "LE",
      year: "2021",
      mileage: "12,000",
      exteriorColor: "White",
      interiorColor: "Black",
      features: "Sunroof\nLeather",
      note: "buyer note",
      privateNote: "private note",
      wasPrice: "26,000,000",
      arrivalNote: "Here now",
      price: "25,000,000",
      stateId: chosen.id,
      "cost.purchase_price": "20,000,000",
      "cost.shipping": "1,000,000",
      secondaryStateIds: [],
    };

    const kept = await runSaveDraftAsDraft(draftId, fields, chosen.id);
    ok("Save as draft succeeds", kept.ok, kept.ok ? "" : JSON.stringify(kept.errors));

    const row = await getDraft(draftId);
    ok("...and the row is still waiting", row !== null);
    ok(
      "...carrying the owner's edit layer, field for field",
      row?.form?.brand === "Edited Brand" && row?.form?.price === "25,000,000",
      String(row?.form?.brand),
    );
    ok("...and the chosen state's own name", row?.stateLabel === chosen.label, `${String(row?.stateLabel)}`);
    ok("...with its file values untouched underneath", row?.values.brand === "File Brand");
    ok(
      "no record was made, and no TS-#### was spent",
      Number((await q(`SELECT count(*) AS n FROM car WHERE brand = $1`, ["Edited Brand"])).rows[0].n) === 0 &&
        Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value) === seqBefore,
    );
    ok(
      "no activity was written for a draft save",
      Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n) === 0,
    );

    // --------------------------------------------------------------- Save car (the same form) ---
    const form = new FormData();
    form.set("draftId", draftId);
    form.set("intent", "car");
    for (const [name, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        for (const entry of value) form.append(name, entry);
      } else {
        form.set(name, value);
      }
    }

    const saved = await runSaveDraft(draftId, chosen.id, actorId, form);
    ok("Save car succeeds", saved.ok, saved.ok ? "" : JSON.stringify(saved.errors));
    if (!saved.ok) throw new Error("the save was refused — the rest cannot be judged");

    const made = (
      await q(`SELECT id, ref, brand, model, year, mileage, state_id FROM car WHERE brand = $1`, [
        "Edited Brand",
      ])
    ).rows[0] as Record<string, unknown> | undefined;
    carId = (made?.id as string | undefined) ?? null;

    ok("one car was made — and only one", Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n) === carsBefore + 1);
    ok(
      "it carries the edited values, not the file's",
      made?.brand === "Edited Brand" && made?.model === "Edited Model" && Number(made?.year) === 2021,
      `${String(made?.brand)} / ${String(made?.model)} / ${String(made?.year)}`,
    );
    ok("it carries the chosen state", made?.state_id === chosen.id);
    ok(
      "it was given the next TS-####",
      made?.ref === `TS-${String(seqBefore + 1).padStart(4, "0")}`,
      String(made?.ref),
    );
    ok(
      "its two costs came with it",
      Number((await q(`SELECT count(*) AS n FROM cost_line WHERE car_id = $1`, [carId])).rows[0].n) === 2,
    );
    ok(
      "the save was recorded as the owner's own act",
      Number(
        (await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1 AND kind = 'car.created'`, [actorId]))
          .rows[0].n,
      ) === 1,
    );
    ok("the draft went the moment it became a record", (await getDraft(draftId)) === null);
    ok("the save reports the code it minted", saved.ref === made?.ref, String(saved.ref));
  } finally {
    if (carId) await q(`DELETE FROM car WHERE id = $1`, [carId]);
    await q(`DELETE FROM draft WHERE batch_id = $1`, [batchId]);
    if (actorId) {
      await q(`DELETE FROM activity_event WHERE actor_id = $1`, [actorId]);
      await q(`DELETE FROM office_user WHERE id = $1`, [actorId]);
    }
    const left = Number((await q(`SELECT count(*) AS n FROM draft WHERE batch_id = $1`, [batchId])).rows[0].n);
    ok("the store is left as it was found", left === 0);
    await client.end();
  }

  console.log(failures === 0 ? "DRAFT-EDIT CHECK PASSED" : `DRAFT-EDIT CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
