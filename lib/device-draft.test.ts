/**
 * The device draft store, executable.
 *
 * The offline banner makes a promise in words: "your draft is kept on this device". These tests
 * hold the store to it — a draft survives a round trip, storage failures never break the form, the
 * car payload carries no photo bytes, and typing is debounced to one trailing write. They also pin
 * the boundary the rest of the layer leans on: the store holds only car/settings drafts, never an
 * enquiry or customer record.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  captureFormData,
  carDraftKey,
  clearDrafts,
  createDraftWriter,
  DEVICE_DRAFT_PREFIX,
  DRAFT_DEBOUNCE_MS,
  readDraft,
  removeDraft,
  settingDraftKey,
  writeDraft,
  type DeviceCarDraft,
  type DeviceSettingDraft,
  type DraftStorage,
  type DraftTimer,
} from "./device-draft";

class MemoryStorage implements DraftStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  get length(): number {
    return this.values.size;
  }

  keys(): string[] {
    return [...this.values.keys()];
  }
}

test("a car draft and a settings draft round-trip under ts-draft keys, unchanged", () => {
  const storage = new MemoryStorage();

  const car: DeviceCarDraft = {
    v: 1,
    base: { brand: "", photos: "" },
    data: { brand: "Toyota", photos: ["asset-1", "asset-2"] },
    photos: [
      { assetId: "asset-1", url: "/media/asset-1" },
      { assetId: "asset-2", url: "/media/asset-2" },
    ],
  };
  writeDraft(carDraftKey("TS-1001"), car, storage);
  assert.deepEqual(readDraft(carDraftKey("TS-1001"), null, storage), car);

  const settings: DeviceSettingDraft = {
    v: 1,
    base: "+2348031234567",
    value: "+2349012345678",
  };
  writeDraft(settingDraftKey("whatsapp"), settings, storage);
  assert.deepEqual(readDraft(settingDraftKey("whatsapp"), null, storage), settings);

  assert.deepEqual(storage.keys().sort(), [
    `${DEVICE_DRAFT_PREFIX}car:TS-1001`,
    `${DEVICE_DRAFT_PREFIX}settings:whatsapp`,
  ]);
});

test("clearDrafts removes every ts-draft key and leaves everything else", () => {
  const storage = new MemoryStorage();
  writeDraft(carDraftKey("new"), { v: 1, base: {}, data: {}, photos: [] }, storage);
  writeDraft(settingDraftKey("tagline"), { v: 1, base: "", value: "Hello" }, storage);
  storage.setItem("ts-theme", "dark");
  storage.setItem("not-a-draft", "keep");

  clearDrafts(storage);

  assert.deepEqual(storage.keys().sort(), ["not-a-draft", "ts-theme"]);
});

test("a car draft is the form's text plus photo references — never a photo's bytes", () => {
  const form = new FormData();
  form.append("brand", "Toyota");
  form.append("photos", "asset-1");
  form.append("photos", "asset-2");
  form.append("secondaryStateIds", "state-1");
  form.append("secondaryStateIds", "state-2");
  form.append("photo", new Blob(["BYTES-MUST-NOT-LEAVE"], { type: "image/jpeg" }), "car.jpg");

  const captured = captureFormData(form);
  assert.deepEqual(captured, {
    brand: "Toyota",
    photos: ["asset-1", "asset-2"],
    secondaryStateIds: ["state-1", "state-2"],
  });

  const storage = new MemoryStorage();
  writeDraft(
    "car:new",
    { v: 1, base: {}, data: captured, photos: [] } satisfies DeviceCarDraft,
    storage,
  );
  const stored = [...storage.values.values()].join("\n");
  assert.equal(stored.includes("BYTES-MUST-NOT-LEAVE"), false);
  assert.equal(stored.includes('"photo"'), false);
});

test("storage that refuses, lies, or is gone never throws; the caller gets its fallback", () => {
  const refusing: DraftStorage = {
    getItem() {
      throw new Error("storage denied");
    },
    setItem() {
      throw new Error("quota exceeded");
    },
    removeItem() {
      throw new Error("storage denied");
    },
  };

  assert.deepEqual(readDraft("car:new", { empty: true }, refusing), { empty: true });
  assert.doesNotThrow(() => writeDraft("car:new", { brand: "Toyota" }, refusing));
  assert.doesNotThrow(() => removeDraft("car:new", refusing));

  const malformed = new MemoryStorage();
  malformed.setItem(`${DEVICE_DRAFT_PREFIX}car:new`, "{not json");
  assert.deepEqual(readDraft("car:new", "fallback", malformed), "fallback");

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.doesNotThrow(() => writeDraft("car:new", circular, new MemoryStorage()));

  assert.equal(readDraft("car:new", "fallback", null), "fallback");
  assert.doesNotThrow(() => writeDraft("car:new", { brand: "Toyota" }, null));
  assert.doesNotThrow(() => removeDraft("car:new", null));
});

test("the store has only car and settings keys — no enquiry or customer record", () => {
  const storage = new MemoryStorage();
  const form = new FormData();
  form.append("brand", "Toyota");
  form.append("photos", "asset-1");
  const captured = captureFormData(form);
  assert.deepEqual(Object.keys(captured).sort(), ["brand", "photos"]);

  writeDraft(
    carDraftKey(undefined),
    { v: 1, base: {}, data: captured, photos: [] } satisfies DeviceCarDraft,
    storage,
  );
  writeDraft(
    settingDraftKey("tagline"),
    { v: 1, base: "old", value: "new" } satisfies DeviceSettingDraft,
    storage,
  );

  for (const key of storage.keys()) {
    assert.match(key, /^ts-draft:(car|settings):/);
    assert.doesNotMatch(key, /enquir|customer|buyer/i);
  }
  assert.equal(carDraftKey(""), "car:new");
});

test("a car draft's payload is the form's own fields — no customer name, number or enquiry", () => {
  // The car form's live field names (task36's recorded payload has the same set). `arrivalNote` and
  // `privateNote` are the car's own columns, not customer notes; the showroom may show the arrival
  // note, the private note never leaves the office. The boundary Task 40 pins is the customer /
  // enquiry boundary, not the car's own columns.
  const carForm: Record<string, string> = {
    brand: "Toyota",
    model: "Sienna",
    trim: "XLE",
    year: "2021",
    mileage: "45,000",
    price: "18,000,000",
    wasPrice: "",
    exteriorColor: "Silver",
    interiorColor: "Grey",
    features: "Reverse camera\nPower sliding doors",
    "cost.purchase_price": "15,000,000",
    "cost.shipping": "500,000",
    "cost.clearing": "300,000",
    "cost.trucking_usa": "200,000",
    "cost.trucking_ng": "150,000",
    "cost.full_tank": "0",
    stateId: "state-available",
    arrivalNote: "Expected arrival: November",
    privateNote: "Duty paid. Ready for viewing.",
  };

  const form = new FormData();
  for (const [name, value] of Object.entries(carForm)) form.append(name, value);
  form.append("photos", "asset-1");
  form.append("photo", new Blob(["BYTES-MUST-NOT-LEAVE"], { type: "image/jpeg" }), "car.jpg");

  const captured = captureFormData(form);
  assert.deepEqual(Object.keys(captured).sort(), [...Object.keys(carForm), "photos"].sort());
  assert.equal("photo" in captured, false, "the file input is not part of the draft");
  assert.equal(captured.arrivalNote, carForm.arrivalNote);
  assert.equal(captured.privateNote, carForm.privateNote);

  // No key the form does not own, and none shaped like a customer or an enquiry. `stateId` is an
  // office state key; `photos` holds asset references, never bytes.
  const customerKey = /(^|[:._-])(customer|buyer|enquir(?:y|ies)|lead|contact)([:._-]|$)/i;
  for (const key of Object.keys(captured)) {
    assert.doesNotMatch(key, customerKey);
  }
  for (const key of [
    "name",
    "fullName",
    "firstName",
    "lastName",
    "phone",
    "whatsapp",
    "email",
    "address",
    "message",
    "customerNote",
    "enquiryNote",
  ]) {
    assert.equal(key in captured, false, `the car draft must not carry ${key}`);
  }

  const storage = new MemoryStorage();
  writeDraft(
    carDraftKey("new"),
    {
      v: 1,
      base: {},
      data: captured,
      photos: [{ assetId: "asset-1", url: "/media/asset-1" }],
    } satisfies DeviceCarDraft,
    storage,
  );
  const storedDraft = readDraft<DeviceCarDraft | null>(carDraftKey("new"), null, storage);
  if (!storedDraft) assert.fail("the car draft did not round-trip");
  assert.deepEqual(storedDraft.data, captured);
  const stored = [...storage.values.values()].join("\n");
  assert.equal(stored.includes("BYTES-MUST-NOT-LEAVE"), false);
  assert.doesNotMatch(stored, /customer|enquir|buyer/i);
  assert.match(stored, /"arrivalNote":"Expected arrival: November"/);
  assert.match(stored, /"privateNote":"Duty paid\. Ready for viewing\."/);
});

test("typing is debounced to one trailing write; flush and cancel are the only other outcomes", () => {
  const timers: { id: number; fn: () => void; delayMs: number; cleared: boolean }[] = [];
  let nextId = 0;
  const timer: DraftTimer = {
    set(fn, delayMs) {
      const entry = { id: ++nextId, fn, delayMs, cleared: false };
      timers.push(entry);
      return entry.id;
    },
    clear(id) {
      const entry = timers.find((candidate) => candidate.id === id);
      if (entry) entry.cleared = true;
    },
  };
  const writes: [string, unknown][] = [];
  const writer = createDraftWriter((key, value) => writes.push([key, value]), { timer });

  writer.schedule("car:new", { brand: "T" });
  writer.schedule("car:new", { brand: "To" });
  writer.schedule("car:new", { brand: "Toy" });

  const active = timers.filter((entry) => !entry.cleared);
  assert.equal(active.length, 1);
  assert.equal(active[0].delayMs, DRAFT_DEBOUNCE_MS);
  active[0].fn();
  assert.deepEqual(writes, [["car:new", { brand: "Toy" }]]);

  // Two keys are independent; flush writes one now, cancel drops the other without a write.
  writer.schedule("settings:whatsapp", { value: "+2348000000000" });
  writer.schedule("settings:tagline", { value: "Cars, plainly." });
  writer.flush("settings:whatsapp");
  writer.cancel("settings:tagline");
  for (const entry of timers.filter((candidate) => !candidate.cleared)) entry.fn();
  assert.deepEqual(writes, [
    ["car:new", { brand: "Toy" }],
    ["settings:whatsapp", { value: "+2348000000000" }],
  ]);

  // Flush with no key writes every pending write immediately.
  writer.schedule("a", 1);
  writer.schedule("b", 2);
  writer.flush();
  assert.deepEqual(writes.slice(-2), [
    ["a", 1],
    ["b", 2],
  ]);
});
