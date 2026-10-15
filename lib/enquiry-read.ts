// An enquiry sheet, read back into drafts.
//
// The enquiry's file is the sales desk's own sheet — "the manually prepared enquiry sheet the office
// imports" (scripts/task-003/author-enquiry-pdf.mts) — not a form we draw. Truth 9: "the car's
// template … is a PDF; the enquiry's file carries its five editable details … because five fields
// need no made-up form." So there is no AcroForm here and nothing of ours inside the PDF: the sheet
// is words, and this reader reads the words.
//
// Two rules shape everything, the same two as the car's reader (lib/draft-read.ts):
//
//   * **Nothing is invented.** A field the sheet left off produces no value; this reader never
//     guesses a name, a number or a state the sheet did not carry.
//   * **Nothing is dropped in silence.** A row whose details cannot be read comes back as a
//     **refusal** naming the row and saying why. The caller reports them; this reader never
//     quietly leaves a row out.
//
// The parsing is split in two on purpose: `parseEnquirySheet` is pure and takes the sheet's lines
// (so the whole rule is unit-tested with plain strings), and `readEnquiryFile` is only the PDF half
// — pull the words out of the file, hand them to the parser.

import { PDFArray, PDFDocument, PDFRawStream, PDFStream, decodePDFRawStream } from "pdf-lib";

/** One enquiry read from the sheet: the record's fields as the sheet carried them, nothing more. */
export type EnquiryDraft = {
  /** The record's editable fields the sheet carried — parsed, never required, never invented. */
  values: Record<string, unknown>;
  /** The state the sheet named, as the owner knows it, or `null` when it named none. */
  stateLabel: string | null;
};

/** An enquiry row the sheet could not give us: the row it was on, and why. */
export type EnquiryRefusal = { row: number; reason: string };

export type EnquiryFileRead =
  /** The sheet is one of ours: `enquiries` to keep, and a `refusal` for every row it could not give. */
  | { ok: true; enquiries: EnquiryDraft[]; refusals: EnquiryRefusal[] }
  /** The file cannot be read at all. Nothing was taken from it. */
  | { ok: false; reason: string };

/** The sheet's own title line — how we know a PDF is one of ours without a form field to go by. */
export const ENQUIRY_SHEET_TITLE = "TrueSpec Autos - Enquiry Sheet";

export const NOT_AN_ENQUIRY_SHEET =
  "That PDF is not an enquiry sheet — it does not carry our sheet's heading. " +
  "Send the sheet the office imports, or the car template from the inventory.";
export const ENQUIRY_PDF_UNREADABLE =
  "That PDF could not be opened. Try saving it again, or send a fresh sheet.";

/**
 * The sheet's labelled details, and the stored field each stands for. The sheet writes a detail as
 * "  Asked for: …" under the row's name, so the *label* — not a field name — is what we match. A
 * label we do not know is the sheet's own word and is left alone: truth 9, "the record's editable
 * fields and nothing else … nothing beyond them is read".
 *
 * `state` is here because the ruling says a file may name the state the owner tracks (task.md:308 —
 * "the state a file names is applied at the save"). The sample sheet carries none, so a sheet
 * without it simply gives a draft no state, and the save asks the owner to choose.
 */
const LABELS: Readonly<Record<string, string | undefined>> = {
  "asked for": "asked_for",
  note: "note",
  state: "state",
};

/** The line the rows start after: `Name                  Phone               Recorded`. */
const HEADER = /^Name\s+Phone\s+Recorded\s*$/;

/** A row's first line: the name and number, then the day the enquiry was recorded. */
const ROW = /^(.+?)\s{2,}([\d][\d\s]{5,}\d)\s{2,}(\d{4}-\d{2}-\d{2})\s*$/;

/** A detail line: two spaces of indent, a label, a colon, then the value. */
const DETAIL = /^\s*([A-Za-z][A-Za-z ]*?):\s*(.*)$/;

/** A line of the rule that separates the sheet's heading from its rows. */
const RULE = /^-{6,}$/;

