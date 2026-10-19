// The device draft store — unsaved office typing, kept on this device.
//
// The offline line promises "your draft is kept on this device"; this module is that promise's
// storage. It mirrors the reference store's rules (`components/site/store.ts`): `ts-` keys, JSON,
// every storage operation inside `try`/`catch`, and no failure ever thrown at a caller — a browser
// with storage disabled behaves exactly like a browser with no draft yet.
//
// Only the car form and the three settings cards keep drafts. Nothing from an enquiry is stored:
// the enquiry board holds no unsaved typing, and a customer's name, number or note never enters
// here. A car draft is captured from the form's own `FormData`; every non-string entry — above all
// the selected photo's `File` — is left out, so the draft holds the text a save would post and the
// photo asset references, never the bytes.

export const DEVICE_DRAFT_PREFIX = "ts-draft:";
export const DEVICE_DRAFT_VERSION = 1;
export const DRAFT_DEBOUNCE_MS = 400;

export type DraftFieldValue = string | string[];
export type DraftFields = Record<string, DraftFieldValue>;

/** One car-form draft: the blank as the page loaded (`base`), the typing now (`data`), and the
 *  photo references the form shows (the asset id the store keeps, plus the display url). */
export type DeviceCarDraft = {
  v: typeof DEVICE_DRAFT_VERSION;
  base: DraftFields;
  data: DraftFields;
  photos: { assetId: string; url: string }[];
};

export type DeviceSettingField = "whatsapp" | "tagline" | "tank";

/** One settings card's draft: the last saved value (`base`) and the unsaved value. */
export type DeviceSettingDraft = {
  v: typeof DEVICE_DRAFT_VERSION;
  base: string;
  value: string;
};

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> &
  Partial<Pick<Storage, "key" | "length">>;

/**
 * Capture a form's fields as a draft payload.
 *
 * `FormData` carries text controls as strings and selected files as `File`/`Blob` objects. A draft
 * keeps only strings: the photo input is dropped by its name, and any other non-string entry is
 * dropped too. Repeated names (the photo references and the tracking states) become arrays, in the
 * order the form sent them; single names stay strings. Nothing is guessed or converted.
 */
export function captureFormData(form: FormData): DraftFields {
  const captured: DraftFields = {};
  for (const [name, value] of form.entries()) {
    if (name === "photo" || typeof value !== "string") continue;
    const current = captured[name];
    if (current === undefined) captured[name] = value;
    else if (Array.isArray(current)) current.push(value);
    else captured[name] = [current, value];
  }
  return captured;
}

/** The logical key for a car form: its store id in edit mode, `new` before a first save. */
export function carDraftKey(carId: string | null | undefined): string {
  return `car:${carId || "new"}`;
}

/** The logical key for one of the three settings cards. */
export function settingDraftKey(field: DeviceSettingField): string {
  return `settings:${field}`;
}

function browserStorage(): DraftStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Read a draft by its logical key. A missing key, malformed JSON, or a storage that refuses to
 * read all produce the caller's fallback; nothing is thrown.
 */
export function readDraft<T>(
  key: string,
  fallback: T,
  storage: DraftStorage | null = browserStorage(),
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(DEVICE_DRAFT_PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** Write a draft. A full quota, disabled storage, or a value that cannot be serialized is ignored. */
export function writeDraft(
  key: string,
  value: unknown,
  storage: DraftStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(DEVICE_DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignored — a draft is a convenience, never a condition of the work */
  }
}

/** Remove a draft. The erase itself is governed by Task 38's act rules; this is only the write. */
export function removeDraft(
  key: string,
  storage: DraftStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(DEVICE_DRAFT_PREFIX + key);
  } catch {
    /* ignored */
  }
}

/**
 * Remove every device draft, and nothing else.
 *
 * This is the sign-out act (Task 38). It walks the storage's own key list, takes a snapshot before
 * removing, and only touches the `ts-draft:` prefix — the theme and any other `ts-` value stay. A
 * storage that cannot list keys, or refuses, is a no-op; a draft is never a condition of the work.
 */
export function clearDrafts(storage: DraftStorage | null = browserStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    const length = storage.length ?? 0;
    for (let index = 0; index < length; index += 1) {
      const key = storage.key?.(index);
      if (key && key.startsWith(DEVICE_DRAFT_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    /* ignored */
  }
}

export type DraftTimer = {
  set: (callback: () => void, delayMs: number) => unknown;
  clear: (id: unknown) => void;
};

const defaultTimer: DraftTimer = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export type DraftWriter = {
  /** Replace any pending write for this key with the newest value, due after the debounce. */
  schedule: (key: string, value: unknown) => void;
  /** Write now: one pending key, or every pending key when called with no argument. */
  flush: (key?: string) => void;
  /** Drop a pending write without writing it. */
  cancel: (key?: string) => void;
};

/**
 * A small debounced writer. Typing calls `schedule` for every keystroke; only the newest value is
 * written, once, after the person pauses. `flush` is for pagehide/unmount; `cancel` is for an
 * erase that must not be undone by a write already waiting.
 */
export function createDraftWriter(
  write: (key: string, value: unknown) => void,
  options: { delayMs?: number; timer?: DraftTimer } = {},
): DraftWriter {
  const delayMs = options.delayMs ?? DRAFT_DEBOUNCE_MS;
  const timer = options.timer ?? defaultTimer;
  const pending = new Map<string, { id: unknown; value: unknown }>();

  const writePending = (key: string) => {
    const entry = pending.get(key);
    if (!entry) return;
    pending.delete(key);
    timer.clear(entry.id);
    write(key, entry.value);
  };

  return {
    schedule(key, value) {
      const previous = pending.get(key);
      if (previous) timer.clear(previous.id);
      const id = timer.set(() => {
        const entry = pending.get(key);
        if (!entry || entry.id !== id) return;
        pending.delete(key);
        write(key, entry.value);
      }, delayMs);
      pending.set(key, { id, value });
    },
    flush(key) {
      if (key !== undefined) {
        writePending(key);
        return;
      }
      for (const pendingKey of [...pending.keys()]) writePending(pendingKey);
    },
    cancel(key) {
      if (key !== undefined) {
        const entry = pending.get(key);
        if (entry) {
          timer.clear(entry.id);
          pending.delete(key);
        }
        return;
      }
      for (const entry of pending.values()) timer.clear(entry.id);
      pending.clear();
    },
  };
}
