"use client";

/* Car form client — a faithful React port of the reference office-car.html
   runtime (edit mode is the ambient). No source is "copied" as the standard;
   the model extracted from the reference runtime is the standard. Inputs are
   uncontrolled (like the reference) and the live costing recomputes on input.
   The product decides edit vs add by route, so the reference's `.demo` mode
   switcher is dropped (plan §9 Q2). */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CarCosts = {
  purchase: string;
  ship: string;
  clear: string;
  truckus: string;
  truckng: string;
  tank: string;
};

export type CarFormData = {
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
  isNew: boolean;
  arr: string;
  note: string;
  imgs: string[];
};

const RATE = 1000;
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-US");
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const imgURL = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const STATES = ["Available", "On the way", "At port", "Cleared", "Landed"];
const HELD = "Held for payment";

const BLANK_COSTS: CarCosts = {
  purchase: "",
  ship: "",
  clear: "",
  truckus: "",
  truckng: "",
  tank: "",
};

function parse(v: string): number | null {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function compute(priceStr: string, c: CarCosts) {
  const price = parse(priceStr);
  const us = [parse(c.purchase), parse(c.ship), parse(c.clear), parse(c.truckus)];
  const ng = [parse(c.truckng), parse(c.tank)];
  const usdSum = us.reduce<number>((a, v) => a + (v || 0), 0);
  const ngSum = ng.reduce<number>((a, v) => a + (v || 0), 0);
  const entered = us.concat(ng).filter((v) => v != null).length;
  const hasAny = entered > 0;
  const landed = hasAny ? usdSum * RATE + ngSum : null;

  const usdTxt = hasAny && usdSum ? usd(usdSum) : "—";
  const ngnTxt = hasAny && ngSum ? naira(ngSum) : "—";
  const priceTxt = price != null ? naira(price) : "—";
  const landedTxt = landed != null ? naira(landed) : "—";
  const count = `${entered} of 6 costs entered.`;
  const showInc = entered !== 6;

  let profitTxt = "—";
  let profitCls = "num";
  let psub =
    price == null
      ? "Enter a doorstep price to see profit."
      : "Type the costs — this updates as you type.";
  if (price != null && landed != null) {
    const p = price - landed;
    profitTxt = naira(p) + (p < 0 ? " loss" : "");
    profitCls = "num " + (p < 0 ? "loss" : "ok");
    psub =
      p < 0
        ? "This price loses money. Raise the price or rethink the buy."
        : `Price − landed. ≈ ${((p / price) * 100).toFixed(1)}% of the price.`;
  }

  const mLanded = landed != null ? naira(landed) : "—";
  let mProfit = "—";
  let mProfitCls = "";
  if (price != null && landed != null) {
    const p = price - landed;
    mProfit = naira(p);
    mProfitCls = p < 0 ? "loss" : "ok";
  }

  return {
    usdTxt,
    ngnTxt,
    priceTxt,
    landedTxt,
    count,
    showInc,
    profitTxt,
    profitCls,
    psub,
    mLanded,
    mProfit,
    mProfitCls,
  };
}

export function CarForm({
  mode,
  data,
}: {
  mode: "edit" | "add";
  data: CarFormData;
}) {
  const isEdit = mode === "edit";

  const [panel, setPanel] = useState(() =>
    compute(isEdit ? data.price : "", isEdit ? data.costs : BLANK_COSTS),
  );
  const [imgs, setImgs] = useState<string[]>(isEdit ? data.imgs : []);
  const [curState, setCurState] = useState(isEdit ? data.state : "Available");
  const [soldOpen, setSoldOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tmr = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSoldOpen(false);
        setDelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      if (tmr.current) window.clearTimeout(tmr.current);
    },
    [],
  );

  const recalc = () => {
    const g = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
    setPanel(
      compute(g("f-price"), {
        purchase: g("c-purchase"),
        ship: g("c-ship"),
        clear: g("c-clear"),
        truckus: g("c-truckus"),
        truckng: g("c-truckng"),
        tank: g("c-tank"),
      }),
    );
  };

  const showToast = (html: string) => {
    setToastMsg(html);
    setToastShow(true);
    if (tmr.current) window.clearTimeout(tmr.current);
    tmr.current = window.setTimeout(() => setToastShow(false), 6000);
  };

  const makeCover = (i: number) =>
    setImgs((prev) => {
      const a = [...prev];
      const [x] = a.splice(i, 1);
      a.unshift(x);
      return a;
    });
  const removeImg = (i: number) =>
    setImgs((prev) => prev.filter((_, idx) => idx !== i));

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
            hidden={!isEdit}
            onClick={() => setSoldOpen(true)}
          >
            <i className="fa-solid fa-flag-checkered" /> Mark as sold
          </button>
          <button
            className="btn danger"
            id="delBtn"
            type="button"
            hidden={!isEdit}
            onClick={() => setDelOpen(true)}
          >
            <i className="fa-solid fa-trash-can" /> Delete
          </button>
        </div>
      </div>

      <div className="cols">
        <div>
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
                  type="text"
                  placeholder="52,614"
                  defaultValue={isEdit ? data.mileage : ""}
                />
                <span className="hint">
                  Shown exactly as the car reads — miles for US imports.
                </span>
              </div>
              <div className="f">
                <label htmlFor="f-price">Doorstep price (₦)</label>
                <div className="cur">
                  <span>₦</span>
                  <input
                    className="in"
                    id="f-price"
                    type="number"
                    min={0}
                    step={50000}
                    placeholder="33,900,000"
                    defaultValue={isEdit ? data.price : ""}
                    onInput={recalc}
                  />
                </div>
                <span className="hint">
                  The one price a buyer sees. Shipping, clearing and delivery are
                  already inside it.
                </span>
              </div>
              <div className="f">
                <label htmlFor="f-ext">Exterior colour</label>
                <input
                  className="in"
                  id="f-ext"
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
            <div
              className="drop"
              id="drop"
              role="button"
              tabIndex={0}
              aria-label="Add photos"
            >
              <i className="fa-solid fa-cloud-arrow-up" />
              Drop photos here or click to browse — first photo is the cover buyers
              see first
            </div>
            <div className="thumbs" id="thumbs">
              {imgs.map((id, i) => (
                <div className="th" key={id}>
                  <img src={imgURL(id, 300)} alt={`Photo ${i + 1}`} />
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
              <div className="f">
                <label htmlFor="c-purchase">Purchase price ($)</label>
                <div className="cur">
                  <span>$</span>
                  <input
                    className="in cost"
                    id="c-purchase"
                    type="number"
                    min={0}
                    placeholder="26,500"
                    defaultValue={isEdit ? data.costs.purchase : ""}
                    onInput={recalc}
                  />
                </div>
              </div>
              <div className="f">
                <label htmlFor="c-ship">Shipping ($)</label>
                <div className="cur">
                  <span>$</span>
                  <input
                    className="in cost"
                    id="c-ship"
                    type="number"
                    min={0}
                    placeholder="3,200"
                    defaultValue={isEdit ? data.costs.ship : ""}
                    onInput={recalc}
                  />
                </div>
              </div>
              <div className="f">
                <label htmlFor="c-clear">Clearing ($)</label>
                <div className="cur">
                  <span>$</span>
                  <input
                    className="in cost"
                    id="c-clear"
                    type="number"
                    min={0}
                    placeholder="1,850"
                    defaultValue={isEdit ? data.costs.clear : ""}
                    onInput={recalc}
                  />
                </div>
              </div>
              <div className="f">
                <label htmlFor="c-truckus">Trucking within USA ($)</label>
                <div className="cur">
                  <span>$</span>
                  <input
                    className="in cost"
                    id="c-truckus"
                    type="number"
                    min={0}
                    placeholder="470"
                    defaultValue={isEdit ? data.costs.truckus : ""}
                    onInput={recalc}
                  />
                </div>
              </div>
              <div className="f">
                <label htmlFor="c-truckng">Trucking in Nigeria (₦)</label>
                <div className="cur">
                  <span>₦</span>
                  <input
                    className="in cost"
                    id="c-truckng"
                    type="number"
                    min={0}
                    step={10000}
                    placeholder="525,000"
                    defaultValue={isEdit ? data.costs.truckng : ""}
                    onInput={recalc}
                  />
                </div>
              </div>
              <div className="f">
                <label htmlFor="c-tank">Full tank (₦)</label>
                <div className="cur">
                  <span>₦</span>
                  <input
                    className="in cost"
                    id="c-tank"
                    type="number"
                    min={0}
                    step={10000}
                    placeholder="110,000"
                    defaultValue={isEdit ? data.costs.tank : ""}
                    onInput={recalc}
                  />
                </div>
                <span className="hint">
                  Default from Settings — change per car if needed.
                </span>
              </div>
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
                <div className="stlist" id="states">
                  {STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={"stb" + (curState === s ? " on" : "")}
                      data-st={s}
                      onClick={() => setCurState(s)}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={"stb" + (curState === HELD ? " on" : "")}
                    data-st={HELD}
                    onClick={() => setCurState(HELD)}
                  >
                    Held for payment<span className="cust">custom</span>
                  </button>
                </div>
                <p className="hint" style={{ marginTop: 10 }}>
                  The showroom follows automatically. Buyers only ever see the three
                  section names — never these labels.
                </p>
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
              <label htmlFor="f-note">Notes to self</label>
              <textarea
                className="in"
                id="f-note"
                placeholder="Duty paid, immaculate. Ready for viewing."
                defaultValue={isEdit ? data.note : ""}
              ></textarea>
              <span className="hint">
                For your filing only — never sent to the showroom, even by accident.
              </span>
            </div>
          </section>

          <div className="saverow">
            <button
              className="btn"
              id="save"
              type="button"
              onClick={() =>
                showToast(
                  'Saved (demo). The showroom updates immediately. <a href="/car/2019-toyota-sienna-xle" target="_blank">Preview buyer page</a>',
                )
              }
            >
              <i className="fa-solid fa-check" /> Save car
            </button>
            <a className="btn gh" href="/office/inventory">
              Cancel
            </a>
            <span className="hint2">Saving puts the car in the showroom immediately.</span>
          </div>
        </div>

        <aside className="aside" aria-label="Live costing">
          <div className="panel2">
            <div className="ph2">
              <i className="fa-solid fa-calculator" />
              Landed cost — live
            </div>
            <div className="pb">
              <div className="pl">
                <span>Purchase + US costs</span>
                <b id="p-usd">{panel.usdTxt}</b>
              </div>
              <div className="pl">
                <span>Nigeria costs</span>
                <b id="p-ngn">{panel.ngnTxt}</b>
              </div>
              <div className="pl">
                <span>Rate</span>
                <b id="p-rate">₦1,000 / $1</b>
              </div>
              <div className="pl tot">
                <span>Landed cost</span>
                <b id="p-landed">{panel.landedTxt}</b>
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
                <small>Landed</small>
                <b id="m-landed">{panel.mLanded}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                <small>Profit</small>
                <b id="m-profit" className={panel.mProfitCls}>
                  {panel.mProfit}
                </b>
              </div>
            </div>

            <div
              className="ovl"
              id="ovlS"
              hidden={!soldOpen}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSoldOpen(false);
              }}
            >
              <div className="mdl" role="dialog" aria-modal="true">
                <h2>Mark as sold?</h2>
                <p>
                  The car leaves the showroom immediately and moves to Inventory →
                  Sold. Record the sale price there. Nothing is deleted.
                </p>
                <div className="mrow">
                  <button
                    className="btn2"
                    type="button"
                    onClick={() => setSoldOpen(false)}
                  >
                    Not yet
                  </button>
                  <button
                    className="btn2"
                    type="button"
                    id="soldYes"
                    style={{ borderColor: "var(--ok)", color: "var(--ok)" }}
                    onClick={() => {
                      setSoldOpen(false);
                      showToast("Marked as sold (demo). It moves to Inventory → Sold.");
                    }}
                  >
                    Mark as sold
                  </button>
                </div>
              </div>
            </div>

            <div
              className="ovl"
              id="ovlD"
              hidden={!delOpen}
              onClick={(e) => {
                if (e.target === e.currentTarget) setDelOpen(false);
              }}
            >
              <div className="mdl" role="dialog" aria-modal="true">
                <h2>Delete this car?</h2>
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
                      showToast("Car deleted (demo).");
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

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
                hidden
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
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
