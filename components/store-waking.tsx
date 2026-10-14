import { STORE_STATE_CSS } from "./store-state-styles";

/**
 * The wait while the store wakes (design D18).
 *
 * Shown as the `loading.tsx` fallback for a segment whose server render is still in flight. On a cold
 * store that render is genuinely slow — Neon's Free plan suspends the compute after 5 minutes idle,
 * and the guard in `lib/store-guard.ts` retries until it answers — so this is what the person sees
 * during that window instead of a blank page or a crash.
 *
 * It fades in after a short delay rather than appearing at once: a warm store answers in well under
 * that delay, and a flash of "setting things up" on every single page load would itself look broken.
 * Nothing is reserved away before then — the fallback occupies the viewport either way, so there is
 * no jump when the real page arrives.
 *
 * A server component on purpose: it must render without any client JavaScript.
 */
export function StoreWaking() {
  return (
    <div className="ts-store-state ts-store-state--waking" role="status" aria-live="polite">
      <style>{STORE_STATE_CSS}</style>
      <div className="ts-store-state__panel">
        <span className="ts-store-state__spinner" aria-hidden="true" />
        <p className="ts-store-state__title">Just a moment</p>
        <p className="ts-store-state__note">
          Setting things up — this can take a few seconds after a quiet spell.
        </p>
      </div>
    </div>
  );
}
