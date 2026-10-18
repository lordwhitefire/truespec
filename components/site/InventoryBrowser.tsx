"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Photo } from "@/components/Photo";
import { waLink } from "@/components/whatsapp";
import { formatNaira } from "@/lib/money";
import { countStock } from "@/lib/counts";
import { PUBLIC_SECTIONS, presentedSections, sectionLabel, tokenOf, type Section } from "@/lib/sections";
import type { PublicCar } from "@/lib/serialize";
import { ReferenceCard } from "./ReferenceCard";
import { carHref, carState, carTitle } from "./car-view";
import { speak } from "./speak";
import { store } from "./store";

// The inventory screen (reference inventory.html), adapted to the public car
// fields: the reference filters Body type / Brand; we have no body, so the
// sidebar is Status / Make / Year / Colour / Price (RECON-001 testing 3.1).

type Sort = "new" | "low" | "high" | "year";
type View = "grid" | "list";

export type InventoryInitial = {
  status: Section[];
  make: string[];
  year: number[];
  color: string[];
  min: number | null;
  max: number | null;
  sort: Sort;
  view: View;
};

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu", "Benin City"];
const WHEN = ["20 min ago", "45 min ago", "1 hr ago", "this morning"];

const naira = (kobo: number) => formatNaira(kobo);

