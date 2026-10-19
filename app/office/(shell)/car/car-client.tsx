"use client";

/* Car form client — a faithful React port of the reference office-car.html
   runtime (edit mode is the ambient). No source is "copied" as the standard;
   the model extracted from the reference runtime is the standard. Inputs are
   uncontrolled (like the reference) and the live costing recomputes on input.
   The product decides edit vs add by route, so the reference's `.demo` mode
   switcher is dropped (plan §9 Q2). */

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createCar,
  deleteCar,
  undoDeleteCar,
  updateCar,
  type CreateCarResult,
  type UpdateCarResult,
} from "../../actions/car";
import { Dialog } from "@/components/office/Dialog";
import { uploadCarPhoto } from "../../actions/photo";
import {
  costLabelFor,
  formatNaira,
  isCostComplete,
  parseCostAmount,
  profitKobo,
  totalCostKobo,
  SIX_COST_KINDS,
  type CostLineInput,
} from "@/lib/money";
import type { Section } from "@/lib/sections";
import { checkPhotoSize, megabytes, PHOTO_MAX_BYTES } from "@/lib/photo-rules";
import {
  captureFormData,
  carDraftKey,
  createDraftWriter,
  writeDraft,
  type DeviceCarDraft,
  type DraftFields,
} from "@/lib/device-draft";
import { Photo } from "@/components/Photo";

export type CarCosts = {
  purchase: string;
  ship: string;
  clear: string;
  truckus: string;
  truckng: string;
  tank: string;
};

/**
 * One photo as the form holds it (truth 7).
 *
 * `assetId` is the reference the store keeps — the only thing a save posts. `url` is an address
 * built on the server so the browser can show the picture; it is never written back, because the
 * asset-reference column never holds a web address.
 */
export type CarPhoto = { assetId: string; url: string };

export type CarFormData = {
  /** The car's store key — present in edit mode; the row the Server Action updates. */
  carId?: string;
  ref: string;
  added: string;
  upd: string;
  brand: string;
  model: string;
  trim: string;
  year: string;
  mileage: string;
  ext: string;
  int: string;
  price: string;
  feat: string;
  costs: CarCosts;
  state: string;
  /** The car's section, from `lib/sections.ts` (the one rule) — names the live cost. */
  section: Section;
  isNew: boolean;
  arr: string;
  note: string;
  /** Office-only note (Task 11). */
  privateNote?: string;
  /** The crossed-out "was" price (Task 11). */
  wasPrice?: string;
  /** The secondary states the car already carries (edit mode) — shown checked. */
  secondaryStateIds?: string[];
  /** The sale, while the car is Sold (truth 5): a plain naira string and `YYYY-MM-DD`. */
  salePrice?: string;
  saleDate?: string;
  /** The primary state the car sold from — where un-marking returns it (truth 5). */
  priorStateId?: string;
  priorStateLabel?: string;
  /** The car's photos, in stored order — position 0 is the cover buyers see first (truth 7). */
  photos: CarPhoto[];
};

export type OfficeState = { id: string; label: string; section: Section; isNewArrival: boolean; kind?: string };

/** A secondary state — office-only tracking, carrying no section (D15). */
export type OfficeSecondaryState = { id: string; label: string };

// The Unsplash address builder that used to sit here is gone: the showroom's photos are Sanity
// assets now (truth 7), and an address is built from the reference on the server, never derived
// or stored in the browser.

const BLANK_COSTS: CarCosts = {
  purchase: "",
  ship: "",
  clear: "",
  truckus: "",
  truckng: "",
  tank: "",
};

// The six cost fields, in the order of the one money module's six kinds
// (`SIX_COST_KINDS`) — a field's stored kind is its position, so no second kind
// list exists here. Every amount is naira (R-MON-3); nothing is converted.
const COST_FIELDS = ["purchase", "ship", "clear", "truckus", "truckng", "tank"] as const;
type CostField = (typeof COST_FIELDS)[number];
const KIND_BY_FIELD: Record<CostField, (typeof SIX_COST_KINDS)[number]> = {
  purchase: "purchase_price",
  ship: "shipping",
  clear: "clearing",
  truckus: "trucking_usa",
  truckng: "trucking_ng",
  tank: "full_tank",
};

type CostErrors = Partial<Record<CostField | "price" | "wasPrice", string>>;

