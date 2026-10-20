"use client";

import { useEffect, useState } from "react";
import { countStock } from "@/lib/counts";
import { presentedSections } from "@/lib/sections";
import type { PublicCar } from "@/lib/serialize";
import { ReferenceCard } from "./ReferenceCard";
import { speak } from "./speak";
import { store } from "./store";
import { waClass, waOffProps } from "@/components/whatsapp";

const newMsg = (n: number) =>
  `Here ${n === 1 ? "is the car" : "are the " + n + " cars"} that arrived since your last visit.`;

type TabId = "a" | "o" | "l";
const TABS: { id: TabId; label: string }[] = [
  { id: "a", label: "Available" },
  { id: "o", label: "On order" },
  { id: "l", label: "Landed this year" },
];

type View = { type: "tab"; key: TabId } | { type: "new"; cars: PublicCar[] };

// The home grid is 4-up at 1440 (3-up ≤1100, 2-up ≤820, 1-up ≤560): 12 is three full
// rows, and it divides by 3, 2 and 1 as well. The paging rule is the same one /inventory
// uses (numbered pages + Prev/Next); only the page size follows the grid (owner, 2026-10-19).
const PAGE_SIZE = 12;

// The reference home inventory: tabs FILTER this grid in place (they do not
// navigate). Semantics copied from truespec.html listFor()/cntLabel():
//   Available    -> available + landed   "Available N ready · N landed"
//   On order     -> on-order cars        "On order N cars"
//   Landed       -> landed cars          "Landed N cars"
// "Show all" stays a link to /inventory.
export function HomeInventory({ cars, number }: { cars: PublicCar[]; number: string }) {
  const [view, setView] = useState<View>({ type: "tab", key: "a" });
  const [page, setPage] = useState(1);
  const digits = number.replace(/\D/g, "");
  const wa = digits ? `https://wa.me/${digits}` : null;

  // Counts come from the one counting rule (R-CNT-1…5), never local arithmetic.
  const counts = countStock(cars);

  const list =
    view.type === "new"
      ? view.cars
      : view.key === "a"
        ? cars.filter((c) => presentedSections(c).includes("available"))
        : view.key === "o"
          ? cars.filter((c) => c.section === "on order")
          : cars.filter((c) => c.section === "landed");

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), pageCount);
  const shown = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => {
    const onNew = () => {
      const known = store.get<string[] | null>("known", null);
      setPage(1);
      setView({ type: "new", cars: known ? cars.filter((c) => !known.includes(c.ref)) : [] });
    };
    window.addEventListener("ts-show-new", onNew);
    return () => window.removeEventListener("ts-show-new", onNew);
  }, [cars]);

  useEffect(() => {
    if (view.type === "new") speak(newMsg(view.cars.length));
  }, [view]);

  const activeTab = view.type === "tab" ? view.key : null;

  const goPage = (n: number) => {
    const next = Math.min(Math.max(n, 1), pageCount);
    setPage(next);
    speak(`Page <b>${next}</b> of ${pageCount}`);
    const heading = document.getElementById("hinv-h");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  };

  return (
    <>
      <div className="band" id="cars">
        <div className="w">
          <div className="hd">
            <h2 id="hinv-h" tabIndex={-1}>
              TrueSpec <em>Inventory</em>
            </h2>
            <div className="cnt">
              <i className="fa-solid fa-car-side" />
              <span id="cnt">
                {view.type === "new" ? (
                  <>
                    New since your last visit <b>{list.length} cars</b>
                  </>
                ) : activeTab === "a" ? (
                  <>
                    Available <b>{counts.available} cars</b>
                    {counts.newArrivals > 0 ? (
                      <>
                        {" "}
                        · of which <b>{counts.newArrivals} new arrivals</b>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    {activeTab === "o" ? "On order" : "Landed"}{" "}
                    <b>{activeTab === "o" ? counts.onOrder : counts.landed} cars</b>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                className={activeTab === t.id ? "tab on" : "tab"}
                aria-selected={activeTab === t.id}
                onClick={() => {
                  setPage(1);
                  setView({ type: "tab", key: t.id });
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="inv">
        <div className="w">
          <p id="speak" className="speak" role="status" aria-live="polite" />
          <div className="grid" id="grid">
            {list.length ? (
              shown.map((c) => <ReferenceCard key={c.ref} car={c} />)
            ) : (
              <div className="empty">
                <i className="fa-solid fa-magnifying-glass" />
                <p>Nothing here yet — tell me the car you&rsquo;re after and I&rsquo;ll source it in the USA.</p>
                <a
                  className={waClass("btn", !wa)}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={wa ?? undefined}
                  {...waOffProps(!wa)}
                >
                  <i className="fa-brands fa-whatsapp" />
                  Message me on WhatsApp
                </a>
              </div>
            )}
          </div>
          {pageCount > 1 ? (
            <nav className="pg" aria-label="Inventory pages">
              <button
                type="button"
                className="pgb"
                aria-label="Previous page"
                disabled={current === 1}
                onClick={() => goPage(current - 1)}
              >
                Prev
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="pgb"
                  aria-label={`Page ${n}`}
                  aria-current={n === current ? "page" : undefined}
                  onClick={() => goPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="pgb"
                aria-label="Next page"
                disabled={current === pageCount}
                onClick={() => goPage(current + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
          <div className="more">
            <a className="btn" id="allBtn" href="/inventory">
              Show all {cars.length} cars
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
