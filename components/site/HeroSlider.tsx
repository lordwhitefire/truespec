"use client";

import { useEffect, useState } from "react";
import type { PublicCar } from "@/lib/serialize";
import { carHref, heroPrice } from "./car-view";

// The reference hero (HS = available cars, dearest first, top 3), auto-rotating.
export function HeroSlider({ cars }: { cars: PublicCar[] }) {
  const [k, setK] = useState(0);
  const n = cars.length;
  const go = (d: number) => setK((x) => ((x + d) % n + n) % n);

  useEffect(() => {
    if (n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setK((x) => (x + 1) % n), 5500);
    return () => window.clearInterval(id);
  }, [n]);

  if (n === 0) return null;

  return (
    <div className="hero" id="hero">
      <div className="hs" id="hs" style={{ transform: `translateX(-${k * 100}%)` }}>
        {cars.map((c, i) => (
          <div
            key={c.ref}
            className={`hsl${i === k ? " on" : ""}`}
            style={c.photos[0] ? { backgroundImage: `url(${c.photos[0]})` } : undefined}
          >
            <div className="w">
              <div className="ring">
                <a className="bdg" href={carHref(c)}>
                  <h2>
                    {c.year} {c.brand}
                    <br />
                    {c.model} {c.trim}
                  </h2>
                  <div className="num">
                    {heroPrice(c.priceKobo)}
                    <small>doorstep price</small>
                  </div>
                  <p>{c.arrivalNote || "Available now"}. Shipping, clearing and delivery included.</p>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="ha l" aria-label="Previous" onClick={() => go(-1)}>
        <i className="fa-solid fa-chevron-left" />
      </button>
      <button className="ha r" aria-label="Next" onClick={() => go(1)}>
        <i className="fa-solid fa-chevron-right" />
      </button>
      <div className="hdt" id="hdots">
        {cars.map((c, i) => (
          <button
            key={c.ref}
            type="button"
            className={i === k ? "on" : undefined}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setK(i)}
          />
        ))}
      </div>
    </div>
  );
}
