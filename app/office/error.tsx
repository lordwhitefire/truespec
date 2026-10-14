"use client";

import { Retryable } from "@/components/retryable";

/**
 * The retryable state for the office (design D18; truth 16).
 *
 * Catches a throw from anywhere under `/office` that the closer boundaries do not — including the
 * `(shell)` layout's session check, which this segment wraps. One action: try the read again.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Retryable onRetry={reset} />;
}
