"use client";

import { useEffect, useState } from "react";

// The reference nav ticker (truespec.html startTicker): one line at a time,
// out-left / in-right every 3.8s. Reduced motion shows the first line only.
const ICONS = ["fa-ship", "fa-clock", "fa-arrow-trend-down", "fa-circle-check"];

export function Ticker({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (lines.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setOut(true);
      window.setTimeout(() => {
        setI((k) => (k + 1) % lines.length);
        setOut(false);
      }, 550);
    }, 3800);
    return () => window.clearInterval(id);
  }, [lines.length]);

  return (
    <div className="tick" id="tick" aria-live="off">
      {lines.map((text, k) => (
        <span key={k} className={k === i ? (out ? "out" : "on") : ""}>
          <i className={`fa-solid ${ICONS[k % 4]}`} />
          {text}
        </span>
      ))}
    </div>
  );
}
