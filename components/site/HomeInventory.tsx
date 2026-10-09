"use client";

import { useEffect, useState } from "react";
import type { PublicCar, PublicSection } from "@/lib/serialize";
import { ReferenceCard } from "./ReferenceCard";
import { speak } from "./speak";
import { store } from "./store";

const newMsg = (n: number) =>
  `Here ${n === 1 ? "is the car" : "are the " + n + " cars"} that arrived since your last visit.`;

type TabId = "a" | "o" | "l";
const TABS: { id: TabId; label: string; section: PublicSection }[] = [
  { id: "a", label: "Available", section: "available" },
  { id: "o", label: "On order", section: "on order" },
  { id: "l", label: "Landed this year", section: "landed" },
];

type View = { type: "tab"; key: TabId } | { type: "new"; cars: PublicCar[] };

// The reference home inventory: tabs FILTER this grid in place (they do not
// navigate). Semantics copied from truespec.html listFor()/cntLabel():
//   Available    -> available + landed   "Available N ready · N landed"
//   On order     -> on-order cars        "On order N cars"
//   Landed       -> landed cars          "Landed N cars"
// "Show all" stays a link to /inventory.
export function HomeInventory({ cars, number }: { cars: PublicCar[]; number: string }) {
  const [view, setView] = useState<View>({ type: "tab", key: "a" });

  const available = cars.filter((c) => c.section === "available");
  const landed = cars.filter((c) => c.section === "landed");
  const buyable = [...available, ...landed];

  const list =
    view.type === "new"
      ? view.cars
      : view.key === "a"
        ? buyable
        : cars.filter((c) => c.section === TABS.find((t) => t.id === view.key)!.section);

  useEffect(() => {
    const onNew = () => {
      const known = store.get<string[] | null>("known", null);
      setView({ type: "new", cars: known ? cars.filter((c) => !known.includes(c.ref)) : [] });
    };
    window.addEventListener("ts-show-new", onNew);
    return () => window.removeEventListener("ts-show-new", onNew);
  }, [cars]);

  useEffect(() => {
    if (view.type === "new") speak(newMsg(view.cars.length));
  }, [view]);

  const activeTab = view.type === "tab" ? view.key : null;

  return (
    <>
      <div className="band" id="cars">
        <div className="w">
          <div className="hd">
            <h2>
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
                    Available <b>{available.length} ready</b> · <b>{landed.length} landed</b>
                  </>
                ) : (
                  <>
                    {activeTab === "o" ? "On order" : "Landed"} <b>{list.length} cars</b>
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
                onClick={() => setView({ type: "tab", key: t.id })}
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
              list.map((c) => <ReferenceCard key={c.ref} car={c} />)
            ) : (
              <div className="empty">
                <i className="fa-solid fa-magnifying-glass" />
                <p>Nothing here yet — tell me the car you&rsquo;re after and I&rsquo;ll source it in the USA.</p>
                <a
                  className="btn"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${number.replace(/\D/g, "")}`}
                >
                  <i className="fa-brands fa-whatsapp" />
                  Message me on WhatsApp
                </a>
              </div>
            )}
          </div>
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
