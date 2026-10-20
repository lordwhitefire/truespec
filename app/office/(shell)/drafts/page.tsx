import "./drafts.css";
import { getDrafts } from "@/lib/draft-store";
import { getCarStateRegistry, getEnquiryStateRegistry } from "@/lib/office";
import { shortAge } from "@/lib/office-time";
import { carFields } from "@/lib/template-rules";
import { imageUrl } from "@/lib/sanity";
import { formatNaira, parseCostAmount } from "@/lib/money";
import { carFieldValue, carFormDataFromDraft, type DraftFormState } from "@/lib/draft-form";
import { requireOfficeSession } from "@/lib/session";
import { Drafts, type DraftBatch, type DraftCard, type StateOption } from "./drafts-client";

// Drafts are the store's rows, so this page renders per request — never from a build-time snapshot
// of it.
export const dynamic = "force-dynamic";

/* Drafts — the holding place, reviewed (truth 9).

   "An upload lands as a draft, and a draft is not a record." This page shows everything a file
   carried, in the file's own order by batch, and lets the owner finish each one by hand: name the
   state, add the pictures the template cannot carry, then **save** (which creates the record, with
   its `TS-####` given then and not before) or **delete** it. Until he does, nothing here is in `car`
   or `enquiry`, so the board, the counts, the showroom and the section lists carry no filter for a
   draft — no code has been spent.

   The captions are the ones the owner already reads: a car's fields are named exactly as the blank
   names them (`lib/template-rules.ts`), so a value cannot be called one thing on the blank and
   another here. */

/** The car's fields as the blank names them, minus the state — the state is offered, not read. */
const CAR_FIELDS = carFields(1).filter((f) => f.recipe !== "state_id");

/** The enquiry's four details, as the sheet names them (`lib/enquiry-read.ts` reads the same words). */
const ENQUIRY_FIELDS: { recipe: string; label: string }[] = [
  { recipe: "name", label: "Name" },
  { recipe: "number", label: "Phone number" },
  { recipe: "asked_for", label: "Asked for" },
  { recipe: "note", label: "Note" },
];

/** The two fields the reader stores in kobo; every other value is already the words to show. */
const MONEY = new Set(["was_price_kobo", "doorstep_price_kobo"]);

function show(value: unknown, isMoney: boolean): string {
  if (value === null || value === undefined || value === "") return "";
  if (isMoney && typeof value === "number") return formatNaira(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

/** A car field as the form would show it, with a typed naira amount still reading as money. */
function carDisplay(value: string, isMoney: boolean): string {
  if (!isMoney || value.trim() === "") return value;
  const parsed = parseCostAmount(value);
  return parsed.ok ? formatNaira(parsed.amountMinor) : value;
}

export default async function DraftsPage() {
  await requireOfficeSession();
  const [drafts, carStates, enquiryStates] = await Promise.all([
    getDrafts(),
    getCarStateRegistry(),
    getEnquiryStateRegistry(),
  ]);
  const now = new Date();

  // A car's own state must be one of the four primaries (the same rule the save enforces); an
  // enquiry may be given any state the owner keeps.
  const carOptions: StateOption[] = carStates
    .filter((s) => s.kind === "primary")
    .map((s) => ({ id: s.id, label: s.label }));
  const enquiryOptions: StateOption[] = enquiryStates.map((s) => ({ id: s.id, label: s.label }));
  // The draft form's mapping needs each primary's section, not just its id and name.
  const primaryStates: DraftFormState[] = carStates.flatMap((s) =>
    s.kind === "primary" && s.section !== null
      ? [{ id: s.id, label: s.label, section: s.section }]
      : [],
  );

  // One entry per upload, newest first, the drafts within it kept in the order the store returned
  // (D16's table carries no ordinal, so a file's own page order is not recoverable — flagged, not
  // guessed at).
  const batches: DraftBatch[] = [];
  for (const d of drafts) {
    const waiting = shortAge(d.createdAt, now);
    // The card reads `form ?? values`: the owner's edit when there is one, the file's own reading
    // when there is not. A car's field names differ between the two layers, so the mapping goes
    // through `carFormDataFromDraft` — the same bridge the edit page uses.
    let fields: { label: string; value: string }[];
    let editHref: string | undefined;
    if (d.kind === "car") {
      const mapped = carFormDataFromDraft(d, primaryStates, [], waiting);
      fields = CAR_FIELDS.map((f) => ({
        label: f.words,
        value: carDisplay(carFieldValue(mapped, f.recipe), MONEY.has(f.recipe)),
      }));
      editHref = `/office/drafts/car/${d.id}`;
    } else {
      fields = ENQUIRY_FIELDS.map((f) => ({
        label: f.label,
        value: show(d.values[f.recipe], false),
      }));
      editHref = `/office/drafts/enquiry/${d.id}`;
    }

    // The state the file named, matched to the registry so the chooser opens on it — `null` when the
    // file named none, or named one that is gone (then the save asks, rather than inventing one).
    const options = d.kind === "car" ? carOptions : enquiryOptions;
    const stateId =
      d.stateLabel !== null ? (options.find((o) => o.label === d.stateLabel)?.id ?? null) : null;

    const card: DraftCard = {
      id: d.id,
      kind: d.kind,
      fields,
      images: d.imageAssetIds.map((assetId) => ({ assetId, url: imageUrl(assetId) })),
      stateLabel: d.stateLabel,
      stateId,
      waiting,
      editHref,
    };

    const last = batches[batches.length - 1];
    if (last && last.batchId === d.batchId) {
      last.cards.push(card);
    } else {
      batches.push({
        batchId: d.batchId,
        sourceFilename: d.sourceFilename,
        kind: d.kind,
        cards: [card],
      });
    }
  }

  return <Drafts batches={batches} carStates={carOptions} enquiryStates={enquiryOptions} />;
}
