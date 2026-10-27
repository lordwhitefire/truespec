/**
 * The styles for both store states (design D18) — the wait and the retry.
 *
 * Kept as one string rendered into a `<style>` element rather than a stylesheet import, because the
 * root `app/loading.tsx` fallback is streamed *before* the layout it wraps (`app/(site)/layout.tsx`)
 * has resolved — and that layout is where `globals.css` and `reference.css` are imported from. A
 * stylesheet import could therefore arrive too late to style the very first paint, which is exactly
 * the paint this exists for.
 *
 * Colours are stated directly rather than through the site's custom properties for the same reason:
 * those properties are defined in the stylesheets that may not have loaded yet. Both themes are
 * honoured off `html[data-theme]`, which the root layout's inline script sets before first paint.
 */
export const STORE_STATE_CSS = `
.ts-store-state{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:2rem;
  background:#0b0b0c;color:#f4f4f5;text-align:center;
  font-family:var(--font-body),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
html[data-theme="light"] .ts-store-state{background:#ffffff;color:#18181b}
.ts-store-state__panel{display:grid;justify-items:center;gap:.75rem;max-width:24rem}
.ts-store-state__title{margin:0;font-size:1.05rem;font-weight:600}
.ts-store-state__note{margin:0;font-size:.92rem;line-height:1.55;opacity:.7}
.ts-store-state--waking{opacity:0;animation:ts-store-in .35s ease .45s forwards}
@keyframes ts-store-in{to{opacity:1}}
.ts-store-state__spinner{width:2rem;height:2rem;border-radius:50%;border:2px solid currentColor;
  border-top-color:transparent;opacity:.55;animation:ts-store-spin .8s linear infinite}
@keyframes ts-store-spin{to{transform:rotate(360deg)}}
.ts-store-state__button{margin-top:.5rem;border:1px solid currentColor;background:transparent;
  color:inherit;font:inherit;font-weight:600;padding:.6rem 1.2rem;border-radius:.6rem;cursor:pointer}
.ts-store-state__button:hover{opacity:.85}
.ts-store-state__button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .ts-store-state--waking{animation-delay:0s}
  .ts-store-state__spinner{animation-duration:2.4s}
}
`;
