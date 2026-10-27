import 'server-only';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  ENQUIRY_TEMPLATE_DEFAULT,
  ENQUIRY_TEMPLATE_MAX,
  ENQUIRY_TEMPLATE_TITLE,
  enquiryFields,
} from './enquiry-template-rules';

// The enquiry's blank, as bytes (owner ruling 2026-10-20: "add an enquiry template pdf … readable by
// the existing upload").
//
// A **form**, not a picture of one: each of the five details is a real AcroForm text field, so the
// file the owner fills in carries its values where `lib/enquiry-read.ts` can find them again. One
// customer to a page; the page number is in every field's name, which is how the reader knows the
// file is ours and how a refusal names the page.
//
// Deliberately dull: no image, no logo, no colour beyond ink. A blank is a thing to write on.

const PAGE = { width: 595.28, height: 841.89 } as const; // A4 portrait, in points
const MARGIN = 48;
const FIELD_HEIGHT = 22;
const FIELD_WIDTH = PAGE.width - MARGIN * 2;
const ROW_PITCH = 72;
const FIRST_ROW = PAGE.height - 190; // the first field's caption, below the heading

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.78, 0.8, 0.84);
const PAPER = rgb(1, 1, 1);

type HeadingOptions = {
  font: PDFFont;
  bold: PDFFont;
  page: number;
  pages: number;
};

/** One page's heading: what the file is for, and which customer page this is. */
function drawHeading(page: PDFPage, { font, bold, page: number, pages }: HeadingOptions): void {
  page.drawText(ENQUIRY_TEMPLATE_TITLE, {
    x: MARGIN,
    y: PAGE.height - 62,
    size: 16,
    font: bold,
    color: INK,
  });

  const label = `Enquiry ${page} of ${pages}`;
  page.drawText(label, {
    x: PAGE.width - MARGIN - bold.widthOfTextAtSize(label, 11),
    y: PAGE.height - 60,
    size: 11,
    font: bold,
    color: INK,
  });

  page.drawText(
    'Fill in one page for each customer, save the file, then upload it from Enquiries.',
    { x: MARGIN, y: PAGE.height - 82, size: 9, font, color: MUTED }
  );
  page.drawText(
    'The name and phone number are required when the draft is saved; the rest may wait.',
    {
      x: MARGIN,
      y: PAGE.height - 96,
      size: 9,
      font,
      color: MUTED,
    }
  );

  page.drawLine({
    start: { x: MARGIN, y: PAGE.height - 112 },
    end: { x: PAGE.width - MARGIN, y: PAGE.height - 112 },
    thickness: 1,
    color: RULE,
  });

  const footer = `Page ${page} of ${pages}`;
  page.drawText(footer, {
    x: PAGE.width - MARGIN - font.widthOfTextAtSize(footer, 8),
    y: 34,
    size: 8,
    font,
    color: MUTED,
  });
}

/**
 * The enquiry blank, as PDF bytes: five empty form fields per page, one customer to a page, no data
 * of any kind.
 *
 * A fresh document is built on every call, so a download can never hand out a document someone
 * filled in — there is no cached copy to hand out.
 */
export async function enquiryTemplatePdf(pages = ENQUIRY_TEMPLATE_DEFAULT): Promise<Uint8Array> {
  if (!Number.isInteger(pages) || pages < 1 || pages > ENQUIRY_TEMPLATE_MAX) {
    throw new Error(`a blank carries 1 to ${ENQUIRY_TEMPLATE_MAX} enquiries, not ${pages}`);
  }

  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(
    pages === 1 ? ENQUIRY_TEMPLATE_TITLE : `${ENQUIRY_TEMPLATE_TITLE} (${pages} enquiries)`
  );

  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    drawHeading(page, { font, bold, page: pageNumber, pages });

    enquiryFields(pageNumber).forEach((field, index) => {
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
  }

  return doc.save();
}
