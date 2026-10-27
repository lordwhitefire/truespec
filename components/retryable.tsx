'use client';

import { STORE_STATE_CSS } from './store-state-styles';

/**
 * The retryable state (design D18; truth 16) — what a page shows when the store could not be reached
 * even after every retry.
 *
 * This is the honest half of the pair. The wait says "almost there"; this says "we tried and it did
 * not answer", and offers the one action that can help. It never renders a figure, a count or an
 * empty list: a store that could not be read is reported as unread, never as empty (truth 16 —
 * "never an invented number, never a silently empty list that reads as real emptiness").
 *
 * A client component because the recovery is a button, and the recovery it calls is the boundary's
 * own `reset()` — re-render the segment and try the read again.
 */
export function Retryable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="ts-store-state" role="alert">
      <style>{STORE_STATE_CSS}</style>
      <div className="ts-store-state__panel">
        <p className="ts-store-state__title">We couldn’t load this</p>
        <p className="ts-store-state__note">
          We tried a few times but the server didn’t answer. Nothing was lost — please try again.
        </p>
        <button type="button" className="ts-store-state__button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