export function InventoryBrowser({
  cars,
  number,
  initial,
}: {
  cars: PublicCar[];
  number: string;
  initial: InventoryInitial;
}) {
  const [status, setStatus] = useState<Set<Section>>(() => new Set(initial.status));
  const [make, setMake] = useState<Set<string>>(() => new Set(initial.make));
  const [year, setYear] = useState<Set<number>>(() => new Set(initial.year));
  const [color, setColor] = useState<Set<string>>(() => new Set(initial.color));
  const [minText, setMinText] = useState(initial.min == null ? "" : String(initial.min));
  const [maxText, setMaxText] = useState(initial.max == null ? "" : String(initial.max));
  const [sort, setSort] = useState<Sort>(initial.sort);
  const [view, setView] = useState<View>(initial.view);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<{ title: string; body: ReactNode } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const waSource = waLink(number, "Hello TrueSpec, the car I'm after isn't on your site. Make/Model/Year: ");

  // ---- categories (bar totals, like the reference countWhere) -------------
  const makes = useMemo(
    () => [...new Set(cars.map((c) => c.brand).filter((b): b is string => !!b))].sort(),
    [cars],
  );
  const years = useMemo(
    () =>
      [...new Set(cars.map((c) => c.year).filter((y): y is number => y != null))].sort(
        (a, b) => b - a,
      ),
    [cars],
  );
  const colors = useMemo(
    () =>
      [...new Set(cars.map((c) => c.exteriorColor).filter((c): c is string => !!c))].sort(),
    [cars],
  );
  const statusCounts = useMemo(() => {
    const counts = countStock(cars);
    return new Map<Section, number>([
      ["available", counts.available],
      ["on order", counts.onOrder],
      ["landed", counts.landed],
    ]);
  }, [cars]);

  const min = parsePrice(minText);
  const max = parsePrice(maxText);

  // ---- filtering + sorting (reference listCars) ---------------------------
  const list = useMemo(() => {
    let l = cars.filter(
      (c) =>
        (!status.size || presentedSections(c).some((s) => status.has(s))) &&
        (!make.size || (c.brand != null && make.has(c.brand))) &&
        (!year.size || (c.year != null && year.has(c.year))) &&
        (!color.size || (c.exteriorColor != null && color.has(c.exteriorColor))) &&
        (min == null || c.priceKobo >= min * 100) &&
        (max == null || c.priceKobo <= max * 100),
    );
    if (sort === "low") l = [...l].sort((a, b) => a.priceKobo - b.priceKobo);
    else if (sort === "high") l = [...l].sort((a, b) => b.priceKobo - a.priceKobo);
    else if (sort === "year") l = [...l].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.priceKobo - a.priceKobo);
    return l;
  }, [cars, status, make, year, color, min, max, sort]);

  // ---- deep links (reference syncURL) -------------------------------------
  useEffect(() => {
    const p = new URLSearchParams();
    if (status.size) p.set("status", [...status].map(tokenOf).sort().join(","));
    if (make.size) p.set("make", [...make].join(","));
    if (year.size) p.set("year", [...year].join(","));
    if (color.size) p.set("color", [...color].join(","));
    if (min != null) p.set("min", String(min));
    if (max != null) p.set("max", String(max));
    if (sort !== "new") p.set("sort", sort);
    if (view === "list") p.set("view", "list");
    const q = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
  }, [status, make, year, color, min, max, sort, view]);

  const announce = useCallback(
    (n: number) => {
      speak(
        n
          ? `<b>${n} car${n === 1 ? "" : "s"} match</b> — every price is the full doorstep price.`
          : `Nothing matches those filters. <a target="_blank" rel="noopener noreferrer" href="${waSource}">Tell me what you're after</a> and I'll source it in the USA.`,
      );
    },
    [waSource],
  );

  const clearAll = () => {
    setStatus(new Set());
    setMake(new Set());
    setYear(new Set());
    setColor(new Set());
    setMinText("");
    setMaxText("");
    speak(`Showing everything — <b>${cars.length} cars</b>, every price door-to-door.`);
  };

  // Umar answers every filter change (the reference calls speakResult on change).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    announce(list.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, make, year, color, minText, maxText]);

  // ---- toast + modal (shared session budget with the other pages) ---------
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((t: string, ms: number) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), [showToast]);

  const covering = useRef(store.sget("covering", 0));
  const openModal = useCallback((title: string, body: ReactNode) => {
    if (covering.current >= 2) return false;
    covering.current += 1;
    store.sset("covering", covering.current);
    setModal({ title, body });
    document.body.classList.add("lock");
    return true;
  }, []);
  // The modal is the platform's dialog (Task 13). It is mounted by `modal`, so it is shown once it
  // exists; Escape arrives as `cancel`, and `close()` runs before the state removes it.
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeModal = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setModal(null);
    document.body.classList.remove("lock");
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (modal && dialog && !dialog.open) dialog.showModal();
  }, [modal]);

  // farewell — desktop exit intent + mobile flick, at least 7s dwell
  useEffect(() => {
    const t0 = Date.now();
    let shown = false;
    const tryFarewell = () => {
      if (shown || Date.now() - t0 < 7000) return;
      shown = true;
      openModal(
        "Before you go",
        <>
          <p className="mp">
            Tell me the car you&apos;re after and I&apos;ll find it — shipped, cleared and delivered, one price.
          </p>
          <div className="mbtns">
            <a className="wab" target="_blank" rel="noopener noreferrer" href={waSource}>
              <i className="fa-brands fa-whatsapp" />
              Message me on WhatsApp
            </a>
            <button type="button" className="sk" onClick={closeModal}>
              I&apos;ll keep looking
            </button>
          </div>
        </>,
      );
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) tryFarewell();
    };
    let samples: { y: number; t: number }[] = [];
    const onTouchStart = (e: TouchEvent) => {
      samples = [{ y: e.touches[0].clientY, t: Date.now() }];
    };
    const onTouchMove = (e: TouchEvent) => {
      samples.push({ y: e.touches[0].clientY, t: Date.now() });
      if (samples.length > 4) samples.shift();
    };
    const onTouchEnd = () => {
      if (samples.length < 2) return;
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = b.t - a.t;
      if (dt > 0 && (b.y - a.y) / dt < -0.9 && b.y < 140 && window.scrollY < 80) tryFarewell();
    };
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [openModal, closeModal, waSource]);

  // social-proof toast — once per session across all pages
  useEffect(() => {
    if (store.sget("toast", false)) return;
    let retry: number | undefined;
    const fire = () => {
      if (document.body.classList.contains("lock")) {
        retry = window.setTimeout(fire, 12000);
        return;
      }
      store.sset("toast", true);
      const pool = cars.filter((c) => c.section === "available");
      if (!pool.length) return;
      const car = pool[Math.floor(Math.random() * pool.length)];
      showToast(
        `Someone from ${CITIES[Math.floor(Math.random() * CITIES.length)]} asked about the ${carTitle(car)} — ${WHEN[Math.floor(Math.random() * WHEN.length)]}`,
        7000,
      );
    };
    const timer = window.setTimeout(fire, 9000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retry);
    };
  }, [cars, showToast]);

  const share = useCallback(
    (car: PublicCar) => {
      const url = window.location.origin + carHref(car);
      const title = carTitle(car);
      if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(
          () => showToast("Link copied", 2400),
          () => showToast("Copy the link from the address bar", 2400),
        );
      } else {
        showToast("Copy the link from the address bar", 2400);
      }
    },
    [showToast],
  );

  const onRowClick = (e: ReactMouseEvent<HTMLElement>) => {
    const b = (e.target as HTMLElement).closest("[data-share]") as HTMLElement | null;
    if (!b) return;
    const car = cars.find((x) => x.ref === b.dataset.share);
    if (car) share(car);
  };

  const toggle = <T,>(setter: Dispatch<SetStateAction<Set<T>>>, val: T, on: boolean) => {
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(val);
      else next.delete(val);
      return next;
    });
  };

  const all = list.length === cars.length;

  return (
    <>
      <div className="sv">
        <div className="band">
          <div className="w">
            <div className="hd">
              <h2>
                TrueSpec <em>Inventory</em>
              </h2>
              <div className="cnt">
                <i className="fa-solid fa-car-side" />
                <span id="cnt">
                  {all ? (
                    <>
                      <b>{cars.length} cars</b>
                    </>
                  ) : (
                    <>
                      <b>{list.length}</b> of {cars.length} cars
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
        <main className="ip">
          <div className="w">
            <aside>
              <button
                type="button"
                className="btn sbt"
                id="sbt"
                aria-expanded={sidebarOpen}
                aria-controls="sb"
                onClick={() => setSidebarOpen((o) => !o)}
              >
                <i className="fa-solid fa-sliders" />
                Search options
              </button>
              <div className={`sb${sidebarOpen ? " open" : ""}`} id="sb">
                <div className="sbh">
                  <i className="fa-solid fa-sliders" />
                  Refine search
                </div>
                <div className="sbb">
                  <details className="fs" open>
                    <summary>Status</summary>
                    {PUBLIC_SECTIONS.map((section) => (
                      <label className="ck" key={section}>
                        <input
                          type="checkbox"
                          name="status"
                          value={tokenOf(section)}
                          checked={status.has(section)}
                          onChange={(e) => toggle<Section>(setStatus, section, e.target.checked)}
                        />
                        {sectionLabel(section)}
                        <em>{statusCounts.get(section) ?? 0}</em>
                      </label>
                    ))}
                  </details>

                  <details className="fs" open>
                    <summary>Make</summary>
                    {makes.map((b) => (
                      <label className="ck" key={b}>
                        <input
                          type="checkbox"
                          name="make"
                          value={b}
                          checked={make.has(b)}
                          onChange={(e) => toggle(setMake, b, e.target.checked)}
                        />
                        {b}
                        <em>{cars.filter((c) => c.brand === b).length}</em>
                      </label>
                    ))}
                  </details>

                  <details className="fs" open>
                    <summary>Year</summary>
                    {years.map((y) => (
                      <label className="ck" key={y}>
                        <input
                          type="checkbox"
                          name="year"
                          value={y}
                          checked={year.has(y)}
                          onChange={(e) => toggle(setYear, y, e.target.checked)}
                        />
                        {y}
                        <em>{cars.filter((c) => c.year === y).length}</em>
                      </label>
                    ))}
                  </details>

                  <details className="fs" open>
                    <summary>Colour</summary>
                    {colors.map((c) => (
                      <label className="ck" key={c}>
                        <input
                          type="checkbox"
                          name="color"
                          value={c}
                          checked={color.has(c)}
                          onChange={(e) => toggle(setColor, c, e.target.checked)}
                        />
                        {c}
                        <em>{cars.filter((x) => x.exteriorColor === c).length}</em>
                      </label>
                    ))}
                  </details>

                  <details className="fs" open>
                    <summary>Price (&#8358;)</summary>
                    <div className="r2">
                      <input
                        className="in"
                        id="pmin"
                        type="number"
                        min="0"
                        step="100000"
                        placeholder="Min"
                        value={minText}
                        aria-label="Minimum price"
                        onChange={(e) => setMinText(e.target.value)}
                      />
                      <input
                        className="in"
                        id="pmax"
                        type="number"
                        min="0"
                        step="100000"
                        placeholder="Max"
                        value={maxText}
                        aria-label="Maximum price"
                        onChange={(e) => setMaxText(e.target.value)}
                      />
                    </div>
                  </details>

                  <button type="button" className="clr" id="clr" onClick={clearAll}>
                    Clear all filters
                  </button>
                </div>
              </div>
            </aside>

            <section className="res" aria-label="Cars">
              <p className="crumb" style={{ marginBottom: 14 }}>
                <a href="/">Home</a> / Inventory
              </p>
              {/* Umar's answer to every filter tap appears here */}
              <p id="speak" className="speak" role="status" aria-live="polite" />
              <div className="tb">
                <h2 id="ttl" role="status">
                  {all ? (
                    <>
                      All <em>inventory</em>
                    </>
                  ) : (
                    <>
                      <em>{list.length}</em> matching car{list.length === 1 ? "" : "s"}
                    </>
                  )}
                </h2>
                <div className="tc">
                  <label htmlFor="sort">Sort by</label>
                  <select
                    className="in"
                    id="sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    <option value="new">Newest first</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                    <option value="year">Year: newest</option>
                  </select>
                  <button
                    type="button"
                    className="vb"
                    id="vg"
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    <i className="fa-solid fa-table-cells-large" />
                  </button>
                  <button
                    type="button"
                    className="vb"
                    id="vl"
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    <i className="fa-solid fa-list" />
                  </button>
                </div>
              </div>

              <div id="out" onClick={onRowClick}>
                {list.length === 0 ? (
                  <div className="empty">
                    <i className="fa-solid fa-magnifying-glass" />
                    <p>{SAY_EMPTY}</p>
                    <a className="btn" target="_blank" rel="noopener noreferrer" href={waSource}>
                      <i className="fa-brands fa-whatsapp" />
                      {SAY_EMPTY_BTN}
                    </a>
                  </div>
                ) : view === "list" ? (
                  list.map((c) => (
                    <InventoryRow key={c.ref} car={c} />
                  ))
                ) : (
                  <div className="grid">
                    {list.map((c) => (
                      <ReferenceCard key={c.ref} car={c} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {modal ? (
        <dialog
          ref={dialogRef}
          className="ovl"
          id="ovl"
          aria-labelledby="mtitle"
          onCancel={(e) => {
            e.preventDefault();
            closeModal();
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="mdl">
            <button className="mx" id="mx" type="button" aria-label="Close" onClick={closeModal}>
              &times;
            </button>
            <div className="mdlh">
              <div className="av" aria-hidden="true">
                U
              </div>
              <h2 id="mtitle">{modal.title}</h2>
            </div>
            <div id="mbody">{modal.body}</div>
          </div>
        </dialog>
      ) : null}

      {toast ? (
        <div className="toast" id="toast" role="status">
          <span id="toasttxt">{toast}</span>
          <button id="toastx" type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            &times;
          </button>
        </div>
      ) : null}
    </>
  );
}

const SAY_EMPTY = "Nothing here yet — tell me the car you're after and I'll source it in the USA.";
const SAY_EMPTY_BTN = "Message me on WhatsApp";

function parsePrice(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// The reference row() always shows the section as a chip (available included).
function sectionChip(car: PublicCar): { t: string; cls: string; dot: string } {
  if (car.section === "on order") return { t: "On order", cls: "oo", dot: "var(--oo)" };
  if (car.section === "landed") return { t: "Landed", cls: "ld", dot: "var(--ld)" };
  return { t: "Available", cls: "", dot: "var(--gold)" };
}

// The reference row(): an image left, facts + a share button right.
function InventoryRow({ car }: { car: PublicCar }) {
  const st = carState(car);
  const sc = sectionChip(car);
  const onOrder = car.section === "on order";
  const photo = car.photos[0];
  const title = carTitle(car);
  return (
    <article className="lc">
      <a className="lph" href={carHref(car)} aria-label={title}>
        <div className="ph">
          <Photo src={photo} alt={title} loading="lazy" />
          {st ? (
            <div className="rb">
              <span className={st.rb || undefined}>{st.t}</span>
            </div>
          ) : null}
        </div>
      </a>
      <div>
        <div className="lt">
          <h3>
            <a href={carHref(car)}>
              {car.brand} {car.model} {car.trim} {car.year}
            </a>
          </h3>
          <span
            className="pt"
            style={{ clipPath: "polygon(12px 0,100% 0,100% 100%,0 100%)", padding: "6px 14px 6px 24px" }}
          >
            {car.wasPriceKobo !== null ? <s>{naira(car.wasPriceKobo)}</s> : null}
            {naira(car.priceKobo)}
          </span>
        </div>
        <div className="ls">
          {car.mileageKm !== null ? (
            <div>
              <small>
                <i className="fa-solid fa-road" />
                Mileage
              </small>
              <b>{car.mileageKm.toLocaleString("en-US")} km</b>
            </div>
          ) : null}
          {car.exteriorColor ? (
            <div>
              <small>
                <i className="fa-solid fa-palette" />
                Exterior
              </small>
              <b>{car.exteriorColor}</b>
            </div>
          ) : null}
        </div>
        <div className="lf">
          {car.wasPriceKobo !== null ? (
            <span className="chip deal">
              <i className="dot" style={{ background: "var(--gold)" }} />
              Special
            </span>
          ) : null}
          <span className={`chip ${sc.cls}`}>
            <i className="dot" style={{ background: sc.dot }} />
            {sc.t}
          </span>
          {onOrder ? (
            <span className="chip oo">
              <i className="fa-solid fa-ship" />
              {car.arrivalNote || "Arriving soon"}
            </span>
          ) : null}
          <button type="button" className="sh" data-share={car.ref}>
            <i className="fa-solid fa-share-nodes" />
            Share
          </button>
        </div>
      </div>
    </article>
  );
}


