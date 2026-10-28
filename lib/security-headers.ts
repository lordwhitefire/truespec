/**
 * Security headers for the TrueSpec public site.
 *
 * One header configuration for content-type, framing, referrer, permissions and transport
 * security, plus a CSP that accounts for Clerk, Sanity images, self-hosted fonts and local Font
 * Awesome. Nothing else is a named source.
 *
 * The CSP starts report-only and is enforced only after the local public + anonymous-office
 * exercise shows no violations (Task 16). `useReportOnly` selects the header name; the directive
 * body is identical either way so enforcing is a one-line flip.
 *
 * Clerk instance (observed at runtime): https://singular-sawfish-8907.clerk.accounts.dev
 * Clerk bot/abuse protection (Clerk's required CSP sources): https://*.protect.clerk.com
 * and https://challenges.cloudflare.com. The protect hosts are served on non-443 ports, so
 * `connect-src` needs the trailing `:*` (a source with no port matches 443 only).
 * Sanity images: https://cdn.sanity.io
 * Fonts: self-hosted via next/font (no Google Fonts request)
 * Font Awesome: local (no cdnjs request)
 */

const CLERK_DOMAIN = 'https://singular-sawfish-8907.clerk.accounts.dev';
const CLERK_PROTECT_DOMAIN = 'https://*.protect.clerk.com';
const CLERK_CHALLENGE_DOMAIN = 'https://challenges.cloudflare.com';
const SANITY_DOMAIN = 'https://cdn.sanity.io';
const CLERK_IMG_DOMAIN = 'https://img.clerk.com';
const UNSPLASH_DOMAIN = 'https://images.unsplash.com';

/**
 * Build the CSP directive body. Identical for report-only and enforcing; only the header name
 * changes (see `securityHeaders`).
 */
export function cspDirective(): string {
  return [
    "default-src 'self'",
    // Clerk SDK + UI scripts; bot/abuse protection; Next.js and Clerk inject inline scripts
    // (documented trade-off)
    `script-src 'self' 'unsafe-inline' ${CLERK_DOMAIN} ${CLERK_PROTECT_DOMAIN} ${CLERK_CHALLENGE_DOMAIN}`,
    // Clerk injects inline styles; fonts/icons are self-hosted
    "style-src 'self' 'unsafe-inline'",
    // Sanity cover images; Clerk brand images; Unsplash design backgrounds; data: for placeholders
    `img-src 'self' ${SANITY_DOMAIN} ${CLERK_IMG_DOMAIN} ${UNSPLASH_DOMAIN} data:`,
    // Clerk API + bot/abuse protection (non-443 ports) + Sanity asset fetches
    `connect-src 'self' ${CLERK_DOMAIN} ${CLERK_PROTECT_DOMAIN}:* ${SANITY_DOMAIN}`,
    // Clerk sign-in / account frames + bot/abuse protection challenge frames
    `frame-src ${CLERK_DOMAIN} ${CLERK_PROTECT_DOMAIN} ${CLERK_CHALLENGE_DOMAIN}`,
    // Clerk web workers run from blob URLs
    "worker-src 'self' blob:",
    // Self-hosted fonts only (no Google Fonts, no cdnjs)
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Security headers applied to every response.
 *
 * @param useReportOnly - true sends Content-Security-Policy-Report-Only (exercise phase);
 *   false sends Content-Security-Policy (enforcing phase).
 */
export function securityHeaders(useReportOnly: boolean): Record<string, string> {
  const cspName = useReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    [cspName]: cspDirective(),
  };
}
