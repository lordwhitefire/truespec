"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { PhotoBox } from "./PhotoBox";

/**
 * The one image the showroom and the office draw (truth 7).
 *
 * A car's photo is a Sanity asset, and an asset can be **missing** — removed from the store, or on a
 * CDN that is briefly unreachable. Truth 7: "when an asset is missing or the asset store is briefly
 * unreachable, the page renders the placeholder rather than breaking." A raw `<img>` cannot do that:
 * it draws the browser's broken-image icon and moves on. So every photo goes through here, and the
 * failure is caught at the only place it is visible — the element that tried to load it: an error
 * after hydration arrives through `onError`, and one that already happened *before* hydration is
 * read off the element itself — a finished load with no pixels (`complete && naturalWidth === 0`,
 * DR6; the case that kept the browser's broken icon on the showroom's cards and thumbnails).
 *
 * The placeholder is a drawn stand-in, not a blank: an inline SVG (`data:` address, so it needs no
 * network and can never itself fail) on the same grey as the rest of the surface. It is used when
 * the address is empty as well as when the load fails — an empty `src` is not "no image", it is
 * "reload this whole page", which is worse than a placeholder.
 *
 * A slot that stands inside a drawn box (`boxRef` — the car page's gallery) renders differently:
 * the box (a per-car gradient, D7/E2) is painted behind it, so when the address is empty or the
 * load failed the image stays transparent and silent (`alt=""`) and the box shows through — and
 * when a photo does load, the photo paints over the box.
 *
 * The element stays an `<img>` in every case, with the same attributes it was given, so the layouts
 * and styles around it (`.th img`, the gallery's `#gi`) are untouched — only what it shows changes.
 */

/** The drawn stand-in: an inline SVG, so it renders with no request and cannot 404. */
export const PHOTO_PLACEHOLDER =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">` +
      `<rect width="400" height="300" fill="#eef0f2"/>` +
      `<g fill="none" stroke="#c2c8ce" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M84 191h232"/>` +
      `<path d="M116 191l24-56h120l24 56"/>` +
      `<circle cx="152" cy="197" r="17"/>` +
      `<circle cx="248" cy="197" r="17"/>` +
      `</g>` +
      `</svg>`,
  );

export type PhotoProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** The address the server derived from the asset reference. Empty means "show the placeholder". */
  src?: string;
  /** What the picture is, for a screen reader — required, because the placeholder must still be named. */
  alt: string;
  /**
   * The reference code of the car this slot belongs to. When set, the drawn box (a per-car
   * gradient, D7/E2) is rendered behind the slot, and boxed states (no address, or a failed load)
   * leave the image transparent and unannounced so the box shows through.
   */
  boxRef?: string;
};

export function Photo({ src, alt, boxRef, onError, ...rest }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLImageElement | null>(null);

  // A load that failed *before* hydration leaves no event behind (measured: error events fired
  // into a document with no listener, and nothing swapped). Its outcome is still visible on the
  // element: the load finished and produced no pixels (DR6). Checked once after mount — a
  // still-loading image is untouched, and a later failure still arrives through `onError` below.
  useEffect(() => {
    const im = el.current;
    if (im && im.complete && im.naturalWidth === 0) setFailed(true);
  }, []);

  const boxed = !src || failed;
  const shown = boxed ? (boxRef ? undefined : PHOTO_PLACEHOLDER) : src;

  return (
    <>
      {boxRef ? <PhotoBox refCode={boxRef} /> : null}
      <img
        {...rest}
        ref={el}
        src={shown}
        // The boxed slot inside a drawn box is decorative — the car's name is already beside it (E2).
        alt={boxed && boxRef ? "" : alt}
        // Once shown, the placeholder is sticky: swapping back to a source that is already known to
        // fail would only flicker the broken icon again.
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
      />
    </>
  );
}
