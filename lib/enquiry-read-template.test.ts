/**
 * Reading the enquiry blank we draw, executable.
 *
 * The file under test is built from the blank's own names (`enquiryFields`,
 * lib/enquiry-template-rules.ts) — the same names the download draws — so the round trip proves the
 * two halves are one contract rather than two lists that happen to agree today.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { ENQUIRY_TEMPLATE_MAX, enquiryFields } from './enquiry-template-rules';
import {
  NOT_AN_ENQUIRY_SHEET,
  TOO_MANY_ENQUIRIES,
  readEnquiryFile,
  type EnquiryFileRead,
} from './enquiry-read';

/** A blank for `pages` customers, with the field names the download draws. */
async function blank(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  for (let page = 1; page <= pages; page += 1) {
    doc.addPage();
    for (const field of enquiryFields(page)) form.createTextField(field.form);
  }
  return doc.save();
}

/** Fill named fields of a blank, by the file's own field names. */
async function fill(bytes: Uint8Array, values: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) form.getTextField(name).setText(value);
  return doc.save();
}

function ok(read: EnquiryFileRead): Extract<EnquiryFileRead, { ok: true }> {
  assert.equal(read.ok, true, `expected a readable file, got: ${JSON.stringify(read)}`);
  return read as Extract<EnquiryFileRead, { ok: true }>;
}

test('a filled blank becomes one draft per non-blank page, carrying what the file carried', async () => {
  const filled = await fill(await blank(3), {
    enquiry_01_name: 'Ada Obi',
    enquiry_01_number: '0803 123 4567',
    enquiry_01_asked_for: 'A white Camry',
    enquiry_01_note: 'Call after five',
    enquiry_01_state: 'Talking',
    enquiry_02_name: 'John Okafor',
    // page 3 is left as the blank's pad
  });

  const read = ok(await readEnquiryFile(filled));
  assert.equal(read.enquiries.length, 2);
  assert.deepEqual(read.refusals, []);

  assert.deepEqual(read.enquiries[0], {
    values: {
      name: 'Ada Obi',
      number: '0803 123 4567',
      asked_for: 'A white Camry',
      note: 'Call after five',
    },
    stateLabel: 'Talking',
  });
  assert.deepEqual(read.enquiries[1], {
    values: { name: 'John Okafor' },
    stateLabel: null,
  });
});

test('a wholly blank template answers with no drafts and no refusals — the pad is not a demand', async () => {
  const read = ok(await readEnquiryFile(await blank(ENQUIRY_TEMPLATE_MAX)));
  assert.deepEqual(read.enquiries, []);
  assert.deepEqual(read.refusals, []);
});

test('a page carrying only a state still becomes a draft; the save asks for the rest', async () => {
  const filled = await fill(await blank(2), { enquiry_02_state: 'New' });
  const read = ok(await readEnquiryFile(filled));
  assert.deepEqual(read.enquiries, [{ values: {}, stateLabel: 'New' }]);
});

test('a template name on a field that is not text refuses that page, naming it', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.getForm().createCheckBox('enquiry_02_name');
  const bytes = await doc.save();

  const read = ok(await readEnquiryFile(bytes));
  assert.equal(read.enquiries.length, 0);
  assert.equal(read.refusals.length, 1);
  assert.equal(read.refusals[0].page, 2);
  assert.match(read.refusals[0].reason, /not a field this template writes as text/);
});

test("a file with a page beyond the blank's limit is refused whole", async () => {
  const doc = await PDFDocument.load(await blank(1));
  doc.getForm().createTextField(`enquiry_${ENQUIRY_TEMPLATE_MAX + 1}_name`);
  const read = await readEnquiryFile(await doc.save());
  assert.equal(read.ok, false);
  assert.equal((read as Extract<EnquiryFileRead, { ok: false }>).reason, TOO_MANY_ENQUIRIES);
});

test('a PDF with fields of its own is not ours, and does not become a draft', async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.getForm().createTextField('name');
  const read = await readEnquiryFile(await doc.save());
  assert.equal(read.ok, false);
  assert.equal((read as Extract<EnquiryFileRead, { ok: false }>).reason, NOT_AN_ENQUIRY_SHEET);
});

test("a page's field names read back in page order, not the order the fields happen to be listed", async () => {
  const filled = await fill(await blank(3), {
    enquiry_03_name: 'Third',
    enquiry_01_name: 'First',
    enquiry_02_name: 'Second',
  });
  const read = ok(await readEnquiryFile(filled));
  assert.deepEqual(
    read.enquiries.map((enquiry) => enquiry.values.name),
    ['First', 'Second', 'Third']
  );
});
