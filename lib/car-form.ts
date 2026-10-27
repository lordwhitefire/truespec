// Reading the office's car form — lifted out of the action file so the draft save can share it.
//
// These rules used to live inside `app/office/actions/car.ts`. They moved here for one reason: a
// `"use server"` file may only export server **actions**, so a helper it exports becomes a public
// endpoint — and the draft save (task 24) needs the very same judgement. Saving a draft must judge a
// car exactly as the office form is judged, or a car saved from a file and a car typed by hand could
// be described two ways. One rule, one place.
//
// Nothing here decides *what* to write; it only reads and judges. The caller writes.

import 'server-only';
import { readCarInput, type CarFormInput, type CarInputValue, type FieldError } from './car-input';
import { storeQuery } from './store-guard';
import { findImageAsset } from './sanity';
import { isAssetRef } from './photo-rules';
import { isSection, type Section } from './sections';
import { saleForState, SOLD_SECTION, type SaleInput } from './sale';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A car form, judged: the values to store, the photos proven, and the chosen state's section. */
export type CarFormValue = {
  columns: CarInputValue['columns'];
  costs: CarInputValue['costs'];
  secondaryStateIds: string[];
  /** The photos as the form lists them — the whole set, in order, position 0 the cover (truth 7). */
  photos: string[];
  /** The sale, only while the chosen state is Sold (truth 5); `null` otherwise. */
  sale: SaleInput | null;
  /** The section the chosen primary state resolves to — the registry's fact. */
  section: Section;
};

/** Read the form's strings into the reader's shape. Field names are the form's contract. */
export function toCarForm(form: FormData): CarFormInput {
  const str = (name: string): string => {
    const v = form.get(name);
    return typeof v === 'string' ? v : '';
  };
  return {
    brand: str('brand'),
    model: str('model'),
    trim: str('trim'),
    year: str('year'),
    exteriorColor: str('exteriorColor'),
    interiorColor: str('interiorColor'),
    mileage: str('mileage'),
    features: str('features'),
    note: str('note'),
    privateNote: str('privateNote'),
    wasPrice: str('wasPrice'),
    arrivalNote: str('arrivalNote'),
    price: str('price'),
    stateId: str('stateId'),
    secondaryStateIds: form
      .getAll('secondaryStateIds')
      .filter((v): v is string => typeof v === 'string'),
    costs: {
      purchase_price: str('cost.purchase_price'),
      shipping: str('cost.shipping'),
      clearing: str('cost.clearing'),
      trucking_usa: str('cost.trucking_usa'),
      trucking_ng: str('cost.trucking_ng'),
      full_tank: str('cost.full_tank'),
    },
    salePrice: str('salePrice'),
    saleDate: str('saleDate'),
  };
}

/**
 * The photos the form listed, in order — membership and order only.
 *
 * Truth 7: the asset-reference column never holds a web address, so the values are checked to be
 * Sanity asset ids. The form sends one `photos` field per photo, in the order they are to be stored,
 * so the order is the browser's — the cover is whichever it put first. A repeated id is kept once: a
 * list that named the same photo twice would otherwise fill two positions with one picture.
 *
 * The *shape* check lives in `carFormFacts` below, first among the facts, so a value that is not an
 * asset id is refused before any state or store check — the order the action has always used.
 */
export function readPhotos(form: FormData): string[] {
  const photos: string[] = [];
  for (const raw of form.getAll('photos')) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id) continue;
    if (!photos.includes(id)) photos.push(id);
  }
  return photos;
}

/**
 * Truth 7's guarantee, asked rather than assumed: "the rows link on save, so a car is never saved
 * pointing at bytes that were never uploaded."
 *
 * The browser's list is a claim, and a Server Action is a public endpoint — so each id is put to the
 * store and the answer decides. The store says it holds no such asset: a refusal the owner can act
 * on. The store cannot be reached: also a refusal — but named as one to retry, because saving the row
 * anyway would leave it pointing at nothing, which is the one thing this check exists to prevent.
 * `findImageAsset` is the existing proof-of-resolution read, reused rather than invented.
 */
