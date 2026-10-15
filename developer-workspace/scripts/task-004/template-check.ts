/**
 * The car's blank, executable (truth 9, build step 7).
 *
 * What is claimed, and why each claim is the one worth making:
 *
 *   1. the download **is** a PDF, and a whole one — it opens as a PDF, on one page;
 *   2. it asks for **exactly the car's fourteen editable details** — the field names are the same
 *      names the change-check treats as editable (lib/change-check.ts), so the blank and the record
 *      cannot describe a car differently, and the state is asked for by name;
 *   3. it asks for **nothing else** — no `id`, no `ref`, no state key, no cost, no photo field;
 *   4. every field is a **text field** a reader can fill, not a checkbox or a dropdown;
 *   5. the blank is **empty** — it carries no data of any kind;
 *   6. a value written into the blank **survives a save and comes back exactly** — which is the
 *      whole contract the upload (Task 22) will rest on, and the reason this file is a form rather
 *      than a picture of one;
 *   7. the value really is **in the file's bytes**, not only in the object graph;
 *   8. it is served **office-only**: a caller with no session is refused and gets no bytes, and the
 *      route has **no POST at all** — the upload, which receives something, is a different handler
 *      with its own explicit origin check (task.md:96).
 *
 * It touches no store, writes no row and leaves nothing behind.
 *
 *   node --conditions=react-server --import tsx developer-workspace/scripts/task-004/template-check.ts
 *
 * (`--conditions=react-server` because lib/template.ts is a server module — it imports
 * `server-only`, which refuses to load anywhere else.)
 */
import { PDFDocument, PDFTextField } from "pdf-lib";
import { carTemplatePdf } from "../../../lib/template";
import { CAR_TEMPLATE_FIELDS } from "../../../lib/template-rules";

const BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
const MARKER = "ZZBRANDZZ"; // plain ASCII that cannot be a PDF word by accident

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** What a filled-in copy would carry for a field, by the kind of value it holds. */
function sampleValue(recipe: string, kind: string): string {
  if (recipe === "brand") return MARKER;
  if (kind === "number") return "1500000";
  if (kind === "json") return "Air conditioning, Leather seats, Reverse camera";
  if (recipe === "state_id") return "On Order";
  return `Sample ${recipe}`;
}

async function main() {
  const bytes = await carTemplatePdf();
  const asText = Buffer.from(bytes).toString("latin1");

  console.log("the blank itself");
  ok("the download is a PDF", asText.startsWith("%PDF-"), asText.slice(0, 8));
  ok("and a whole one, ended properly", asText.trimEnd().endsWith("%%EOF"));
  ok("it is not empty", bytes.byteLength > 1000, `${bytes.byteLength} bytes`);

  const doc = await PDFDocument.load(bytes);
  ok("it opens as a PDF on one page", doc.getPageCount() === 1, `${doc.getPageCount()} page(s)`);

  const fields = doc.getForm().getFields();
  const names = fields.map((f) => f.getName()).sort();
  const expected = CAR_TEMPLATE_FIELDS.map((f) => f.form).sort();

  console.log("\nwhat it asks for");
  ok(
    "it asks for exactly the car's fourteen editable details",
    names.length === 14 && names.join(" | ") === expected.join(" | "),
    names.join(", "),
  );
  for (const never of ["id", "ref", "is_demo", "version", "state_id", "cost", "photos", "notes"]) {
    ok(`it never asks for ${never}`, !names.includes(never));
  }

  console.log("\nthe fields");
  const textFields = fields.every((f) => f instanceof PDFTextField);
  ok("every field is a text field a reader can fill", textFields, fields.map((f) => f.constructor.name).join(", "));
  const values = fields.map((f) => (f as PDFTextField).getText());
  ok(
    "every field is empty — the blank carries no data",
    values.every((v) => v === undefined || v === ""),
    JSON.stringify(values.filter((v) => v !== undefined && v !== "")),
  );

  console.log("\na filled copy, read back (the upload's contract)");
  const filled = await PDFDocument.load(bytes);
  const filledForm = filled.getForm();
  for (const field of CAR_TEMPLATE_FIELDS) {
    filledForm.getTextField(field.form).setText(sampleValue(field.recipe, field.kind));
  }
  const saved = await filled.save();
  const reloaded = await PDFDocument.load(saved);
  const reloadedForm = reloaded.getForm();
  const written = CAR_TEMPLATE_FIELDS.map((f) => ({
    field: f,
    want: sampleValue(f.recipe, f.kind),
    got: reloadedForm.getTextField(f.form).getText(),
  }));
  const wrong = written.filter((w) => w.got !== w.want);
  ok(
    "all fourteen values come back exactly as they were written",
    wrong.length === 0,
    wrong.map((w) => `${w.field.form}: ${JSON.stringify(w.got)}`).join(", "),
  );
  ok(
    "the state is carried as the name the owner knows",
    reloadedForm.getTextField("state").getText() === "On Order",
  );
  // The save above is pdf-lib's default, which packs objects into compressed object streams — the
  // shape a real reader (Acrobat, Preview, Chrome) writes. To see the value *in the bytes* rather
  // than only trust the object graph, save the same document unpacked and look for it there.
  //
  // A text field's value is serialised the way a real reader serialises one: a hex string holding
  // UTF-16BE text behind a byte-order mark — `/V <FEFF005A...>` — not plain ASCII. So the search is
  // for exactly that.
  const unpacked = await filled.save({ useObjectStreams: false });
  const asHex = `FEFF${Buffer.from(MARKER, "utf16le").swap16().toString("hex").toUpperCase()}`;
  ok(
    "the value is written into the file itself, not only held in memory",
    Buffer.from(unpacked).includes(asHex) && !Buffer.from(bytes).includes(asHex),
    `/V <${asHex}> · ${Buffer.from(saved).length} bytes packed, ${Buffer.from(unpacked).length} unpacked`,
  );

  console.log("\nserved office-only");
  try {
    const unauth = await fetch(`${BASE}/api/template`, { redirect: "manual" });
    const refused = await unauth.text();
    ok("a caller with no session is refused the blank", unauth.status === 401, `status ${unauth.status}`);
    ok(
      "and no bytes of the blank ride along with the refusal",
      !refused.includes("%PDF") && !(unauth.headers.get("content-type") ?? "").includes("application/pdf"),
      `${unauth.headers.get("content-type")} · ${JSON.stringify(refused.slice(0, 40))}`,
    );

    const post = await fetch(`${BASE}/api/template`, { method: "POST", body: "x" });
    ok("the route has no POST — Next answers 405", post.status === 405, `status ${post.status}`);
  } catch (error) {
    ok(`could not reach ${BASE} — is the dev server up?`, false, String(error));
  }

  console.log(failures === 0 ? "\nTEMPLATE CHECK PASSED" : `\nTEMPLATE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
