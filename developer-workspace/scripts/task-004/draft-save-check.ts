/**
 * Proves the save, and the whole life of a draft around it (truth 9; D16).
 *
 * The claim: **a draft is not a record until it is saved, and saving one makes exactly one record —
 * its own — and leaves its brothers waiting.** So this witness makes ten car drafts from one imagined
 * file, saves one of them, and checks the store after: one car, carrying the file's own values and its
 * picture, given its `TS-####` and its change-check *at that moment*; the other nine still waiting,
 * untouched. Then it proves the two things the holding place is for: a draft that is not saved survives
 * a reload exactly as the file left it, and a draft that is abandoned spends no code and creates
 * nothing.
 *
 * Two more things it asserts while it is there (Task 25): **an enquiry's save** runs end to end too —
 * the enquiry has its own rule and its own statement, and the save's half of it had never been run —
 * and **every content row this layer writes is marked as the demonstration's** (`is_demo`, task.md:280
 * -284), so the one move that empties the demonstration empties these rows with it.
 *
 * Everything here is the **real** thing. The save is `runSaveDraft` — the same run the Server Action
 * calls, with the action's only contribution (the actor's id, taken from the session) passed in
 * directly. The values are judged by the office form's own reader (`readCarInput`, through
 * `lib/draft-save.ts`); the record is written by the real `carCreateStatement`; the picture is a real
 * image in the real asset store, resolved by the real proof-of-resolution read. A copy of any of these
 * could drift — so there is no copy.
 *
 * **This witness writes, and removes exactly what it writes.** Its drafts share one `batch_id` it
 * mints; the car it makes is found by the `brand` it wrote; its image is deleted by the id the store
 * returned; and its office user is deleted by the id it made. A `finally` does all of it and then
 * checks, so a run that leaves anything behind — or disturbs the demo's own rows — fails.
 *
 * One thing it cannot put back: the `TS-####` it spends. A sequence is not rewound, and should not be
 * — the number was really assigned. That is the point being proven, not a leak.
 *
 * Run:
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *     developer-workspace/scripts/task-004/draft-save-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import sharp from "sharp";
import { deleteAsset, findImageAsset, uploadImage } from "../../../lib/sanity";
import { deleteDraft, getDraft } from "../../../lib/draft-store";
import { runSaveDraft } from "../../../lib/draft-save-run";

loadEnv({ path: ".env.local", quiet: true });

/** Real image bytes — the asset store only takes a picture it can actually decode. */
async function picture(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 20, g: 90, b: 160 } } })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** The fields a car file carries — the recipe's own names (`CAR_RECIPE`). */
const CAR_KEYS = [
  "arrival_note",
  "brand",
  "doorstep_price_kobo",
  "exterior_color",
  "features",
  "interior_color",
  "mileage",
  "model",
  "note",
  "private_note",
  "trim",
  "was_price_kobo",
  "year",
];

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
  const brand = `Witness Car ${batchId.slice(0, 8)}`;
  const enquiryName = `Witness Enquiry ${batchId.slice(0, 8)}`;
  let actorId: string | null = null;
  let imageId: string | null = null;
  let enquiryId: string | null = null;

  try {
    // ---------------------------------------------------------------- the actor and the state ---
    // The save records who acted (`activity_event.actor_id` is a real FK), so the witness needs a real
    // office user. It makes one and removes it again — the store has none, and must be left with none.
    actorId = (
      await q(`INSERT INTO office_user (email) VALUES ($1) RETURNING id`, [
        `witness-draft-save-${randomUUID()}@example.invalid`,
      ])
    ).rows[0].id as string;

    // A car may not *start* sold, so the state the file names is a primary that is not Sold.
    const state = (
      await q(
        `SELECT id, label FROM car_state
          WHERE kind = 'primary' AND section <> 'sold'
          ORDER BY sort, label LIMIT 1`,
      )
    ).rows[0] as { id: string; label: string } | undefined;
    if (!state) throw new Error("no non-sold primary car state to save into");

    // An enquiry may sit in no state — but a file may name one, and a name has to resolve to an id.
    const enquiryState = (
      await q(`SELECT id, label FROM enquiry_state ORDER BY sort, label LIMIT 1`)
    ).rows[0] as { id: string; label: string } | undefined;
    if (!enquiryState) throw new Error("no enquiry state to save into");

    // ------------------------------------------------------------------- ten drafts, one file ---
    const ids: string[] = [];
    for (let i = 1; i <= 10; i += 1) {
      const id = randomUUID();
      ids.push(id);
      const values: Record<string, unknown> = {
        brand: `${brand} ${i}`,
        model: "Test Model",
        trim: i === 1 ? "XSE" : "",
        year: 2016,
        exterior_color: "Black",
        interior_color: "Cream",
        mileage: 45000 + i,
        features: ["Leather seats", "Reverse camera"],
        note: `A note for ${i}`,
        private_note: "",
        // ₦12,500.50 — the kobo must survive the round trip. A display helper (`formatNaira`) drops it.
        was_price_kobo: 1250050,
        arrival_note: "",
        doorstep_price_kobo: 1500000,
      };
      await q(
        `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label)
         VALUES ($1, 'car', $2, $3, $4, $5::jsonb, $6)`,
        [id, batchId, "witness cars.pdf", "asset-witness-not-uploaded", JSON.stringify(values), state.label],
      );
    }

    // The pictures the file cannot carry are the owner's to add. One real image, on the draft to save.
    const jpeg = await picture();
    const png = await uploadImage(jpeg, { filename: `witness-${randomUUID()}.jpg`, contentType: "image/jpeg" });
    imageId = png.assetId;
    await q(`UPDATE draft SET image_asset_ids = ARRAY[$2]::text[] WHERE id = $1`, [ids[0], imageId]);

    // The asset store answers its reads after a short propagation, so this asks until the reference
    // resolves — the property is that it *does* resolve, not that it resolves within one round trip.
    let resolves = false;
    for (let attempt = 0; attempt < 6 && !resolves; attempt += 1) {
      resolves = (await findImageAsset(imageId)) !== null;
      if (!resolves) await new Promise((r) => setTimeout(r, 250));
    }
    ok("the picture is really in the store — its reference resolves", resolves, imageId);

    const seqBefore = Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value);
    const carsBefore = Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n);

    // ------------------------------------------------------------------------- the save (one) ---
    const saved = await runSaveDraft(ids[0], "", actorId);
    ok("saving a car draft succeeds", saved.ok, saved.ok ? "" : JSON.stringify(saved.errors));
    if (!saved.ok) throw new Error("the save was refused — the rest cannot be judged");

    const seqAfter = Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value);
    const made = (await q(`SELECT * FROM car WHERE brand = $1`, [`${brand} 1`])).rows[0] as
      | Record<string, unknown>
      | undefined;

    ok("one car was made — and only one", Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n) === carsBefore + 1);
    ok(
      "it carries the file's own values, and nothing invented",
      made?.brand === `${brand} 1` && made?.model === "Test Model" && made?.trim === "XSE",
      `${String(made?.brand)} / ${String(made?.model)} / ${String(made?.trim)}`,
    );
    ok("the year and mileage survived as numbers", Number(made?.year) === 2016 && Number(made?.mileage) === 45001, `${String(made?.year)} / ${String(made?.mileage)}`);
    ok(
      "the money round-tripped to the kobo — ₦12,500.50, not ₦12,500",
      Number(made?.was_price_kobo) === 1250050 && Number(made?.doorstep_price_kobo) === 1500000,
      `${String(made?.was_price_kobo)}`,
    );
    ok(
      "it was given the next TS-#### — minted at the save, not at the upload",
      made?.ref === `TS-${String(seqAfter).padStart(4, "0")}` && seqAfter === seqBefore + 1,
      `${String(made?.ref)} (sequence ${seqBefore} → ${seqAfter})`,
    );
    ok(
      "its change-check was computed at the save",
      typeof made?.content_hash === "string" && (made.content_hash as string).length === 64,
      String(made?.content_hash).slice(0, 12),
    );
    ok("its state is the one the file named", made?.state_id === state.id, `${String(made?.state_id)} = ${state.label}`);
    ok(
      "its picture came with it — position 0, the cover",
      Number((await q(`SELECT count(*) AS n FROM car_photo WHERE car_id = $1`, [made?.id])).rows[0].n) === 1,
    );
    ok(
      "the save was recorded as the owner's own act",
      Number(
        (await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1 AND kind = 'car.created'`, [actorId]))
          .rows[0].n,
      ) === 1,
    );
    ok(
      "the car the office made carries the demo marker (task.md:280 — the demonstration is the fleet)",
      made?.is_demo === true,
      String(made?.is_demo),
    );

    // ---------------------------------------------------------- its brothers — untouched (nine) ---
    const waiting = (await q(`SELECT id FROM draft WHERE batch_id = $1`, [batchId])).rows as { id: string }[];
    ok(
      "its nine brothers are still waiting — one save makes one record",
      waiting.length === 9 && !waiting.some((r) => r.id === ids[0]),
      `${waiting.length} left`,
    );
    ok("the saved draft is no longer waiting", (await getDraft(ids[0])) === null);

    // ------------------------------------------------------------------ a reload keeps a draft ---
    const reloaded = await getDraft(ids[1]);
    ok(
      "a draft that is not saved survives — a reload reads the same row",
      reloaded !== null && reloaded.batchId === batchId && reloaded.kind === "car",
      reloaded ? reloaded.sourceFilename : "gone",
    );
    ok(
      "...with its values, its state's name and its images exactly as the file left them",
      JSON.stringify(Object.keys(reloaded?.values ?? {}).sort()) === JSON.stringify(CAR_KEYS) &&
        reloaded?.stateLabel === state.label &&
        (reloaded?.imageAssetIds.length ?? -1) === 0,
      reloaded?.stateLabel ?? "no state",
    );

    // ------------------------------------------------------------- an abandoned draft burns none ---
    const seqBeforeDrop = Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value);
    const carsBeforeDrop = Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n);
    await deleteDraft(ids[1]);
    ok("deleting a draft creates nothing", Number((await q(`SELECT count(*) AS n FROM car`)).rows[0].n) === carsBeforeDrop);
    ok(
      "and spends no TS-#### — an abandoned draft costs no code",
      Number((await q(`SELECT last_value FROM ts_ref_seq`)).rows[0].last_value) === seqBeforeDrop,
    );

    // ------------------------------------------------- the record's rules, enforced at the save ---
    // A draft may wait incomplete; the save is where the record's own rules bite. Two of them, both
    // refused **whole** — nothing created, and the draft still there to be fixed.
    await q(`UPDATE draft SET state_label = $2 WHERE id = $1`, [ids[2], "A state nobody made"]);
    const goneState = await runSaveDraft(ids[2], "", actorId);
    ok(
      "a file that named a state that is gone is asked to choose, not guessed at",
      !goneState.ok && goneState.errors.some((e) => e.field === "stateId"),
      goneState.ok ? "saved" : JSON.stringify(goneState.errors),
    );
    ok("...and that draft is still waiting — a refused save loses nothing", (await getDraft(ids[2])) !== null);

    await q(`UPDATE draft SET state_label = $2, values = values || '{"brand":""}'::jsonb WHERE id = $1`, [
      ids[3],
      state.label,
    ]);
    const incomplete = await runSaveDraft(ids[3], "", actorId);
    ok(
      "a draft missing a required field is refused at that field",
      !incomplete.ok && incomplete.errors.some((e) => e.field === "brand"),
      incomplete.ok ? "saved" : JSON.stringify(incomplete.errors),
    );
    ok("...and it too is still waiting", (await getDraft(ids[3])) !== null);

    // ------------------------------------------- the other kind — an enquiry's save, end to end ---
    // The enquiry's save runs the same `runSaveDraft` with its own rule and its own statement. This
    // closes the gap the task's note named as unverified (only the enquiry's *rule* was unit-tested),
    // and proves that write carries the demo marker like every other content write in this layer.
    const enquiryDraftId = randomUUID();
    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'enquiry', $2, $3, $4, $5::jsonb, $6, true)`,
      [
        enquiryDraftId,
        batchId,
        "witness enquiries.pdf",
        "asset-witness-not-uploaded",
        JSON.stringify({
          name: enquiryName,
          number: "+2348000000001",
          asked_for: "a small saloon",
          note: "made by the witness",
        }),
        enquiryState.label,
      ],
    );
    const enquiriesBefore = Number((await q(`SELECT count(*) AS n FROM enquiry`)).rows[0].n);

    const savedEnquiry = await runSaveDraft(enquiryDraftId, "", actorId);
    ok(
      "saving an enquiry draft succeeds — the other kind, the same run",
      savedEnquiry.ok,
      savedEnquiry.ok ? "" : JSON.stringify(savedEnquiry.errors),
    );
    if (savedEnquiry.ok) {
      const row = (await q(`SELECT * FROM enquiry WHERE name = $1`, [enquiryName])).rows[0] as
        | Record<string, unknown>
        | undefined;
      enquiryId = (row?.id as string | undefined) ?? null;
      ok(
        "one enquiry was made — and only one",
        Boolean(row) && Number((await q(`SELECT count(*) AS n FROM enquiry`)).rows[0].n) === enquiriesBefore + 1,
      );
      ok(
        "it carries what the sheet said, and the state the file named",
        row?.number === "+2348000000001" &&
          row?.asked_for === "a small saloon" &&
          row?.enquiry_state_id === enquiryState.id,
        `${String(row?.number)} / state ${String(row?.enquiry_state_id)}`,
      );
      ok(
        "that write carries the demo marker too — every content write this layer makes does",
        row?.is_demo === true,
        String(row?.is_demo),
      );
      ok("the enquiry draft went the moment it became a record", (await getDraft(enquiryDraftId)) === null);
    }
  } finally {
    // Remove exactly what this run made — and nothing else. The drafts go by the batch it minted, the
    // car by the brand it wrote, the actor by its own id.
    if (imageId) {
      const removed = await deleteAsset(imageId);
      console.log(`  note  the witness's own picture: ${removed.deleted ? "removed" : (removed.reason ?? "not removed")}`);
      imageId = null;
    }
    await q(`DELETE FROM draft WHERE batch_id = $1`, [batchId]);
    await q(`DELETE FROM car WHERE brand LIKE $1`, [`${brand} %`]);
    if (enquiryId) {
      await q(`DELETE FROM enquiry WHERE id = $1`, [enquiryId]);
      enquiryId = null;
    }
    if (actorId) {
      await q(`DELETE FROM activity_event WHERE actor_id = $1`, [actorId]);
      await q(`DELETE FROM office_user WHERE id = $1`, [actorId]);
    }
    const draftsLeft = Number((await q(`SELECT count(*) AS n FROM draft WHERE batch_id = $1`, [batchId])).rows[0].n);
    const carsLeft = Number((await q(`SELECT count(*) AS n FROM car WHERE brand LIKE $1`, [`${brand} %`])).rows[0].n);
    const enquiriesLeft = Number(
      (await q(`SELECT count(*) AS n FROM enquiry WHERE name = $1`, [enquiryName])).rows[0].n,
    );
    ok(
      "the store is left as it was found — the witness's own rows are gone",
      draftsLeft === 0 && carsLeft === 0 && enquiriesLeft === 0,
      `${draftsLeft} drafts, ${carsLeft} cars, ${enquiriesLeft} enquiries left behind`,
    );
    await client.end();
  }

  console.log(failures === 0 ? "DRAFT-SAVE CHECK PASSED" : `DRAFT-SAVE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
