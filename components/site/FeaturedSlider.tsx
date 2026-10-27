'use client';

import { useEffect, useState } from 'react';
import type { PublicCar } from '@/lib/serialize';
import { ReferenceCard } from './ReferenceCard';

// The reference featured slider (feat = available; 1/2/3 per row by width).
export function FeaturedSlider({ cars }: { cars: PublicCar[] }) {
  const [per, setPer] = useState(3);
  const [fs, setFs] = useState(0);

  useEffect(() => {
    // window.innerWidth is unreliable on phones: when page content overflows, Chrome expands
    // the layout viewport to the content width and innerWidth reports the expanded value
    // (492 on a 375 screen). The document's own client width stays the device width.
    const calc = () => {
      const w = document.documentElement.clientWidth || window.innerWidth;
      setPer(w < 560 ? 1 : w < 1000 ? 2 : 3);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const max = Math.max(0, cars.length - per);
  const start = Math.min(fs, max);
  // Always render the widest window; CSS shows 1, 2 or 3 at the breakpoints. Keeping the card DOM
  // stable through hydration means the strip's height does not change when `per` settles.
  const shown = cars.slice(start, start + 3);

  return (
    <div className="sp">
      <div className="w">
        <div className="st">
          <h2>Featured cars</h2>
          <a href="#cars">
            <i className="fa-solid fa-tag" />
            All available
          </a>
        </div>
        <div className="sl dkc" id="sl">
          {shown.map((c) => (
            <ReferenceCard key={c.ref} car={c} dark sized={{ width: 700, height: 400 }} />
          ))}
        </div>
        <div className="nv">
          <button onClick={() => setFs(Math.max(0, start - 1))} aria-label="Previous">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <div className="dts" id="dts">
            {Array.from({ length: max + 1 }, (_, i) => (
              <i key={i} className={i === start ? 'on' : undefined} />
            ))}
          </div>
          <button onClick={() => setFs(Math.min(max, start + 1))} aria-label="Next">
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>
    </div>
  );
}
