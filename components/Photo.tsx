"use client";

import { useState, type ImgHTMLAttributes } from "react";

/**
 * The one image the showroom and the office draw (truth 7).
 *
 * A car's photo is a Sanity asset, and an asset can be **missing** — removed from the store, or on a
 * CDN that is briefly unreachable. Truth 7: "when an asset is missing or the asset store is briefly
 * unreachable, the page renders the placeholder rather than breaking." A raw `<img>` cannot do that:
 * it draws the browser's broken-image icon and moves on. So every photo goes through here, and the
 * failure is caught at the only place it is visible — the element that tried to load it.
 *
 * The placeholder is a drawn stand-in, not a blank: an inline SVG (`data:` address, so it needs no
 * network and can never itself fail) on the same grey as the rest of the surface. It is used when
 * the address is empty as well as when the load fails — an empty `src` is not "no image", it is
 * "reload this whole page", which is worse than a placeholder.
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
};

export function Photo({ src, alt, onError, ...rest }: PhotoProps) {
  const [failed, setFailed] = useState(false);
  const shown = !src || failed ? PHOTO_PLACEHOLDER : src;

  return (
    <img
      {...rest}
      src={shown}
      alt={alt}
      // Once shown, the placeholder is sticky: swapping back to a source that is already known to
      // fail would only flicker the broken icon again.
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
