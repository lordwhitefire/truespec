/**
 * A display-size derivative of a Sanity CDN address. The stored asset stays the original; this is
 * the URL the browser fetches for a known slot. Non-Sanity addresses are returned unchanged.
 *
 * Kept in its own module so a client component can size a card image without pulling the whole
 * public-car serializer into its bundle.
 */
export function sizedPhotoUrl(url: string, width: number, height: number): string {
  if (!url.startsWith('https://cdn.sanity.io/')) return url;
  const sized = new URL(url);
  sized.searchParams.set('w', String(width));
  sized.searchParams.set('h', String(height));
  sized.searchParams.set('fit', 'crop');
  sized.searchParams.set('auto', 'format');
  sized.searchParams.set('q', '75');
  return sized.toString();
}

/**
 * The car gallery's responsive candidates: 640/960/1440 wide at the gallery's 5:3 crop.
 *
 * The page pairs this with a `sizes` value; the browser then picks the smallest candidate that
 * covers the slot instead of downloading the original upload. The same string is used when the
 * gallery steps to another photo, so a thumb click cannot fall back to an unsized address.
 */
export function carGallerySrcSet(url: string): string {
  return [640, 960, 1440]
    .map((width) => `${sizedPhotoUrl(url, width, Math.round(width * 0.6))} ${width}w`)
    .join(', ');
}
