"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CarStateEditor } from "./car-state-editor";
import { EnquiryStateEditor } from "./enquiry-state-editor";
import type { RegistryState } from "@/lib/car-state";
import type { EnquiryRegistryState } from "@/lib/enquiry-state";
import type { OfficeSettings } from "@/lib/settings";
import type { Notice } from "@/lib/notices";
import { normaliseNigerianMobile, waMeDigits } from "@/lib/phone";
import { clock, longDay } from "@/lib/office-time";
import { saveFullTankDefault, saveTagline, saveWhatsapp } from "@/app/office/actions/setting";

/* Settings — a faithful port of office-settings.html.
   The two state editors are the owner's real registries. The three settings are real too
   (truth 12): the value shown is the value the store holds, the save goes through
   `app/office/actions/setting.ts`, and the audit line under each card is the row's own
   `updated_at` rather than a literal. The four cards were a presentational port, holding their
   values in the browser and announcing "(demo)" — that is what changed here.
   The password card is no longer a form: the provider holds the password, the office holds none,
   and `Change password` goes to `/office/account`, where the provider's own UI does the work.
   The System card shows the two operational notices (D19), read from `setting` rows on the server
   and decided by `lib/notices.ts` — never computed here.
   The Export card is the office's one download (truth 13): a plain link to `/api/export`, which
   returns a single ZIP of everything the store holds. It is not `Link` on purpose — a prefetch
   would build an archive nobody asked for.
   Reference quirks reproduced on purpose:
   - `#pvLink` only updates while the number is valid, so it keeps its last good
     value when the field goes invalid.
   One quirk is deliberately NOT kept: `#tagN` booted hardcoded at "44" even though the
   tagline was 53 characters. That was a lie about a real value; it now counts the real one.
   The whole password form and its `#pDirty` unsaved-change flag are gone for the same reason:
   the office no longer builds a password form at all (truth 12, owner ruling 2026-10-14). */

/* The Settings sub-menu (ui-plan Q58). One route, panels swapped in place —
   no new routes, the URL never changes. */
const TABS = [
  { k: "general", label: "General", icon: "fa-sliders" },
  { k: "car", label: "Car states", icon: "fa-car-side" },
  { k: "customer", label: "Customer states", icon: "fa-users" },
  { k: "account", label: "Account", icon: "fa-user-gear" },
] as const;
type TabKey = (typeof TABS)[number]["k"];