// The live panel — every figure from `lib/money.ts` (naira only; no rate, no
// dollar). A malformed amount shows its message at its own field and is not
// counted (R-MON-10); a car with incomplete costs shows no profit (R-MON-8);
// the cost figure is named by the car's state (R-MON-7). No arithmetic here.
function compute(priceStr: string, wasStr: string, c: CarCosts, section: Section) {
  const readings = COST_FIELDS.map((field) => ({ field, raw: c[field], parsed: parseCostAmount(c[field]) }));

  const costLines: CostLineInput[] = readings.map((r) => ({
    kind: KIND_BY_FIELD[r.field],
    amountMinor: r.parsed.ok ? r.parsed.amountMinor : null,
  }));

  const errors: CostErrors = {};
  for (const r of readings) {
    if (r.raw.trim() !== "" && !r.parsed.ok) errors[r.field] = r.parsed.error;
  }

  const entered = costLines.filter((l) => l.amountMinor !== null).length;
  const complete = isCostComplete(costLines);
  const totalKobo = totalCostKobo(costLines);
  const count = `${entered} of 6 costs entered.`;
  const showInc = entered !== 6;

  const priceParsed = parseCostAmount(priceStr);
  const priceKobo = priceStr.trim() === "" ? null : priceParsed.ok ? priceParsed.amountMinor : null;
  if (priceStr.trim() !== "" && !priceParsed.ok) errors.price = priceParsed.error;

  // The "was" price is a second amount, judged by the same one predicate at its own
  // field (R-MON-10) — blank is fine, and means no crossed-out price.
  if (wasStr.trim() !== "") {
    const wasParsed = parseCostAmount(wasStr);
    if (!wasParsed.ok) errors.wasPrice = wasParsed.error;
  }

  const costTxt = entered > 0 ? formatNaira(totalKobo) : "—";
  const priceTxt = priceKobo != null ? formatNaira(priceKobo) : "—";
  const costLabel = costLabelFor(section, false);

  let profitTxt = "—";
  let profitCls = "num";
  let psub =
    priceKobo == null
      ? "Enter a doorstep price to see profit."
      : entered === 0
        ? "Type the costs — this updates as you type."
        : "Profit shows once all six costs are in.";
  if (priceKobo != null && complete) {
    const p = profitKobo({ totalCostKobo: totalKobo, priceKobo, salePriceKobo: null }).kobo ?? 0;
    profitTxt = formatNaira(p) + (p < 0 ? " loss" : "");
    profitCls = "num " + (p < 0 ? "loss" : "ok");
    psub =
      p < 0
        ? "This price loses money. Raise the price or rethink the buy."
        : `Price − cost. ≈ ${((p / priceKobo) * 100).toFixed(1)}% of the price.`;
  }

  const mCost = complete ? formatNaira(totalKobo) : "—";
  let mProfit = "—";
  let mProfitCls = "";
  if (priceKobo != null && complete) {
    const p = profitKobo({ totalCostKobo: totalKobo, priceKobo, salePriceKobo: null }).kobo ?? 0;
    mProfit = formatNaira(p);
    mProfitCls = p < 0 ? "loss" : "ok";
  }

  return {
    costTxt,
    costLabel,
    priceTxt,
    count,
    showInc,
    profitTxt,
    profitCls,
    psub,
    mCost,
    mProfit,
    mProfitCls,
    errors,
  };
}

