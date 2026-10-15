"use client";

import { useState } from "react";

import { Photo } from "@/components/Photo";

// Swipeable gallery; arrows additionally on laptop (specs/showroom).
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = photos.length;
  const src = photos[index] ?? "";

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="gallery"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      <div className="stage">
        {src ? (
          <Photo src={src} alt={`${alt} — photo ${index + 1}`} />
        ) : (
          <div className="empty" style={{ display: "grid", placeItems: "center", height: "100%" }}>
            No photo
          </div>
        )}
        {count > 1 ? (
          <>
            <button className="arrow prev" aria-label="Previous photo" onClick={() => go(-1)}>
              ‹
            </button>
            <button className="arrow next" aria-label="Next photo" onClick={() => go(1)}>
              ›
            </button>
          </>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="thumbs">
          {photos.map((p, i) => (
            <Photo
              key={p}
              src={p}
              alt={`${alt} thumbnail ${i + 1}`}
              data-active={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
