/**
 * TASK-004 Task 31 — the fixtures the flows witness uploads.
 *
 * Two files, both real bytes on disk so the browser can be handed a genuine File:
 *
 *   1. a PNG (a photo)                 — runs/flows/fixtures/photo.png
 *   2. a filled car template PDF        — runs/flows/fixtures/car-template-filled.pdf
 *
 * The template is built the same way the served blank is (lib/template.ts → carTemplatePdf) and then
 * filled the same way a reader fills it (pdf-lib setTextField), so what the upload receives is exactly
 * the shape /api/upload reads.
 */
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";

import { carTemplatePdf } from "../../../lib/template";
import { carFields } from "../../../lib/template-rules";

const DIR = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows/fixtures");

// A real, valid PNG. (A hand-rolled 1×1 base64 PNG is rejected by lib/photos.ts's strict chunk walk
// — "a chunk runs past the end of the file" — so the fixture is a genuine image that the byte
// boundary accepts.)
const PNG_SOURCE = join(
  process.cwd(),
  "node_modules/playwright-core/lib/tools/dashboard/appIcon.png",
);

function valueFor(recipe: string, kind: string, marker: string): string {
  if (recipe === "brand") return marker;
  if (recipe === "model") return "Fixture";
  if (recipe === "trim") return "STD";
  if (kind === "number") return recipe === "year" ? "2021" : "22000";
  if (recipe === "was_price_kobo" || recipe === "doorstep_price_kobo") return "5000000";
  if (kind === "json") return "Air conditioning, Leather seats";
  if (recipe === "state_id") return "Available";
  return `Fixture ${recipe}`;
}

// Two cars, so the drafts screen holds two and the witness can save one and deliberately leave the
// other unsaved — which is what task.md's flow asks for ("save its drafts one by one (one left
// unsaved)").
const CARS_IN_TEMPLATE = 2;

async function main() {
  mkdirSync(DIR, { recursive: true });

  const pngPath = join(DIR, "photo.png");
  copyFileSync(PNG_SOURCE, pngPath);
  const pngBytes = readFileSync(pngPath).length;

  const stamp = String(Date.now());
  const brands = Array.from({ length: CARS_IN_TEMPLATE }, (_, i) => `TS-FIX-${stamp}-${i + 1}`);
  const templateFile = `car-template-${stamp}.pdf`;

  const bytes = await carTemplatePdf(CARS_IN_TEMPLATE);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  for (let car = 1; car <= CARS_IN_TEMPLATE; car++) {
    for (const field of carFields(car)) {
      form.getTextField(field.form).setText(valueFor(field.recipe, field.kind, brands[car - 1]));
    }
  }
  const saved = await doc.save();
  const tmplPath = join(DIR, templateFile);
  writeFileSync(tmplPath, saved);

  // Read it back — prove the values survived, the same check the upload will make.
  const reloaded = await PDFDocument.load(saved);
  const rf = reloaded.getForm();
  const readBack = brands.map((_, i) => rf.getTextField(`brand${i === 0 ? "" : `_${i + 1}`}`).getText());

  console.log(`photo.png                 ${pngBytes} bytes`);
  console.log(`car template              ${saved.length} bytes · ${CARS_IN_TEMPLATE} cars · ${templateFile}`);
  console.log(`  brands read back: ${readBack.join(", ")}`);
  writeFileSync(
    join(DIR, "fixtures.json"),
    JSON.stringify({ stamp, brands, carsInTemplate: CARS_IN_TEMPLATE, templateFile }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
