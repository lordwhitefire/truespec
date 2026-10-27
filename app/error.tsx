'use client';

import { Retryable } from '@/components/retryable';

/**
 * The retryable state for everything below the app root (design D18; truth 16).
 *
 * Reached when a server render throws and does not recover — including a store that stayed
 * unreachable through every retry. It is placed at the root, not beside `app/(site)/layout.tsx`,
 * because an error boundary does not catch the layout in its own segment: the public layout's store
 * read is caught here.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <Retryable onRetry={reset} />;
}
