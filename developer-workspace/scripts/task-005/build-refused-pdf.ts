/**
 * TASK-005 Task 25 fixture — a filled car blank whose every page is refused.
 *
 * Built from the blank's own field names (`carFields`, lib/template-rules.ts — the same names the
 * download draws), two pages, each carrying several values the reader cannot read, and different
 * fields on each. Every page is refused, so no car is readable from the file: the upload answers
 * 422 with the refusals and touches nothing — no draft row, no held asset
 * (app/api/upload/route.ts, the `cars.length === 0` branch).
 *
 * Run: node --import tsx developer-workspace/scripts/task-005/build-refused-pdf.ts [out.pdf]
 */
import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { carFieldName, carFields } from "../../../lib/template-rules";

const out = process.argv[2] ?? "/tmp/opencode/refused-template.pdf";

async function main() {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  for (const car of [1, 2]) {
    doc.addPage();
    for (const field of carFields(car)) form.createTextField(field.form);
  }

  const put = (car: number, name: string, value: string) =>
    form.getTextField(carFieldName(name, car)).setText(value);

  // Page 1 — a filled make, and two values that cannot be read.
  put(1, "brand", "Toyota");
  put(1, "mileage", "not a number");
  put(1, "doorstep_price_kobo", "about five million");

  // Page 2 — different fields, same defect.
  put(2, "brand", "Honda");
  put(2, "year", "twenty twenty");
  put(2, "was_price_kobo", "lots of money");

  writeFileSync(out, await doc.save());
  console.log(`wrote ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
