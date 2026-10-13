// Task 13 — author the one demo enquiry PDF.
//
// What this document is: the manually prepared enquiry sheet the office imports
// (specs/enquiries — upload, preview, confirm). This layer authors only the
// *stored result*; the upload/import flow itself is the functionality layer's.
//
// It is plainly fictional: an invented dealer headed "fictional sample", every
// name, phone number and note invented, and a banner saying so. No real person's
// details appear anywhere.
//
// The PDF is written by hand (no dependency) so the artefact is reproducible:
// a minimal single page, Helvetica, with a correctly computed xref table.
//
//   node --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/author-enquiry-pdf.mts

import { mkdirSync, writeFileSync } from "node:fs";

export const ORIGINAL_FILENAME = "enquiries-2026-09-30.pdf";

// The rows the sheet carries. Fictional throughout; the refs are fleet cars so
// the import links to real stock. Dates span a range, all within this year.
export const ROWS = [
  { name: "Ada Nwosu", phone: "0803 000 0101", car: "TS-1001", note: "Asked about finance terms", date: "2026-09-04" },
  { name: "Bright Okonkwo", phone: "0805 000 0102", car: "TS-1005", note: "Wants the black interior", date: "2026-09-11" },
  { name: "Chika Adeyemi", phone: "0807 000 0103", car: "TS-1013", note: "Waiting for the arrival date", date: "2026-09-18" },
  { name: "Damilola Eze", phone: "0809 000 0104", car: "TS-1019", note: "Ready to inspect on Saturday", date: "2026-09-25" },
];

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const line = (font: string, size: number, dy: number, text: string) =>
  `/${font} ${size} Tf 0 ${dy} Td (${esc(text)}) Tj`;

const content = [
  "BT",
  // The first move is absolute (top-left of the A4 page); every later `Td` is
  // relative to the line above. Without this the whole sheet sits at negative y,
  // off the page — valid PDF, no readable text.
  "50 792 Td",
  line("F2", 16, 0, "TrueSpec Autos - Enquiry Sheet"),
  line("F1", 10, -20, "fictional sample - prepared by the sales desk, 30 September 2026"),
  line("F1", 10, -14, "SAMPLE DATA. Every name, number, car and note below is invented for the demonstration."),
  line("F2", 10, -30, "Name            Phone            Car       Note                              Recorded"),
  line("F1", 9, -16, "-".repeat(104)),
  ...ROWS.flatMap((r) => [
    line(
      "F1",
      10,
      -18,
      `${r.name.padEnd(16)}${r.phone.padEnd(17)}${r.car.padEnd(10)}${r.note.padEnd(34)}${r.date}`,
    ),
  ]),
  "ET",
].join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
];

const parts: Buffer[] = [];
let offset = 0;
const push = (s: string | Buffer) => {
  const b = Buffer.isBuffer(s) ? s : Buffer.from(s, "latin1");
  parts.push(b);
  offset += b.length;
};

push("%PDF-1.4\n");
const offsets: number[] = [];
objects.forEach((body, i) => {
  offsets.push(offset);
  push(`${i + 1} 0 obj\n${body}\nendobj\n`);
});

const xrefStart = offset;
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
push(xref);
push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

const dir = "developer-workspace/scripts/task-003/runs/task-13";
mkdirSync(dir, { recursive: true });
const path = `${dir}/${ORIGINAL_FILENAME}`;
writeFileSync(path, Buffer.concat(parts));
console.log(`wrote ${path} (${Buffer.concat(parts).length} bytes, ${ROWS.length} enquiry rows)`);
