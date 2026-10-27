import assert from 'node:assert/strict';
import test from 'node:test';
import type { DraftRow } from './draft-store';
import {
  carFieldValue,
  carFormDataFromDraft,
  draftFormFieldsFromForm,
  type DraftFormState,
} from './draft-form';

const primaries: DraftFormState[] = [
  { id: 'p-avail', label: 'Available', section: 'available' },
  { id: 'p-order', label: 'On Order', section: 'on order' },
  { id: 'p-sold', label: 'Sold', section: 'sold' },
];

const photos = [{ assetId: 'image-abc', url: 'https://cdn.example/abc.jpg' }];

function draft(overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: 'draft-1',
    kind: 'car',
    batchId: 'batch-1',
    sourceFilename: 'cars.pdf',
    sourceAssetId: 'asset-1',
    values: {
      brand: 'Toyota',
      model: 'Sienna',
      trim: 'XLE',
      year: 2019,
      exterior_color: 'Silver',
      interior_color: 'Grey',
      mileage: 52614,
      features: ['Reverse camera', 'Power sliding doors'],
      note: 'One owner',
      private_note: 'Duty paid',
      was_price_kobo: 3650000000,
      arrival_note: 'Expected November',
      doorstep_price_kobo: 3390000000,
    },
    form: null,
    imageAssetIds: ['image-abc'],
    stateLabel: 'Available',
    isDemo: false,
    createdAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

test("a file-only draft is mapped through the file's own reader, with blank costs", () => {
  const data = carFormDataFromDraft(draft(), primaries, photos, '2 hours');
  assert.equal(data.draftId, 'draft-1');
  assert.equal(data.draftSource, 'cars.pdf');
  assert.equal(data.ref, 'Draft');
  assert.equal(data.added, '2 hours');
  assert.equal(data.brand, 'Toyota');
  assert.equal(data.model, 'Sienna');
  assert.equal(data.trim, 'XLE');
  assert.equal(data.year, '2019');
  assert.equal(data.mileage, '52614');
  assert.equal(data.ext, 'Silver');
  assert.equal(data.int, 'Grey');
  assert.equal(data.feat, 'Reverse camera\nPower sliding doors');
  assert.equal(data.note, 'One owner');
  assert.equal(data.privateNote, 'Duty paid');
  assert.equal(data.price, '33900000.00');
  assert.equal(data.wasPrice, '36500000.00');
  assert.equal(data.arr, 'Expected November');
  assert.equal(data.costs.purchase, '');
  assert.equal(data.state, 'Available');
  assert.equal(data.section, 'available');
  assert.deepEqual(data.secondaryStateIds, []);
  assert.deepEqual(data.photos, photos);
});

test("the owner's form wins over the file, including costs, states and sale", () => {
  const data = carFormDataFromDraft(
    draft({
      form: {
        brand: 'Honda',
        model: 'Accord',
        trim: 'EX',
        year: '2021',
        mileage: '12,000',
        exteriorColor: 'White',
        interiorColor: 'Black',
        price: '25,000,000',
        wasPrice: '26,000,000',
        features: 'Sunroof\nLeather',
        note: "Owner's note",
        privateNote: "Owner's private note",
        arrivalNote: 'Here now',
        stateId: 'p-order',
        'cost.purchase_price': '20,000,000',
        'cost.shipping': '1,000,000',
        secondaryStateIds: ['s-1', 's-2'],
        salePrice: '27,000,000',
        saleDate: '2026-10-19',
      },
    }),
    primaries,
    photos,
    '1 day'
  );

  assert.equal(data.brand, 'Honda');
  assert.equal(data.model, 'Accord');
  assert.equal(data.price, '25,000,000');
  assert.equal(data.wasPrice, '26,000,000');
  assert.equal(data.feat, 'Sunroof\nLeather');
  assert.equal(data.note, "Owner's note");
  assert.equal(data.privateNote, "Owner's private note");
  assert.equal(data.arr, 'Here now');
  assert.equal(data.costs.purchase, '20,000,000');
  assert.equal(data.costs.ship, '1,000,000');
  assert.deepEqual(data.secondaryStateIds, ['s-1', 's-2']);
  assert.equal(data.salePrice, '27,000,000');
  assert.equal(data.saleDate, '2026-10-19');
  assert.equal(data.state, 'On Order');
  assert.equal(data.section, 'on order');
});

test("a stored form state that is gone falls back to the file's label, then the first primary", () => {
  const gone = carFormDataFromDraft(
    draft({ form: { stateId: 'deleted-state' }, stateLabel: 'On Order' }),
    primaries,
    photos,
    'now'
  );
  assert.equal(gone.state, 'On Order');
  assert.equal(gone.section, 'on order');

  const noLabel = carFormDataFromDraft(
    draft({ form: { stateId: 'deleted-state' }, stateLabel: null }),
    primaries,
    photos,
    'now'
  );
  assert.equal(noLabel.state, 'Available');
  assert.equal(noLabel.section, 'available');
});

test("the card's field reader uses the form's shape for every recipe field", () => {
  const data = carFormDataFromDraft(draft(), primaries, photos, 'now');
  assert.equal(carFieldValue(data, 'brand'), 'Toyota');
  assert.equal(carFieldValue(data, 'exterior_color'), 'Silver');
  assert.equal(carFieldValue(data, 'doorstep_price_kobo'), '33900000.00');
  assert.equal(carFieldValue(data, 'not_a_field'), '');
});

test('a posted form keeps strings and lists, and drops draft/photo bookkeeping', () => {
  const form = new FormData();
  form.set('draftId', 'draft-1');
  form.set('intent', 'draft');
  form.set('brand', 'Toyota');
  form.set('features', 'Camera');
  form.append('secondaryStateIds', 's-1');
  form.append('secondaryStateIds', 's-2');
  form.append('photos', 'image-abc');
  form.set('stateId', 'p-avail');

  const result = draftFormFieldsFromForm(form);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.form.brand, 'Toyota');
  assert.equal(result.form.features, 'Camera');
  assert.deepEqual(result.form.secondaryStateIds, ['s-1', 's-2']);
  assert.equal(result.form.stateId, 'p-avail');
  assert.equal(result.form.draftId, undefined);
  assert.equal(result.form.intent, undefined);
  assert.equal(result.form.photos, undefined);
});

test('a form too large for a draft is refused with a field error, not stored', () => {
  const tooLong = new FormData();
  tooLong.set('brand', 'x'.repeat(5001));
  const long = draftFormFieldsFromForm(tooLong);
  assert.equal(long.ok, false);

  const tooMany = new FormData();
  for (let i = 0; i < 51; i += 1) tooMany.append('secondaryStateIds', `s-${i}`);
  const many = draftFormFieldsFromForm(tooMany);
  assert.equal(many.ok, false);

  const tooBig = new FormData();
  for (let i = 0; i < 20; i += 1) tooBig.set(`field${i}`, 'y'.repeat(4000));
  const big = draftFormFieldsFromForm(tooBig);
  assert.equal(big.ok, false);
});
