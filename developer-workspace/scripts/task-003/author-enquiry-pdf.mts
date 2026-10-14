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
// One column changed with the follow-up: the sheet used to list a car *code*
// ("TS-1001"). A code is ours, not the customer's — it is an enquiry about a car we
// happen to hold, and it makes every enquiry about something in our list. The sheet
// now records what the customer asked for in their own words, codes in none of them
// (D11, `key-and-hash-v1.md` decision 13).
//
// The PDF is written by hand (no dependency) so the artefact is reproducible:
// a minimal single page, Helvetica, with a correctly computed xref table.
//
//   node --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/author-enquiry-pdf.mts

import { mkdirSync, writeFileSync } from "node:fs";

export const ORIGINAL_FILENAME = "enquiries-2026-09-30.pdf";

// The rows the sheet carries. Fictional throughout, and every date within this
// year. What each customer is after is recorded in **their own words**
// (`askedFor`) — never one of our codes: this is a customer's note, not a stock
// list. Chika's asks for a car we do not hold, which is the honest case (D11).
export const ROWS = [
  { name: "Ada Nwosu", phone: "0803 000 0101", askedFor: "a 2021 Camry XSE V6 — the black one on your lot", note: "Asked about finance terms", date: "2026-09-04" },
  { name: "Bright Okonkwo", phone: "0805 000 0102", askedFor: "the white BMW X5 xDrive40i", note: "Wants the black interior", date: "2026-09-11" },
  { name: "Chika Adeyemi", phone: "0807 000 0103", askedFor: "a 2022 Toyota Highlander, the new shape", note: "Waiting for the arrival date", date: "2026-09-18" },
  { name: "Damilola Eze", phone: "0809 000 0104", askedFor: "a 2019 Lexus RX 350 in silver", note: "Ready to inspect on Saturday", date: "2026-09-25" },
];

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const line = (font: string, size: number, dy: number, text: string) =>
  `/${font} ${size} Tf 0 ${dy} Td (${esc(text)}) Tj`;

const contentText = [
  "BT",
  // The first move is absolute (top-left of the A4 page); every later `Td` is
  // relative to the line above. Without this the whole sheet sits at negative y,
  // off the page — valid PDF, no readable text.
  "50 792 Td",
  line("F2", 16, 0, "TrueSpec Autos - Enquiry Sheet"),
  line("F1", 10, -20, "fictional sample - prepared by the sales desk, 30 September 2026"),
  line("F1", 10, -14, "SAMPLE DATA. Every name, number and note below is invented for the demonstration."),
  line("F1", 10, -14, "What each customer is after is written below in their own words, not in our codes."),
  line("F2", 10, -28, `${"Name".padEnd(26)}${"Phone".padEnd(20)}Recorded`),
  line("F1", 9, -16, "-".repeat(100)),
  ...ROWS.flatMap((r) => [
    line("F1", 10, -20, `${r.name.padEnd(26)}${r.phone.padEnd(20)}${r.date}`),
    line("F2", 10, -14, `  Asked for: ${r.askedFor}`),
    line("F1", 9, -12, `  Note:      ${r.note}`),
  ]),
  "ET",
].join("\n");

// The fonts are single-byte and the two font objects below declare WinAnsiEncoding,
// so the stream's bytes are cp1252. ASCII passes through unchanged; the few
// characters cp1252 places at 0x80…0x9F (an em dash, a curly quote) map to their
// byte. A character the font cannot carry fails loudly here rather than silently
// becoming garbage inside the PDF.
const WIN_ANSI_BYTES: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

function winAnsi(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) out += ch;
    else if (ch in WIN_ANSI_BYTES) out += String.fromCharCode(WIN_ANSI_BYTES[ch]);
    else
      throw new Error(
        `author: the PDF's Helvetica (WinAnsi) cannot carry "${ch}" (U+${code.toString(16).toUpperCase()})`,
      );
  }
  return out;
}

const content = winAnsi(contentText);

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
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
