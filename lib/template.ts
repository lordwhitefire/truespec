import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CAR_TEMPLATE_FIELDS } from "./template-rules";

// The car's blank, as bytes (truth 9, and build step 7: "the car's PDF template offered as a blank
// at the upload point").
//
// A **form**, not a picture of one: each of the fourteen details is a real AcroForm text field, so
// the file the owner fills in carries its values where a reader can find them again — which is the
// whole reason the template is a PDF and not a spreadsheet. The uploaded file's reader
// (lib/draft-read.ts, Task 22) opens the same field names this module writes, because both take
// them from `CAR_TEMPLATE_FIELDS`.
//
// Deliberately dull: no image, no logo, no colour beyond ink. A blank is a thing to write on.
//
// The page is A4 portrait, one car to a page. Fourteen fields fit one sheet at a 47 pt pitch, which
// is what makes "one page per car" true rather than aspirational.

const PAGE = { width: 595.28, height: 841.89 } as const; // A4 portrait, in points
const MARGIN = 48;
const FIELD_HEIGHT = 20;
const FIELD_WIDTH = PAGE.width - MARGIN * 2;
const ROW_PITCH = 47;
const FIRST_ROW = PAGE.height - 132; // the first field's caption, below the heading

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.78, 0.8, 0.84);
const PAPER = rgb(1, 1, 1);

/**
 * The car's template, as PDF bytes: fourteen empty form fields, one page, no data of any kind.
 *
 * A fresh document is built on every call, so a download can never hand out a document someone
 * filled in — there is no cached copy to hand out.
 */
export async function carTemplatePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE.width, PAGE.height]);

  doc.setTitle("TrueSpec — car template");

  // What this file is for, in the owner's own terms (drawn, not filled in: none of this is read).
  page.drawText("TrueSpec — car template", {
    x: MARGIN,
    y: PAGE.height - 62,
    size: 16,
    font: bold,
    color: INK,
  });
  page.drawText("Fill in one page for each car, save the file, then upload it from the office inventory.", {
    x: MARGIN,
    y: PAGE.height - 82,
    size: 9,
    font,
    color: MUTED,
  });
  page.drawText("Photographs are added in the office, by hand, after the file has been read.", {
    x: MARGIN,
    y: PAGE.height - 96,
    size: 9,
    font,
    color: MUTED,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE.height - 108 },
    end: { x: PAGE.width - MARGIN, y: PAGE.height - 108 },
    thickness: 1,
    color: RULE,
  });

  CAR_TEMPLATE_FIELDS.forEach((field, index) => {
    const caption = FIRST_ROW - index * ROW_PITCH;
    page.drawText(field.words, { x: MARGIN, y: caption, size: 9, font: bold, color: INK });

    const box = form.createTextField(field.form);
    box.addToPage(page, {
      x: MARGIN,
      y: caption - FIELD_HEIGHT - 6,
      width: FIELD_WIDTH,
      height: FIELD_HEIGHT,
      font,
      textColor: INK,
      backgroundColor: PAPER,
      borderColor: RULE,
      borderWidth: 1,
    });
  });

  return doc.save();
}