// One cost input — all naira (₦), validated by the one predicate at the field
// (R-MON-10): an amount that is not a valid naira figure shows its message here,
// before the form is saved. The naira sign is part of the field; no dollar sign.
function CostInput({
  field,
  label,
  placeholder,
  value,
  error,
  hint,
  onInput,
}: {
  field: CostField;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  hint?: string;
  onInput: () => void;
}) {
  const id = `c-${field}`;
  return (
    <div className="f">
      <label htmlFor={id}>{label} (₦)</label>
      <div className="cur">
        <span>₦</span>
        <input
          className="in cost"
          id={id}
          name={`cost.${KIND_BY_FIELD[field]}`}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          defaultValue={value}
          onInput={onInput}
          aria-invalid={error ? true : undefined}
        />
      </div>
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? (
        <span className="hint" style={{ color: "var(--bad)" }} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function CarForm({
  mode,
  data,
  primaries,
  secondaries = [],
}: {
  mode: "edit" | "add";
  data: CarFormData;
  /** The four fixed primary states, from the registry — the car's one mandatory state. */
  primaries: OfficeState[];
  /** The owner's secondary states (office-only tracking) — none or several. */
  secondaries?: OfficeSecondaryState[];
}) {
  const isEdit = mode === "edit";

  // label → the one section, from the registry. A label the registry does not hold
  // keeps the car's own section — the label is never guessed from an unmapped state.
  const sectionByLabel = useMemo(
    () => Object.fromEntries(primaries.map((s) => [s.label, s.section])) as Record<string, Section>,
    [primaries],
  );
  const sectionFor = (label: string) => sectionByLabel[label] ?? data.section;
  const sectionForId = (id: string) =>
    primaries.find((s) => s.id === id)?.section ?? data.section;

  // Sold is a primary state like the other three (D15); what it adds is the sale, which
  // is why the state's two questions are asked here rather than in the picker itself.
  const soldPrimaryId = primaries.find((s) => s.section === "sold")?.id;
  // The date field's default while the owner is choosing Sold. It is only ever read in
  // the interactive path — a car that is already sold carries its own date — so it cannot
  // disagree between the server render and the browser.
  const today = new Date().toISOString().slice(0, 10);

  const [panel, setPanel] = useState(() =>
    compute(
      isEdit ? data.price : "",
      isEdit ? data.wasPrice ?? "" : "",
      isEdit ? data.costs : BLANK_COSTS,
      sectionFor(isEdit ? data.state : "Available"),
    ),
  );
  // The car's photos, in stored order — position 0 is the cover buyers see first (truth 7). Photos
  // are uploaded the moment they are chosen (bytes first, row later), so this already holds
  // references the asset store has; what a save posts is each `assetId`, never an address.
  const [photos, setPhotos] = useState<CarPhoto[]>(isEdit ? data.photos : []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // The car's one primary state, held by id (the store's key). Add mode starts on the
  // state the blank form names; edit mode on the car's own.
  const [curStateId, setCurStateId] = useState(
    () => primaries.find((s) => s.label === data.state)?.id ?? primaries[0]?.id ?? "",
  );
  // Whether the state being held is Sold — which is what puts the sale facts on the form
  // (truth 5: the state comes first and the sale action follows from it).
  const isSoldPicked = sectionForId(curStateId) === "sold";
  const [delOpen, setDelOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<CreateCarResult | UpdateCarResult | null>(null);
  const [saving, startSaving] = useTransition();
  const tmr = useRef<number | null>(null);
  const formErrRef = useRef<HTMLDivElement | null>(null);
  // The delete offer on this screen (Task 19): off until the store confirms the delete, then
  // the same 8-second window the inventory offers, with the same bar and the same restore.
  const [undoOn, setUndoOn] = useState(false);
  const undoRef = useRef<{ id: string; label: string } | null>(null);
  const [reduced, setReduced] = useState(false);
  const [, startDelete] = useTransition();
  const router = useRouter();

  // Task 36 — the device draft. The form's text is kept on this device (debounced), so the office's
  // offline line "your draft is kept on this device" is true. The initial blank is the draft's
  // `base`; a changed state or photo set makes no input event, so those two effects cover it.
  const formRef = useRef<HTMLFormElement | null>(null);
  const draftBase = useRef<DraftFields | null>(null);
  const draftWriter = useRef(createDraftWriter(writeDraft)).current;
  const draftStateSeen = useRef<string | null>(null);
  const draftPhotosSeen = useRef<string | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (form) draftBase.current = captureFormData(new FormData(form));
  }, []);

  useEffect(() => {
    if (draftStateSeen.current === null) {
      draftStateSeen.current = curStateId;
      return;
    }
    if (draftStateSeen.current === curStateId) return;
    draftStateSeen.current = curStateId;
    scheduleDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curStateId]);

  useEffect(() => {
    const signature = photos.map((p) => p.assetId).join("\u0000");
    if (draftPhotosSeen.current === null) {
      draftPhotosSeen.current = signature;
      return;
    }
    if (draftPhotosSeen.current === signature) return;
    draftPhotosSeen.current = signature;
    scheduleDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // A full-page unload does not wait for the debounce; flush what is waiting. The unmount flush
  // covers a client-side departure as well.
  useEffect(() => {
    const flush = () => draftWriter.flush();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      draftWriter.flush();
    };
  }, [draftWriter]);

  function scheduleDraft() {
    const form = formRef.current;
    const base = draftBase.current;
    if (!form || !base) return;
    const data = captureFormData(new FormData(form));
    const carId = typeof data.carId === "string" ? data.carId : null;
    const draft: DeviceCarDraft = {
      v: 1,
      base,
      data,
      photos: photos.map(({ assetId, url }) => ({ assetId, url })),
    };
    draftWriter.schedule(carDraftKey(carId), draft);
  }

  useEffect(() => setMounted(true), []);

  // Motion preference, read in the browser: under reduced motion the bar does not run — the
  // same measure stays on screen as a static "8 s" label (Task 11), and the timer is the clock.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      if (tmr.current) window.clearTimeout(tmr.current);
    },
    [],
  );

  const recalc = (stateId: string = curStateId) => {
    const g = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
    setPanel(
      compute(
        g("f-price"),
        g("f-was"),
        {
          purchase: g("c-purchase"),
          ship: g("c-ship"),
          clear: g("c-clear"),
          truckus: g("c-truckus"),
          truckng: g("c-truckng"),
          tank: g("c-tank"),
        },
        sectionForId(stateId),
      ),
    );
  };

  // The cost figure is named by the state (R-MON-7), so changing the state
  // renames it even when no amount changed.
  useEffect(() => {
    recalc(curStateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curStateId]);

  const hasFieldErrors = Object.keys(panel.errors).length > 0;

  // Where a refusal sends the caret (Task 17): the first invalid field the person can reach, in
  // the order the fields appear on the form; a refusal that names no visible field (the store's
  // form-level answer) goes to the form's error block instead.
  function focusServerRefusal(errors: readonly { field: string }[]) {
    const names = new Set(errors.map((e) => e.field));
    const first = Array.from(document.querySelectorAll<HTMLElement>("[name]")).find((el) => {
      if (!names.has(el.getAttribute("name") ?? "")) return false;
      if (el instanceof HTMLInputElement && el.type === "hidden") return false;
      return el.getClientRects().length > 0 && !el.hasAttribute("disabled");
    });
    (first ?? formErrRef.current)?.focus();
  }

  useEffect(() => {
    if (!result || result.ok || result.errors.length === 0) return;
    focusServerRefusal(result.errors);
    // A new refusal object is the signal; the fields it names are rendered by the same commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const showToast = (html: string) => {
    // A plain message supersedes any delete offer (there is nothing to undo behind it).
    setUndoOn(false);
    undoRef.current = null;
    setToastMsg(html);
    setToastShow(true);
    if (tmr.current) window.clearTimeout(tmr.current);
    tmr.current = window.setTimeout(() => setToastShow(false), 6000);
  };

  // The delete offer is the inventory's, on this screen (Task 19): the same window, the same
  // bar — its own animation end is the clock (Task 10) — and the same restore. When the window
  // closes with no undo the car is a tombstone and this form has no car left to hold; the
  // office inventory is where a tombstone is dealt with.
  function closeOffer() {
    if (tmr.current) window.clearTimeout(tmr.current);
    tmr.current = null;
    setToastShow(false);
    setUndoOn(false);
    undoRef.current = null;
  }

  function expireOffer() {
    closeOffer();
    router.push("/office/inventory");
  }

  function showOffer(html: string) {
    setToastMsg(html);
    setToastShow(true);
    if (tmr.current) window.clearTimeout(tmr.current);
    // The bar's own end is the clock; this timeout is the failsafe, deliberately longer than
    // the window (Task 12). Under reduced motion there is no bar: this timer is the clock and
    // the static "8 s" label is the measure (Task 11).
    tmr.current = window.setTimeout(expireOffer, reduced ? 8000 : 12_000);
  }

  function doDelete() {
    const id = data.carId;
    if (!id) return;
    startDelete(async () => {
      // `revalidate: false`: this page is the one holding the offer, and the car it belongs to is
      // about to be a tombstone — the action's revalidation would swap this editor out for the
      // office 404 while the offer was still running (see `deleteCar`). Undo revalidates, and the
      // window's end lands on the inventory, which is fetched fresh.
      const res = await deleteCar(id, { revalidate: false });
      if (!res.ok) {
        showToast(res.errors[0]?.message ?? "That car could not be deleted.");
        return;
      }
      const label = `${data.brand} ${data.model} ${data.year}`.replace(/\s+/g, " ").trim();
      undoRef.current = { id, label };
      setUndoOn(true);
      showOffer(`${label} deleted.`);
    });
  }

  function undoDelete() {
    const car = undoRef.current;
    if (!car) return;
    setUndoOn(false);
    showToast(`${car.label} restored.`);
    startDelete(async () => {
      const res = await undoDeleteCar(car.id);
      if (!res.ok) showToast(res.errors[0]?.message ?? "That car could not be restored.");
    });
  }

  // The form is a real form: every field carries its stored column's name, so the
  // Server Action reads exactly what the browser sent and nothing is invented on the
  // way. Add mode writes through `createCar`; a malformed amount (or any other
  // refusal) never leaves the page — it is a field error, and nothing is saved.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (hasFieldErrors) {
      // The panel already marks the fields it judges; the first one on the form takes the caret.
      const first = Array.from(
        document.querySelectorAll<HTMLElement>('[aria-invalid="true"]'),
      ).find((el) => el.getClientRects().length > 0);
      (first ?? formErrRef.current)?.focus();
      return;
    }
    const fd = new FormData(e.currentTarget);
    // The file input is not part of what is saved. Each photo was uploaded the moment it was
    // chosen, and a save posts only the references (the hidden `photos` fields); dropping the file
    // keeps a save from carrying the image bytes across a second time.
    fd.delete("photo");
    setResult(null);
    startSaving(async () => {
      // Edit mode updates the car the owner opened (the hidden `carId` names it); add
      // mode makes a new one. Each goes through its own Server Action, which re-checks
      // the session and recomputes the change-check — nothing sent is trusted.
      const res = isEdit ? await updateCar(fd) : await createCar(fd);
      setResult(res);
      // The words follow the fact, not the call (DR23): a save that moved something says what it
      // saved; a save that changed nothing says exactly that, and never claims a save. The fact is
      // the store's own reply — and a failure never takes this branch, so "Nothing changed." can
      // never stand in for a failure (DR25).
      if (res.ok)
        showToast(
          res.changed
            ? `Saved <b>${res.ref}</b>. The showroom updates immediately.`
            : "Nothing changed.",
        );
    });
  };

  // A Server Action's field refusals, one message per field, shown at the field.
  const serverErrors = result && !result.ok ? result.errors : [];
  const errFor = (field: string) => serverErrors.find((x) => x.field === field)?.message;

  const makeCover = (i: number) =>
    setPhotos((prev) => {
      const a = [...prev];
      const [x] = a.splice(i, 1);
      a.unshift(x);
      return a;
    });
  const removeImg = (i: number) =>
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  // The drop zone's one job: put the chosen bytes in the asset store **now** and hold the reference
  // that comes back (truth 7 — the bytes go first, the row second, so a car is never saved pointing
  // at bytes that were never uploaded). Nothing about the car is written here: a photo added to a
  // form that is never saved leaves no record, only an asset the owner's own cleanup reports.
  //
  // The size is checked here as well as on the server, from the one rule (`lib/photo-rules.ts`), so
  // an oversized file is refused before it leaves the browser instead of after a long upload. The
  // browser's answer is only a courtesy — the server's is the one that decides.
  const addFiles = async (files: FileList | File[]) => {
    const chosen = Array.from(files);
    if (chosen.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of chosen) {
        const size = checkPhotoSize(file.size);
        if (!size.ok) {
          setUploadError(size.reason);
          continue;
        }
        const fd = new FormData();
        fd.append("photo", file, file.name);
        const res = await uploadCarPhoto(fd);
        if (!res.ok) {
          setUploadError(res.errors[0]?.message ?? "That photo could not be added.");
          continue;
        }
        setPhotos((prev) =>
          prev.some((p) => p.assetId === res.assetId)
            ? prev
            : [...prev, { assetId: res.assetId, url: res.url }],
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const h1 = isEdit ? "Edit car" : "Add a car";
  const hsub = isEdit
    ? `${data.brand} ${data.model} ${data.trim} ${data.year} · ${data.ref} · added ${data.added} · last updated by Umar, ${data.upd}`
    : "Fill what you know — save puts it in the showroom immediately.";

  return (
    <>
      <div className="hrow">
        <div>
          <h1 id="h1">{h1}</h1>
          <p className="sub2" id="hsub">
            {hsub}
          </p>
        </div>
        <div className="hbtns">
          <button
            className="btn sold"
            id="mkSold"
            type="button"
            hidden={!isEdit || !soldPrimaryId}
            disabled={curStateId === soldPrimaryId}
            onClick={() => {
              if (!soldPrimaryId) return;
              // The same choice the picker makes — Sold is one of the four states, so
              // marking sold is choosing it and filling in the sale. The save is what
              // commits, so nothing is recorded by opening this button.
              setCurStateId(soldPrimaryId);
              showToast("Sold chosen — enter the sale price and the date, then save.");
            }}
          >
            <i className="fa-solid fa-flag-checkered" /> Mark as sold
          </button>
          <button
            className="btn danger"
            id="delBtn"
            type="button"
            hidden={!isEdit || undoOn}
            onClick={() => setDelOpen(true)}
          >
            <i className="fa-solid fa-trash-can" /> Delete
          </button>
        </div>
      </div>

      <div className="cols">
        <form ref={formRef} onSubmit={onSubmit} onInput={scheduleDraft}>
          <section className="sec">
            <h2>
              <span className="n">1</span>The car
            </h2>
            <div className="fgrid">
              <div className="f">
                <label htmlFor="f-brand">Brand</label>
                <input
                  className="in"
                  id="f-brand"
                  name="brand"
                  type="text"
                  placeholder="Toyota"
                  defaultValue={isEdit ? data.brand : ""}
                />
              </div>
              <div className="f">
                <label htmlFor="f-model">Model</label>
                <input
                  className="in"
                  id="f-model"
                  name="model"
                  type="text"
                  placeholder="Sienna"
                  defaultValue={isEdit ? data.model : ""}
                />
              </div>
              <div className="f">
                <label htmlFor="f-trim">Trim</label>
                <input
                  className="in"
                  id="f-trim"
                  name="trim"
                  type="text"
                  placeholder="LE"
                  defaultValue={isEdit ? data.trim : ""}
                />
              </div>
              <div className="f">
                <label htmlFor="f-year">Year</label>
                <input
                  className="in"
                  id="f-year"
                  name="year"
                  type="number"
                  placeholder="2020"
                  defaultValue={isEdit ? data.year : ""}
                />
              </div>
              <div className="f">
                <label htmlFor="f-mileage">Mileage</label>
                <input
                  className="in"
                  id="f-mileage"
                  name="mileage"
                  type="text"
                  placeholder="52,614"
                  defaultValue={isEdit ? data.mileage : ""}
                />
                <span className="hint">
                  Shown exactly as the car reads — kilometres.
                </span>
              </div>
              <div className="f">
                <label htmlFor="f-price">Doorstep price (₦)</label>
                <div className="cur">
                  <span>₦</span>
                  <input
                    className="in"
                    id="f-price"
                    name="price"
                    type="text"
                    inputMode="decimal"
                    placeholder="33,900,000"
                    defaultValue={isEdit ? data.price : ""}
                    onInput={() => recalc()}
                    aria-invalid={panel.errors.price ? true : undefined}
                  />
                </div>
                <span className="hint">
                  The one price a buyer sees. Shipping, clearing and delivery are
                  already inside it.
                </span>
                {panel.errors.price ? (
                  <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                    {panel.errors.price}
                  </span>
                ) : null}
              </div>
              <div className="f">
                <label htmlFor="f-was">Was price (₦) — optional</label>
                <div className="cur">
                  <span>₦</span>
                  <input
                    className="in"
                    id="f-was"
                    name="wasPrice"
                    type="text"
                    inputMode="decimal"
                    placeholder="36,500,000"
                    defaultValue={isEdit ? data.wasPrice ?? "" : ""}
                    onInput={() => recalc()}
                    aria-invalid={panel.errors.wasPrice ? true : undefined}
                  />
                </div>
                <span className="hint">
                  Shown crossed out beside the price. Leave blank for no &quot;was&quot;
                  price.
                </span>
                {panel.errors.wasPrice ? (
                  <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                    {panel.errors.wasPrice}
                  </span>
                ) : null}
              </div>
              <div className="f">
                <label htmlFor="f-ext">Exterior colour</label>
                <input
                  className="in"
                  id="f-ext"
                  name="exteriorColor"
                  type="text"
                  placeholder="Silver"
                  defaultValue={isEdit ? data.ext : ""}
                />
              </div>
              <div className="f">
                <label htmlFor="f-int">Interior</label>
                <input
                  className="in"
                  id="f-int"
                  name="interiorColor"
                  type="text"
                  placeholder="Grey"
                  defaultValue={isEdit ? data.int : ""}
                />
              </div>
              <div className="f full">
                <label htmlFor="f-feat">Features — one per line</label>
                <textarea
                  className="in"
                  id="f-feat"
                  name="features"
                  placeholder={"Reverse camera\nPower sliding doors\nTri-zone AC"}
                  defaultValue={isEdit ? data.feat : ""}
                ></textarea>
                <span className="hint">
                  Written the way a seller types. These go straight to the buyer&apos;s
                  page.
                </span>
              </div>
            </div>
          </section>

          <section className="sec">
            <h2>
              <span className="n">2</span>Photos
            </h2>
            <label
              className="drop"
              id="drop"
              aria-label="Add photos"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void addFiles(e.dataTransfer.files);
              }}
            >
              <input
                type="file"
                name="photo"
                className="dropinput"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) void addFiles(files);
                  // Cleared so that choosing the same file a second time still uploads it.
                  e.target.value = "";
                }}
              />
              <i className="fa-solid fa-cloud-arrow-up" />
              {uploading
                ? "Uploading…"
                : `Drop photos here or click to browse — first photo is the cover buyers see first. Up to ${megabytes(PHOTO_MAX_BYTES)} each.`}
            </label>
            {uploadError ? (
              <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                {uploadError}
              </span>
            ) : null}
            <div className="thumbs" id="thumbs">
              {photos.map((p, i) => (
                <div className="th" key={p.assetId}>
                  <Photo src={p.url} alt={`Photo ${i + 1}`} />
                  {/* What a save posts: the reference, one field per photo, in this order. The
                      asset-reference column never holds an address (truth 7), so the address the
                      server derived for display is never sent back. */}
                  <input type="hidden" name="photos" value={p.assetId} />
                  {i === 0 ? <span className="cov">Cover</span> : null}
                  <span className="mk">
                    {i > 0 ? (
                      <button
                        type="button"
                        data-mk={i}
                        title="Make cover"
                        aria-label="Make cover"
                        onClick={() => makeCover(i)}
                      >
                        <i className="fa-solid fa-star" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rm"
                      data-rm={i}
                      title="Remove"
                      aria-label="Remove photo"
                      onClick={() => removeImg(i)}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="sec">
            <h2>
              <span className="n">3</span>Costs{" "}
              <span
                style={{
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  color: "var(--mute)",
                  fontSize: "12px",
                }}
              >
                — never leaves the office
              </span>
            </h2>
            <div className="fgrid">
              <CostInput
                field="purchase"
                label="Purchase price"
                placeholder="26,500,000"
                value={isEdit ? data.costs.purchase : ""}
                error={panel.errors.purchase}
                onInput={() => recalc()}
              />
              <CostInput
                field="ship"
                label="Shipping"
                placeholder="3,200,000"
                value={isEdit ? data.costs.ship : ""}
                error={panel.errors.ship}
                onInput={() => recalc()}
              />
              <CostInput
                field="clear"
                label="Clearing"
                placeholder="1,850,000"
                value={isEdit ? data.costs.clear : ""}
                error={panel.errors.clear}
                onInput={() => recalc()}
              />
              <CostInput
                field="truckus"
                label="Trucking within USA"
                placeholder="470,000"
                value={isEdit ? data.costs.truckus : ""}
                error={panel.errors.truckus}
                onInput={() => recalc()}
              />
              <CostInput
                field="truckng"
                label="Trucking in Nigeria"
                placeholder="525,000"
                value={isEdit ? data.costs.truckng : ""}
                error={panel.errors.truckng}
                onInput={() => recalc()}
              />
              <CostInput
                field="tank"
                label="Full tank"
                placeholder="110,000"
                value={isEdit ? data.costs.tank : ""}
                error={panel.errors.tank}
                hint="Default from Settings — change per car if needed."
                onInput={() => recalc()}
              />
            </div>
          </section>

          <section className="sec">
            <h2>
              <span className="n">4</span>State
            </h2>
            <div className="sgrid">
              <div>
                <label
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: "var(--mute)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Where this car is
                </label>
                {/* A sold car says so, names the state it sold from, and offers to go
                    back there. The button moves the pick below — un-marking is the same
                    one write as any other state change, so saving is what commits it. */}
                {isEdit && data.section === "sold" ? (
                  <div
                    className="hint"
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    <b style={{ color: "var(--mute)" }}>This car is sold.</b> Un-marking
                    reverses the sale and puts the car back in{" "}
                    <b>{data.priorStateLabel ?? "its previous state"}</b>, keeping its
                    tracking states.
                    {data.priorStateId ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="btn2"
                          id="unmarkSold"
                          onClick={() => {
                            setCurStateId(data.priorStateId as string);
                            showToast("The sale will be reversed — save to apply.");
                          }}
                        >
                          Move it back
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="stlist" id="states">
                  {/* Add mode offers the three a car can arrive in: a car cannot start
                      Sold, because un-marking returns a car to the state it held before
                      it sold and a car that never held one has nothing to return to. */}
                  {(isEdit ? primaries : primaries.filter((s) => s.section !== "sold")).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={"stb" + (curStateId === s.id ? " on" : "")}
                      data-st={s.id}
                      onClick={() => setCurStateId(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {/* The chosen primary state, as the key the action reads. */}
                <input type="hidden" name="stateId" value={curStateId} />
                {/* Edit mode: the car the Server Action updates. Its identity is the
                    row's own key — never chosen, never edited. */}
                {isEdit && data.carId ? (
                  <input type="hidden" name="carId" value={data.carId} />
                ) : null}
                {/* The car's public note is one of its editable columns, but this form
                    has no field for it (the textarea above is the *private* note, as
                    the reference has it). It rides along unchanged so an edit cannot
                    silently clear it; a future visible field would replace this one. */}
                {isEdit ? <input type="hidden" name="note" value={data.note ?? ""} /> : null}
                {errFor("stateId") ? (
                  <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                    {errFor("stateId")}
                  </span>
                ) : null}
                <p className="hint" style={{ marginTop: 10 }}>
                  The showroom follows automatically. Buyers only ever see the three
                  section names — never these labels.
                </p>
                {/* The sale (truth 5). Sold is a primary state, and setting it is what
                    performs the sale — so the two money facts appear with it and only
                    with it, and the Server Action stores them on the car's sale row. */}
                {isSoldPicked ? (
                  <div style={{ marginTop: 14 }}>
                    <label
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        color: "var(--mute)",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      The sale — required
                    </label>
                    <div className="fgrid">
                      <div className="f">
                        <label htmlFor="f-salePrice">Sale price (₦)</label>
                        <input
                          className="in"
                          id="f-salePrice"
                          name="salePrice"
                          type="text"
                          inputMode="numeric"
                          placeholder="28,000,000"
                          defaultValue={data.salePrice ?? ""}
                        />
                        {errFor("salePrice") ? (
                          <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                            {errFor("salePrice")}
                          </span>
                        ) : null}
                      </div>
                      <div className="f">
                        <label htmlFor="f-saleDate">Date sold</label>
                        <input
                          className="in"
                          id="f-saleDate"
                          name="saleDate"
                          type="date"
                          defaultValue={data.saleDate ?? today}
                        />
                        {errFor("saleDate") ? (
                          <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                            {errFor("saleDate")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="hint" style={{ marginTop: 8 }}>
                      Real profit replaces projected, the car leaves the showroom, and it
                      stops counting as stock.
                    </p>
                  </div>
                ) : null}
                <div style={{ marginTop: 14 }}>
                  <label
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      color: "var(--mute)",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Tracking states — optional, office only
                  </label>
                  {secondaries.length === 0 ? (
                    <p className="hint" style={{ margin: 0 }}>
                      No tracking states yet. Add them in Settings → States.
                    </p>
                  ) : (
                    <div className="stlist">
                      {secondaries.map((s) => (
                        <label className="ck" key={s.id}>
                          <input
                            type="checkbox"
                            name="secondaryStateIds"
                            value={s.id}
                            defaultChecked={isEdit && (data.secondaryStateIds ?? []).includes(s.id)}
                          />
                          <span>{s.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {errFor("secondaryStateIds") ? (
                    <span className="hint" style={{ color: "var(--bad)" }} role="alert">
                      {errFor("secondaryStateIds")}
                    </span>
                  ) : null}
                  <p className="hint" style={{ marginTop: 8 }}>
                    Stages this car passes through — none or several. They never show to
                    buyers and never change a count.
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <label className="ck">
                  <input
                    type="checkbox"
                    id="f-new"
                    defaultChecked={isEdit ? data.isNew : false}
                  />
                  <span>
                    <b style={{ fontWeight: 600 }}>New arrival</b>
                    <small>
                      Also shows under &quot;Landed this year&quot; in the showroom,
                      as well as Available.
                    </small>
                  </span>
                </label>
                <div className="f">
                  <label htmlFor="f-arr">Arrival note</label>
                  <input
                    className="in"
                    id="f-arr"
                    name="arrivalNote"
                    type="text"
                    placeholder="Expected arrival: November"
                    defaultValue={isEdit ? data.arr : ""}
                  />
                  <span className="hint">
                    Shown to buyers on On-order cars. The one field they&apos;d
                    otherwise have to ask about.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="sec">
            <h2>
              <span className="n">5</span>Private notes
            </h2>
            <div className="f full">
              <label htmlFor="f-note">Notes to self (private)</label>
              <textarea
                className="in"
                id="f-note"
                name="privateNote"
                placeholder="Duty paid, immaculate. Ready for viewing."
                defaultValue={isEdit ? data.privateNote ?? "" : ""}
              ></textarea>
              <span className="hint">
                Office-only — never sent to the showroom.
              </span>
            </div>
          </section>

          <div className="saverow">
            <button className="btn" id="save" type="submit" disabled={saving}>
              <i className="fa-solid fa-check" /> {saving ? "Saving…" : "Save car"}
            </button>
            <a className="btn gh" href="/office/inventory">
              Cancel
            </a>
            <span className="hint2">
              {result && !result.ok
                ? "Some fields need attention — see the messages beside them."
                : "Saving puts the car in the showroom immediately."}
            </span>
          </div>
          {result && !result.ok ? (
            <div
              ref={formErrRef}
              id="formErr"
              tabIndex={-1}
              role="alert"
              style={{
                marginTop: 12,
                border: "1px solid var(--bad)",
                borderRadius: 10,
                padding: "10px 12px",
                color: "var(--bad)",
                fontSize: 13,
              }}
            >
              <b>Could not save.</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {result.errors.map((e) => (
                  <li key={e.field}>{e.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result && result.ok ? (
            <div
              role="status"
              style={{
                marginTop: 12,
                border: "1px solid var(--ok)",
                borderRadius: 10,
                padding: "10px 12px",
                color: "var(--ok)",
                fontSize: 13,
              }}
            >
              {result.changed ? (
                <>
                  Saved as <b>{result.ref}</b>. The showroom updates immediately.
                </>
              ) : (
                // The store answered that nothing moved: the car is exactly as it was, and the
                // screen says so rather than claiming a save (DR23).
                <>Nothing changed.</>
              )}
            </div>
          ) : null}
        </form>

        <aside className="aside" aria-label="Live costing">
          <div className="panel2">
            <div className="ph2">
              <i className="fa-solid fa-calculator" />
              {panel.costLabel} — live
            </div>
            <div className="pb">
              <div className="pl tot">
                <span>{panel.costLabel}</span>
                <b id="p-cost">{panel.costTxt}</b>
              </div>
              <div className="pl">
                <span>Doorstep price</span>
                <b id="p-price">{panel.priceTxt}</b>
              </div>
              <div
                className="incw"
                id="p-inc"
                style={panel.showInc ? undefined : { display: "none" }}
              >
                <i className="fa-solid fa-triangle-exclamation" />
                <span>
                  <b id="p-count">{panel.count}</b> Projected profit excludes this car
                  until all six are in. Money tied up counts whatever is entered.
                </span>
              </div>
            </div>
            <div className="pr">
              <small>Profit on this car</small>
              <div className={panel.profitCls} id="p-profit">
                {panel.profitTxt}
              </div>
              <p className="sub" id="p-psub">
                {panel.psub}
              </p>
            </div>
          </div>
          <div className="panel2">
            <div className="ph2">
              <i className="fa-solid fa-eye" />
              What the buyer sees
            </div>
            <div className="pb buyer">
              <p>
                Only <b>the doorstep price</b>, the car&apos;s facts and its photos.
                Costs, profit, private states and these notes are never sent to the
                browser — it&apos;s a server rule, not a setting.
              </p>
              <p style={{ marginTop: 10 }}>
                <a
                  href="/car/2019-toyota-sienna-xle"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "var(--gold)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  Preview the buyer page{" "}
                  <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    style={{ fontSize: 10 }}
                  />
                </a>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {mounted &&
        createPortal(
          <>
            <div className="mbar" aria-hidden="true">
              <div>
                <small>{panel.costLabel}</small>
                <b id="m-cost">{panel.mCost}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <small>Profit</small>
                <b id="m-profit" className={panel.mProfitCls}>
                  {panel.mProfit}
                </b>
              </div>
            </div>

            <Dialog
              open={delOpen}
              onClose={() => setDelOpen(false)}
              id="ovlD"
              labelledBy="car-del-title"
            >
              <div className="mdl">
                <h2 id="car-del-title">Delete this car?</h2>
                <p>
                  You can undo for a few seconds after. Deleting removes it from the
                  showroom and the office lists.
                </p>
                <div className="mrow">
                  <button
                    className="btn2"
                    type="button"
                    onClick={() => setDelOpen(false)}
                  >
                    Keep it
                  </button>
                  <button
                    className="btn2 danger"
                    type="button"
                    id="delYes"
                    onClick={() => {
                      setDelOpen(false);
                      doDelete();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Dialog>

            <div
              className={"toast" + (toastShow ? " show" : "")}
              id="toast"
              role="status"
            >
              <span
                id="tmsg"
                dangerouslySetInnerHTML={{ __html: toastMsg ?? "" }}
              />
              <button
                type="button"
                id="tundo"
                hidden={!undoOn}
                onClick={undoDelete}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--gold)",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  textTransform: "uppercase",
                }}
              >
                Undo
              </button>
              {/* The offer's clock, the inventory's (Task 10): the bar drains for exactly the
                  8000 ms window and its own animation end closes the offer. aria-hidden — the
                  offer's words carry the meaning; under reduced motion a static "8 s" is the
                  same measure in words (Task 11). */}
              {undoOn ? (
                reduced ? (
                  <span className="usec" aria-hidden="true">
                    8 s
                  </span>
                ) : (
                  <span className="utick" aria-hidden="true">
                    <span
                      className="ubar"
                      onAnimationEnd={(e) => {
                        if (e.animationName === "undodrain") expireOffer();
                      }}
                    />
                  </span>
                )
              ) : null}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
