"use client";

import { type InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Settings — a faithful port of office-settings.html.
   The whole screen is presentational+local: four cards, each with its own
   validation or dirty-watch and a demo toast (plan §1 — data model out of
   scope). The theme toggle is NATIVE to the reference here (`.sfoot .srow` +
   `.thm` + `#thm`), supplied by the shared shell, so the only divergence is the
   product route URLs. Reference quirks reproduced on purpose:
   - `#tagN` boots hardcoded at "44" although the tagline is 53 chars — it only
     updates on input.
   - `#pDirty` boots hidden (`hidden` attribute) because pCheck() is never run at
     boot, even though a value is present; it appears on the first password input.
   - `#pvLink` only updates while the number is valid, so it keeps its last good
     value when the field goes invalid. */

const WA0 = "+234 800 000 0000";
const TAG0 = "Imported from the USA. Delivered anywhere in Nigeria.";
const FX0 = "1000";
const TANK0 = "110000";
const CURP0 = "demo-only";

const waDigits = (v: string) => v.replace(/\D/g, "");

function strength(v: string) {
  let s = 0;
  if (v.length >= 10) s++;
  if (v.length >= 14 && /[A-Z]/.test(v) && /[0-9]/.test(v)) s++;
  if (v.length >= 18 || (/[^A-Za-z0-9]/.test(v) && v.length >= 12)) s++;
  return s;
}

export function Settings() {
  const [wa, setWa] = useState(WA0);
  const [waSnap, setWaSnap] = useState(WA0);
  const [waSaved, setWaSaved] = useState(false); // clears the "good" outline after save
  const [pvLink, setPvLink] = useState("wa.me/" + waDigits(WA0));

  const [tag, setTag] = useState(TAG0);
  const [tagSnap, setTagSnap] = useState(TAG0);
  const [tagN, setTagN] = useState("44"); // reference hardcodes 44 at boot

  const [fx, setFx] = useState(FX0);
  const [tank, setTank] = useState(TANK0);
  const [fxSnap, setFxSnap] = useState(FX0);
  const [tankSnap, setTankSnap] = useState(TANK0);

  const [curp, setCurp] = useState(CURP0);
  const [newp, setNewp] = useState("");
  const [newp2, setNewp2] = useState("");
  const [pDirty, setPDirty] = useState(false); // visible flag (boots hidden)
  const [eyes, setEyes] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const tmr = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (tmr.current) window.clearTimeout(tmr.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (tmr.current) window.clearTimeout(tmr.current);
    tmr.current = window.setTimeout(() => setToast(null), 4000);
  }

  /* ---------- 1. WhatsApp: validation + dead-button preview ---------- */
  const waTrim = wa.trim();
  const waDigitsOnly = waDigits(waTrim);
  const waEmpty = waTrim === "";
  const waOk = !waEmpty && waDigitsOnly.length >= 10 && waDigitsOnly.length <= 15;
  const waMsg = waEmpty
    ? "No number set — every chat button on the site is dead until one is saved."
    : waOk
      ? ""
      : "That doesn't look like a full number. Include the country code, e.g. +234 800 000 0000.";
  const waBad = !waEmpty && !waOk;
  const waGood = waOk && !waSaved;
  const waDirty = wa !== waSnap;

  function onWaInput(v: string) {
    setWa(v);
    setWaSaved(false);
    const t = v.trim();
    const d = waDigits(t);
    const ok = t !== "" && d.length >= 10 && d.length <= 15;
    if (ok) setPvLink("wa.me/" + d);
  }

  function saveWa() {
    if (!waOk) return;
    setWaSnap(wa);
    setWaSaved(true);
    showToast("WhatsApp number saved (demo). Every chat button on the site now uses it.");
  }

  /* ---------- 2. Tagline ---------- */
  const tagDirty = tag !== tagSnap;

  function saveTag() {
    setTagSnap(tag);
    showToast("Tagline saved (demo). The home page updates immediately.");
  }

  /* ---------- 3. FX + tank ---------- */
  const fxDirty = fx !== fxSnap || tank !== tankSnap;

  function saveFx() {
    setFxSnap(fx);
    setTankSnap(tank);
    const rate = parseInt(fx, 10) || 1000;
    showToast(
      `Defaults saved (demo). Rate ₦${rate.toLocaleString("en-US")} per $1 applies to new cost entries only.`,
    );
  }

  /* ---------- 4. Password ---------- */
  const s = strength(newp);
  const newp2Bad = !!newp2 && newp2 !== newp;
  const pReady = !!curp && newp.length >= 10 && newp === newp2;
  const meterClass = "meter" + (s ? ` m${s}` : "");
  const mtxt = newp
    ? s === 0
      ? "Too short — at least 10 characters."
      : s === 1
        ? "Okay. A longer phrase would be stronger."
        : s === 2
          ? "Good password."
          : "Strong password."
    : "At least 10 characters. A long phrase beats a short scramble.";

  function onPwInput(which: "curp" | "newp" | "newp2", v: string) {
    const c = which === "curp" ? v : curp;
    const n = which === "newp" ? v : newp;
    const n2 = which === "newp2" ? v : newp2;
    if (which === "curp") setCurp(v);
    else if (which === "newp") setNewp(v);
    else setNewp2(v);
    setPDirty(!!(c || n || n2));
  }

  function savePassword() {
    if (newp2Bad || newp.length < 10) return;
    setCurp("");
    setNewp("");
    setNewp2("");
    setPDirty(false);
    showToast("Password updated (demo). Other signed-in sessions are signed out.");
  }

  /* ---------- Eyes ---------- */
  const eyeInput = (id: "curp" | "newp", props: InputHTMLAttributes<HTMLInputElement>) => {
    const shown = !!eyes[id];
    return (
      <div className="pwrap">
        <input {...props} type={shown ? "text" : "password"} />
        <button
          className="eye"
          type="button"
          data-eye={id}
          aria-label={shown ? "Hide password" : "Show password"}
          onClick={() => setEyes((e) => ({ ...e, [id]: !e[id] }))}
        >
          <i className={`fa-regular fa-eye${shown ? "-slash" : ""}`} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="hrow">
        <h1>Settings</h1>
        <p className="sub2">
          The few things the whole site runs on. Change them here and the showroom
          follows — immediately, everywhere.
        </p>
      </div>

      <div className="cards">
        {/* ============ 1. WHATSAPP NUMBER ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-brands fa-whatsapp" />
            <h2>WhatsApp number</h2>
          </div>
          <p className="cd">
            Every chat button on the site opens this number. A wrong number here is a
            dead button for every buyer.
          </p>
          <div className="f">
            <label htmlFor="wa">Number, with country code</label>
            <input
              className={`in${waBad ? " bad" : ""}${waGood ? " good" : ""}`}
              id="wa"
              type="tel"
              value={wa}
              autoComplete="off"
              inputMode="tel"
              onChange={(e) => onWaInput(e.target.value)}
            />
            <p className={`err${waOk ? "" : " on"}`} id="waErr">
              <i className="fa-solid fa-circle-exclamation" />
              <span id="waErrT">{waMsg}</span>
            </p>
            <p className={`okmsg${waOk ? " on" : ""}`} id="waOk">
              <i className="fa-solid fa-circle-check" />
              Valid — buttons will open a chat with this number.
            </p>
          </div>
          <div className="own">
            <i className="fa-solid fa-user-shield" />
            <span>
              <b>Owner:</b> this is a placeholder for the demo. Swap in the real number
              before the client sees it — real numbers never live in demo seed files.
            </span>
          </div>
          <div className="prev" aria-label="Showroom preview">
            <div className="ptit">
              <i className="fa-solid fa-eye" />
              What buyers see — live preview
            </div>
            <div className="pbody">
              <div className="mchip">
                <i className="fa-brands fa-whatsapp" />
                <div>
                  <small>WhatsApp</small>
                  <b id="pvNum">{waTrim || "—"}</b>
                </div>
              </div>
              <span className={`wab${waOk ? "" : " dead"}`} id="pvBtn">
                <i className="fa-brands fa-whatsapp" />
                Chat on WhatsApp
              </span>
              <span className={`deadnote${waOk ? "" : " on"}`} id="pvDead">
                <i className="fa-solid fa-triangle-exclamation" />
                With the number as it is now, this button does nothing for buyers.
              </span>
              <span className={`oknote${waOk ? " on" : ""}`} id="pvLive">
                <i className="fa-solid fa-circle-check" />
                Button live — opens{" "}
                <span
                  id="pvLink"
                  style={{ textDecoration: "underline", textUnderlineOffset: 2 }}
                >
                  {pvLink}
                </span>
              </span>
            </div>
          </div>
          <div className="srow2">
            <button className="btn" id="waSave" type="button" disabled={!waDirty} onClick={saveWa}>
              Save number
            </button>
            <span className="dirty" id="waDirty" hidden={!waDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          <p className="audit">
            <i className="fa-regular fa-clock" />
            Updated by Umar on 1 Oct 2026, 09:30
          </p>
        </section>

        {/* ============ 2. TAGLINE ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-quote-left" />
            <h2>Tagline</h2>
          </div>
          <p className="cd">The one line under the brand on the home page. Say what you do, plainly.</p>
          <div className="f">
            <label htmlFor="tag">Tagline</label>
            <input
              className="in"
              id="tag"
              type="text"
              maxLength={80}
              value={tag}
              onChange={(e) => {
                setTag(e.target.value);
                setTagN(String(e.target.value.length));
              }}
            />
            <p className="cnt">
              <span id="tagN">{tagN}</span>/80
            </p>
          </div>
          <div className="prev" aria-label="Tagline preview">
            <div className="ptit">
              <i className="fa-solid fa-eye" />
              Home page preview
            </div>
            <div className="pbody" style={{ alignItems: "center" }}>
              <div className="tprev">
                <span className="lg">
                  <i className="fa-solid fa-gauge-high" />
                  TrueSpec
                </span>
                <br />
                <span id="pvTag">{tag || "…"}</span>
              </div>
            </div>
          </div>
          <div className="srow2">
            <button className="btn" id="tagSave" type="button" disabled={!tagDirty} onClick={saveTag}>
              Save tagline
            </button>
            <span className="dirty" id="tagDirty" hidden={!tagDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          <p className="audit">
            <i className="fa-regular fa-clock" />
            Updated by Umar on 28 Sep 2026, 19:10
          </p>
        </section>

        {/* ============ 3. CURRENCY & DEFAULTS ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-dollar-sign" />
            <h2>Currency &amp; cost defaults</h2>
          </div>
          <p className="cd">
            Used when typing a car&apos;s costs. Existing cost lines keep the rate they
            were entered at — this setting only affects new entries.
          </p>
          <div className="r2">
            <div className="f">
              <label htmlFor="fx">Dollar rate</label>
              <div className="per">
                <span className="cur">
                  <span>₦</span>
                  <input
                    className="in"
                    id="fx"
                    type="number"
                    min={1}
                    step={5}
                    value={fx}
                    style={{ paddingLeft: 34 }}
                    onChange={(e) => setFx(e.target.value)}
                  />
                </span>
                <span>per $1</span>
              </div>
              <p className="hint">Landed cost = dollar costs × this rate + naira costs.</p>
            </div>
            <div className="f">
              <label htmlFor="tank">Full tank</label>
              <div className="cur">
                <span>₦</span>
                <input
                  className="in"
                  id="tank"
                  type="number"
                  min={0}
                  step={5000}
                  value={tank}
                  onChange={(e) => setTank(e.target.value)}
                />
              </div>
              <p className="hint">Default prefilled on every new car — change per car if needed.</p>
            </div>
          </div>
          <div className="srow2">
            <button className="btn" id="fxSave" type="button" disabled={!fxDirty} onClick={saveFx}>
              Save defaults
            </button>
            <span className="dirty" id="fxDirty" hidden={!fxDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          <p className="audit">
            <i className="fa-regular fa-clock" />
            Updated by Umar on 1 Oct 2026, 09:30
          </p>
        </section>

        {/* ============ 4. PASSWORD ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-key" />
            <h2>Password</h2>
          </div>
          <p className="cd">
            One account, so one password. Changing it signs out anywhere else it was open.
          </p>
          <div className="f">
            <label htmlFor="curp">Current password</label>
            {eyeInput("curp", {
              className: "in",
              id: "curp",
              autoComplete: "current-password",
              value: curp,
              onChange: (e) => onPwInput("curp", e.target.value),
            })}
          </div>
          <div className="r2">
            <div className="f">
              <label htmlFor="newp">New password</label>
              {eyeInput("newp", {
                className: "in",
                id: "newp",
                autoComplete: "new-password",
                value: newp,
                onChange: (e) => onPwInput("newp", e.target.value),
              })}
              <div className={meterClass} id="meter" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <p className="mtxt" id="mtxt">
                {mtxt}
              </p>
            </div>
            <div className="f">
              <label htmlFor="newp2">Confirm new password</label>
              <input
                className={`in${newp2Bad ? " bad" : ""}`}
                id="newp2"
                type="password"
                autoComplete="new-password"
                value={newp2}
                onChange={(e) => onPwInput("newp2", e.target.value)}
              />
              <p className={`err${newp2Bad ? " on" : ""}`} id="pErr">
                <i className="fa-solid fa-circle-exclamation" />
                Passwords don&apos;t match yet.
              </p>
            </div>
          </div>
          <div className="srow2">
            <button
              className="btn"
              id="pSave"
              type="button"
              disabled={!pReady}
              onClick={savePassword}
            >
              Update password
            </button>
            <span className="dirty" id="pDirty" hidden={!pDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          <p className="audit">
            <i className="fa-regular fa-clock" />
            Password last changed 12 Sep 2026
          </p>
        </section>
      </div>

      {mounted
        ? createPortal(
            <div className={`toast${toast ? " show" : ""}`} id="toast" role="status">
              <span id="tmsg">{toast ?? ""}</span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
