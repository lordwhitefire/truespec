import type { Metadata } from 'next';

/**
 * The one source for the public site's identity.
 *
 * The canonical host lives here and nowhere else. Pages pass a path; this module makes it absolute.
 * Keeping the origin in one place is what stops a canonical URL or a social card from drifting to a
 * preview host or a relative path.
 */
export const SITE_ORIGIN = 'https://truespec-k4y6.vercel.app';
export const SITE_NAME = 'TrueSpec Automotive';
export const SITE_TITLE = 'TrueSpec — cars you can trust';
export const SITE_DESCRIPTION =
  'A Nigerian vehicle-import showroom: browse available, on-order and landed cars, judge each one completely, and buy through WhatsApp with one doorstep price.';

/** The generated default card at `app/opengraph-image.tsx`. */
export const DEFAULT_OG_IMAGE = '/opengraph-image';
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

/** The canonical origin as a URL object, for Next's `metadataBase`. */
export const SITE_URL = new URL(SITE_ORIGIN);

/**
 * Last-updated and reviewed date for public legal pages. Moves with the owner's approval date —
 * privacy's own record is updated by Task 14; terms records its own.
 */
export const TERMS_LAST_UPDATED = '27 October 2026';
export const TERMS_LAST_UPDATED_ISO = '2026-10-27';

/**
 * Last-updated and reviewed date for the privacy notice. Moves when the privacy page changes.
 */
export const PRIVACY_LAST_UPDATED = '27 October 2026';
export const PRIVACY_LAST_UPDATED_ISO = '2026-10-27';

/**
 * Turn a route path or an already-absolute image URL into an absolute URL on the canonical origin.
 * A leading slash is optional; query strings and hashes are preserved.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, SITE_ORIGIN).toString();
}

/** Append the brand once. A title that already carries it is left alone. */
export function titleWithBrand(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return SITE_TITLE;
  if (trimmed === SITE_TITLE || trimmed.includes(SITE_NAME)) return trimmed;
  return `${trimmed} | ${SITE_NAME}`;
}

export type PageMetadataInput = {
  /** The page title without the brand, or the full site title for the home page. */
  title: string;
  description?: string;
  /** The canonical route path, e.g. `/inventory`. Filtered URLs must pass the unfiltered path. */
  path: string;
  /** An absolute image URL (e.g. a Sanity cover) or a root-relative path. Defaults to the site card. */
  image?: string;
  imageAlt?: string;
  /** The image MIME type. Defaults to `image/png` only for the generated card. */
  imageType?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  /** Use the title exactly as given; for the home page, which already carries the brand. */
  absoluteTitle?: boolean;
};

/**
 * The shared metadata shape for every public page. The canonical and social URLs are absolute, and
 * the default image is the generated card. Callers own the unique title and description.
 */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const title = input.absoluteTitle ? input.title : titleWithBrand(input.title);
  const description = input.description?.trim() || SITE_DESCRIPTION;
  const canonical = absoluteUrl(input.path);
  const image = absoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const imageAlt = input.imageAlt || `${SITE_NAME} — ${input.title}`;
  const imageType = input.imageType ?? (input.image ? undefined : 'image/png');

  return {
    title,
    description,
    alternates: {
      canonical,
      types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_NG',
      type: input.type ?? 'website',
      images: [
        {
          url: image,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: imageAlt,
          ...(imageType ? { type: imageType } : {}),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
