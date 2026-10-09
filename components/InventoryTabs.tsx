"use client";

import { useState } from "react";
import { CarCard } from "./CarCard";
import type { PublicCar } from "@/lib/serialize";
import type { StockCounts } from "@/lib/counts";

type TabId = "available" | "on order" | "landed";

export function InventoryTabs({ cars, counts }: { cars: PublicCar[]; counts: StockCounts }) {
  const [tab, setTab] = useState<TabId>("available");

  const availableCars = cars.filter((c) => c.section === "available");
  const landedCars = cars.filter((c) => c.section === "landed" && c.isNewArrival);
  const onOrderCars = cars.filter((c) => c.section === "on order");
  const allLanded = cars.filter((c) => c.section === "landed");

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "available", label: "Available", count: counts.available },
    { id: "on order", label: "On Order", count: counts.onOrder },
    { id: "landed", label: "Landed", count: counts.landed },
  ];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Showroom sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="count">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "available" ? (
        <>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Available</h2>
            {counts.newArrivals > 0 ? (
              <span className="note">of which {counts.newArrivals} new arrivals</span>
            ) : null}
          </div>
          <div className="grid">
            {availableCars.map((c) => (
              <CarCard key={c.ref} car={c} variant="available" />
            ))}
            {landedCars.map((c) => (
              <CarCard key={c.ref} car={c} variant="landed" />
            ))}
          </div>
        </>
      ) : null}

      {tab === "on order" ? (
        <>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>On Order</h2>
          </div>
          <div className="grid">
            {onOrderCars.map((c) => (
              <CarCard key={c.ref} car={c} variant="on order" />
            ))}
          </div>
        </>
      ) : null}

      {tab === "landed" ? (
        <>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Landed</h2>
          </div>
          <div className="grid">
            {allLanded.map((c) => (
              <CarCard key={c.ref} car={c} variant="landed" />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