export function Settings({
  registry = [],
  enquiryRegistry = [],
  settings,
  notices,
}: {
  registry?: RegistryState[];
  enquiryRegistry?: EnquiryRegistryState[];
  settings: OfficeSettings;
  notices: Notice[];
}) {
  const [wa, setWa] = useState(settings.whatsapp.value);
  const [waSnap, setWaSnap] = useState(settings.whatsapp.value);
  const [waErr, setWaErr] = useState<string | null>(null); // the store's own refusal, if any
  const [waSaved, setWaSaved] = useState(false); // clears the "good" outline after save
  const [waBusy, setWaBusy] = useState(false);
  const [pvLink, setPvLink] = useState("wa.me/" + waMeDigits(settings.whatsapp.value));

  const [tag, setTag] = useState(settings.tagline.value);
  const [tagSnap, setTagSnap] = useState(settings.tagline.value);
  const [tagErr, setTagErr] = useState<string | null>(null);
  const [tagBusy, setTagBusy] = useState(false);
  const [tagN, setTagN] = useState(String(settings.tagline.value.length));

  const [tank, setTank] = useState(settings.tank.value);
  const [tankSnap, setTankSnap] = useState(settings.tank.value);
  const [tankErr, setTankErr] = useState<string | null>(null);
  const [tankBusy, setTankBusy] = useState(false);

  const [tab, setTab] = useState<TabKey>("general");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onTabKey(e: ReactKeyboardEvent<HTMLButtonElement>, k: TabKey) {
    const i = TABS.findIndex((t) => t.k === k);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const nk = TABS[n].k;
    setTab(nk);
    tabRefs.current[nk]?.focus();
  }

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
  const waRead = normaliseNigerianMobile(wa);
  const waEmpty = waTrim === "";
  const waOk = waRead.ok;
  // The empty state is this screen's own words (it is about the showroom's buttons, not the number);
  // every other refusal is the one rule's, so the field and the store cannot disagree.
  const waMsg = waEmpty
    ? "No number set — every chat button on the site is dead until one is saved."
    : waRead.ok
      ? ""
      : waRead.reason;
  const waShown = waErr ?? waMsg;
  const waBad = !waEmpty && !waOk;
  const waGood = waOk && !waSaved;
  const waDirty = wa !== waSnap;

  function onWaInput(v: string) {
    setWa(v);
    setWaSaved(false);
    setWaErr(null);
    const read = normaliseNigerianMobile(v);
    if (read.ok) setPvLink("wa.me/" + waMeDigits(read.value));
  }

  async function saveWa() {
    if (!waOk) return;
    setWaBusy(true);
    try {
      const result = await saveWhatsapp(wa);
      if (!result.ok) {
        setWaErr(result.error);
        showToast(result.error);
        return;
      }
      // Show what the store now holds: the normalised `+234…`, not the way it was typed.
      setWa(result.value);
      setWaSnap(result.value);
      setWaErr(null);
      setWaSaved(true);
      setPvLink("wa.me/" + waMeDigits(result.value));
      // The words follow the store's own answer (DR23): a save that wrote nothing because the
      // number was already exactly this one says so, and never claims a save. A refusal never
      // reaches this line — it returns above.
      showToast(
        result.changed
          ? "WhatsApp number saved. Every chat button on the site now uses it."
          : "Nothing changed.",
      );
    } finally {
      setWaBusy(false);
    }
  }

  /* ---------- 2. Tagline ---------- */
  const tagDirty = tag !== tagSnap;

  async function saveTag() {
    setTagBusy(true);
    try {
      const result = await saveTagline(tag);
      if (!result.ok) {
        setTagErr(result.error);
        showToast(result.error);
        return;
      }
      setTag(result.value);
      setTagSnap(result.value);
      setTagN(String(result.value.length));
      setTagErr(null);
      showToast(result.changed ? "Tagline saved. The home page updates immediately." : "Nothing changed.");
    } finally {
      setTagBusy(false);
    }
  }

  /* ---------- 3. Cost default ---------- */
  const tankDirty = tank !== tankSnap;

  async function saveTank() {
    setTankBusy(true);
    try {
      const result = await saveFullTankDefault(tank);
      if (!result.ok) {
        setTankErr(result.error);
        showToast(result.error);
        return;
      }
      setTank(result.value);
      setTankSnap(result.value);
      setTankErr(null);
      showToast(
        result.changed ? "Default saved. Full tank is pre-filled on every new car." : "Nothing changed.",
      );
    } finally {
      setTankBusy(false);
    }
  }

  return (
    <>
      <div className="hrow">
        <h1>Settings</h1>
        <p className="sub2">
          The few things the whole site runs on. Change them here and the showroom
          follows — immediately, everywhere.
        </p>
      </div>

      <div className="setwrap">
        <nav className="subnav" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.k}
              type="button"
              role="tab"
              id={`tab-${t.k}`}
              aria-selected={tab === t.k}
              aria-controls={`panel-${t.k}`}
              tabIndex={tab === t.k ? 0 : -1}
              className={`subnav-it${tab === t.k ? " on" : ""}`}
              ref={(el) => {
                tabRefs.current[t.k] = el;
              }}
              onClick={() => setTab(t.k)}
              onKeyDown={(e) => onTabKey(e, t.k)}
            >
              <i className={`fa-solid ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="setmain">
          <div className="cards" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "general" && (
          <>
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
            <p className={`err${waBad || waErr ? " on" : ""}`} id="waErr">
              <i className="fa-solid fa-circle-exclamation" />
              <span id="waErrT">{waShown}</span>
            </p>
            <p className={`okmsg${waOk ? " on" : ""}`} id="waOk">
              <i className="fa-solid fa-circle-check" />
              Valid — buttons will open a chat with this number.
            </p>
          </div>
          <div className="own">
            <i className="fa-solid fa-user-shield" />
            <span>
              <b>Owner:</b> the demonstration ships with a placeholder number. Save your
              real one here and every chat button on the site follows it.
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
            <button className="btn" id="waSave" type="button" disabled={!waDirty || waBusy} onClick={saveWa}>
              Save number
            </button>
            <span className="dirty" id="waDirty" hidden={!waDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          {settings.whatsapp.updatedAt && (
            <p className="audit">
              <i className="fa-regular fa-clock" />
              Updated {longDay(settings.whatsapp.updatedAt)}, {clock(settings.whatsapp.updatedAt)}
            </p>
          )}
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
            {tagErr && (
              <p className="err on">
                <i className="fa-solid fa-circle-exclamation" />
                <span>{tagErr}</span>
              </p>
            )}
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
            <button className="btn" id="tagSave" type="button" disabled={!tagDirty || tagBusy} onClick={saveTag}>
              Save tagline
            </button>
            <span className="dirty" id="tagDirty" hidden={!tagDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          {settings.tagline.updatedAt && (
            <p className="audit">
              <i className="fa-regular fa-clock" />
              Updated {longDay(settings.tagline.updatedAt)}, {clock(settings.tagline.updatedAt)}
            </p>
          )}
        </section>

        {/* ============ 3. COST DEFAULT ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-naira-sign" />
            <h2>Cost default</h2>
          </div>
          <p className="cd">
            Pre-filled when typing a car&apos;s costs. Every amount is in naira — there is
            no currency conversion.
          </p>
          <div className="r2">
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
              {tankErr && (
                <p className="err on">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{tankErr}</span>
                </p>
              )}
            </div>
          </div>
          <div className="srow2">
            <button className="btn" id="tankSave" type="button" disabled={!tankDirty || tankBusy} onClick={saveTank}>
              Save default
            </button>
            <span className="dirty" id="tankDirty" hidden={!tankDirty}>
              <i className="fa-solid fa-pencil" />
              Unsaved change
            </span>
          </div>
          {settings.tank.updatedAt && (
            <p className="audit">
              <i className="fa-regular fa-clock" />
              Updated {longDay(settings.tank.updatedAt)}, {clock(settings.tank.updatedAt)}
            </p>
          )}
        </section>
          </>
        )}

        {tab === "car" && (
          <section className="card">
            <div className="ch">
              <i className="fa-solid fa-car-side" />
              <h2>Car states</h2>
            </div>
            <p className="cd">
              The four top states are fixed: the showroom groups by them, and it shows the first
              three, never Sold. Below them are your own states, in your own order.
            </p>
            <CarStateEditor states={registry} />
          </section>
        )}

        {tab === "customer" && (
          <section className="card">
            <div className="ch">
              <i className="fa-solid fa-users" />
              <h2>Customer states</h2>
            </div>
            <p className="cd">
              The states an enquiry can be given, and the colour each carries on the board. All of
              them are yours — nothing here is fixed, and any enquiry can be given any state at any
              time.
            </p>
            <EnquiryStateEditor states={enquiryRegistry} />
          </section>
        )}

        {tab === "account" && (
          <>
        {/* ============ 4. PASSWORD (delegated) ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-key" />
            <h2>Password</h2>
          </div>
          <p className="cd">
            One account, so one password. It is the identity provider&apos;s, not the office&apos;s —
            nothing on this screen stores it, sees it, or changes it. Changing it signs you out
            anywhere else it was open.
          </p>
          <div className="srow2">
            <Link className="btn" id="pChange" href="/office/account">
              Change password
            </Link>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            <i className="fa-regular fa-circle-question" /> Forgot it? Recovery is an
            identity-provider operation — it happens at the sign-in screen, not in the office.
          </p>
        </section>

        {/* ============ 5. SYSTEM (operational notices) ============ */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-heart-pulse" />
            <h2>System</h2>
          </div>
          <p className="cd">
            Read from what the system records about itself. The office displays these; it never
            estimates them.
          </p>
          <div className="notices">
            {notices.map((n) => (
              <div className={`notice ${n.level}`} key={n.kind} data-kind={n.kind}>
                <i
                  className={`fa-solid ${
                    n.level === "warn" ? "fa-triangle-exclamation" : "fa-circle-info"
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <b>{n.title}</b>
                  <span>{n.body}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 6. EXPORT (one action → one ZIP) ============ */}
        {/* A plain anchor, never `Link`: Link prefetches when it scrolls into view, which would
            build a whole archive the owner never asked for. The download is the office's own GET
            — it needs a session like every other read here, and answers with no body at all
            without one. */}
        <section className="card">
          <div className="ch">
            <i className="fa-solid fa-box-archive" />
            <h2>Export</h2>
          </div>
          <p className="cd">
            Take everything with you, in one press: every car with its costs and photos, every
            enquiry, tap, activity row and setting. It arrives as one ZIP — a nested
            master.json, one CSV per subject, and a README naming what is inside and when it was
            made. Nothing is sent anywhere; the file comes straight to your downloads.
          </p>
          <div className="srow2">
            <a className="btn" id="exportBtn" href="/api/export" download>
              Download the export
            </a>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            <i className="fa-regular fa-circle-question" /> It belongs to the office: opened from
            outside, with no session, it returns nothing.
          </p>
        </section>
          </>
        )}
          </div>
        </div>
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