async function photosExist(photos: readonly string[]): Promise<string | null> {
  for (const id of photos) {
    try {
      const found = await findImageAsset(id);
      if (!found) {
        return 'One of those photos is not in the picture store any more. Add it again and save.';
      }
    } catch {
      return 'The picture store could not be reached, so nothing was saved. Try again.';
    }
  }
  return null;
}

/**
 * Judge an already-read car against its photos and the registry — the part every car write shares
 * (DRY: the create, the edit and the draft save judge the same values the same way).
 *
 * A Server Action is a public endpoint, so nothing a browser sent is trusted: the ids are checked to
 * be ids (a malformed key must be a field refusal, never a SQL error the owner cannot act on), and
 * the states are checked against the store — the primary is one of the four fixed primaries, and
 * every secondary still exists as a secondary. The registry is the truth; a form cannot invent a
 * fifth primary or attach a state that is not there.
 */
export async function carFormFacts(
  value: CarInputValue,
  photos: readonly string[]
): Promise<{ ok: true; value: CarFormValue } | { ok: false; errors: FieldError[] }> {
  const { columns, costs, secondaryStateIds, sale: saleFacts } = value;

  // Not an asset id at all: refused first, before any state or store check.
  for (const id of photos) {
    if (!isAssetRef(id)) {
      return {
        ok: false,
        errors: [{ field: 'photos', message: 'One of those photos could not be read' }],
      };
    }
  }

  const errors: FieldError[] = [];
  if (!UUID.test(columns.state_id))
    errors.push({ field: 'stateId', message: "Choose the car's state" });
  for (const id of secondaryStateIds) {
    if (!UUID.test(id))
      errors.push({ field: 'secondaryStateIds', message: 'One of those states could not be read' });
  }
  if (errors.length > 0) return { ok: false, errors };

  const [check] = await storeQuery<
    {
      primary_kind: string | null;
      primary_section: string | null;
      secondaries_ok: boolean;
    }[]
  >(
    `SELECT
       (SELECT kind FROM car_state WHERE id = $1) AS primary_kind,
       (SELECT section FROM car_state WHERE id = $1) AS primary_section,
       NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements_text($2::jsonb) AS s(value)
          WHERE NOT EXISTS (
                  SELECT 1 FROM car_state cs
                   WHERE cs.id = (s.value)::uuid AND cs.kind = 'secondary')
       ) AS secondaries_ok`,
    [columns.state_id, JSON.stringify(secondaryStateIds)]
  );
  if (check.primary_kind !== 'primary' || !isSection(check.primary_section)) {
    return {
      ok: false,
      errors: [{ field: 'stateId', message: "Choose one of the car's four states" }],
    };
  }
  if (!check.secondaries_ok) {
    return {
      ok: false,
      errors: [{ field: 'secondaryStateIds', message: 'One of those states no longer exists' }],
    };
  }

  // The sale belongs to the Sold state and to nothing else (truth 5). A car being set
  // Sold must carry the two money facts; a car being set anywhere else carries none — a
  // price sent with another state is dropped, never stored, so a sale row can never sit
  // beside a car that is not Sold.
  const section = check.primary_section;
  const sale = saleForState(section, saleFacts);
  if (section === SOLD_SECTION && sale === null) {
    return {
      ok: false,
      errors: [{ field: 'salePrice', message: 'Enter the sale price and the date it sold' }],
    };
  }

  // Truth 7: the bytes went first, so every id the form lists must really be in the store before a row
  // may name it. Last, after every cheap refusal, because it is the only check that asks the network.
  const absent = await photosExist(photos);
  if (absent) return { ok: false, errors: [{ field: 'photos', message: absent }] };

  return {
    ok: true,
    value: { columns, costs, secondaryStateIds, photos: [...photos], sale, section },
  };
}

/**
 * Read the form and prove its state facts against the registry — the step both car writes share.
 */
export async function readCarForm(
  form: FormData
): Promise<{ ok: true; value: CarFormValue } | { ok: false; errors: FieldError[] }> {
  const read = readCarInput(toCarForm(form));
  if (!read.ok) return { ok: false, errors: read.errors };
  return carFormFacts(read.value, readPhotos(form));
}