/** A value as the sheet carried it: trimmed, and `null` when the sheet wrote nothing. */
function text(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** One row while it is being read: its place, its name and number, and the details beneath it. */
type Row = {
  row: number;
  name: string;
  number: string;
  details: Record<string, string>;
  refused: boolean;
};

/**
 * Read the sheet's lines into enquiry drafts — pure, so the whole rule is testable without a PDF.
 *
 * The rows sit after the sheet's heading and its rule of dashes. Each row is the name/number line
 * followed by its labelled details, exactly as the sheet writes them.
 */
export function parseEnquirySheet(
  lines: readonly string[],
): { ok: true; enquiries: EnquiryDraft[]; refusals: EnquiryRefusal[] } | { ok: false; reason: string } {
  const title = lines.find((line) => line.trim() !== "")?.trim();
  if (title !== ENQUIRY_SHEET_TITLE) return { ok: false, reason: NOT_AN_ENQUIRY_SHEET };

  const header = lines.findIndex((line) => HEADER.test(line.trim()));
  if (header === -1) return { ok: false, reason: NOT_AN_ENQUIRY_SHEET };

  const enquiries: EnquiryDraft[] = [];
  const refusals: EnquiryRefusal[] = [];

  let current: Row | null = null;
  let rowNumber = 0;

  /** Finish the open row: keep it as a draft, unless something on it could not be read. */
  const close = () => {
    if (!current) return;
    if (!current.refused) {
      const values: Record<string, unknown> = { name: current.name, number: current.number };
      for (const [field, value] of Object.entries(current.details)) {
        if (field === "state") continue;
        const read = text(value);
        if (read !== null) values[field] = read;
      }
      const state = current.details.state === undefined ? null : text(current.details.state);
      enquiries.push({ values, stateLabel: state });
    }
    current = null;
  };

  for (const raw of lines.slice(header + 1)) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") continue;
    if (RULE.test(line.trim())) continue;

    const detail = DETAIL.exec(line);
    if (detail) {
      const field = LABELS[detail[1].toLowerCase().trim()];
      // Not one of the five, or nothing to belong to: not ours to read.
      if (field === undefined || !current) continue;

      if (current.details[field] !== undefined) {
        // Written twice: which value is right cannot be known, so the row is refused rather than
        // keeping whichever happened to come last.
        current.refused = true;
        refusals.push({ row: current.row, reason: `"${detail[1].trim()}" is written twice on this row` });
      } else {
        current.details[field] = detail[2];
      }
      continue;
    }

    const match = ROW.exec(line.trim());
    if (!match) {
      // A line that names neither a detail of the open row nor a row of its own: it says something
      // we cannot place. Refusing it is how the owner learns which line, rather than losing it.
      refusals.push({
        row: current ? current.row : rowNumber + 1,
        reason: "this line is not a name and number the sheet can read",
      });
      continue;
    }

    close();
    rowNumber += 1;
    current = {
      row: rowNumber,
      name: match[1].trim(),
      number: match[2].trim(),
      details: {},
      refused: false,
    };
  }

  close();

  return { ok: true, enquiries, refusals };
}

/** A PDF's header may sit after a short run of bytes; the first kilobyte is where a reader looks. */
function startsWithPdf(bytes: Uint8Array): boolean {
  return new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).includes("%PDF-");
}

/**
 * Every text string the content stream draws, in the order it draws them — the sheet's lines.
 *
 * A content stream shows text as strings in parentheses, shown by `Tj` (one string) or `TJ` (an
 * array of strings and spacing). Matching the parenthesised strings in order covers both, and is
 * all a words-only sheet needs: we are reading the page's visible text, not laying it out. The
 * backslash escapes a PDF string uses (`\(`, `\)`, `\\`, `\n`, and `\ddd`) are undone here.
 */
function contentLines(content: string): string[] {
  const strings: string[] = [];
  const pattern = /\((?:\\\\.|[^\\\\()])*\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    strings.push(
      match[0]
        .slice(1, -1)
        .replace(/\\([nrtbf()\\])/g, (_, ch: string) =>
          ch === "n" ? "\n" : ch === "r" ? "\r" : ch === "t" ? "\t" : ch === "b" ? "\b" : ch === "f" ? "\f" : ch,
        )
        .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8))),
    );
  }
  return strings;
}

/**
 * One page's content, decoded. The bytes are read as Windows-1252 because the sheet's fonts declare
 * `WinAnsiEncoding` (the demo sheet does), so a byte like `0x97` is the em-dash the owner sees and
 * not the control character a Latin-1 read would make of it. The stream's operators are plain ASCII,
 * so decoding the whole stream this way changes nothing but the words.
 */
function streamText(stream: PDFStream): string {
  const bytes = stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents();
  return new TextDecoder("windows-1252").decode(bytes);
}

/** Every word the document draws, across its pages, in order. */
function documentLines(doc: PDFDocument): string[] {
  const lines: string[] = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    if (!contents) continue;
    const streams: PDFStream[] = [];
    if (contents instanceof PDFArray) {
      for (let i = 0; i < contents.size(); i++) {
        const stream = doc.context.lookup(contents.get(i));
        if (stream instanceof PDFStream) streams.push(stream);
      }
    } else {
      streams.push(contents);
    }
    for (const stream of streams) lines.push(...contentLines(streamText(stream)));
  }
  return lines;
}

/**
 * Read an enquiry sheet. One draft per row, in the sheet's own order, so a row's number *is* the
 * row the owner sees — which is what a refusal is named by.
 */
export async function readEnquiryFile(bytes: Uint8Array): Promise<EnquiryFileRead> {
  if (!startsWithPdf(bytes)) return { ok: false, reason: NOT_AN_ENQUIRY_SHEET };

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch {
    return { ok: false, reason: ENQUIRY_PDF_UNREADABLE };
  }

  return parseEnquirySheet(documentLines(doc));
}
