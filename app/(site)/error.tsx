"use client";

import { Retryable } from "@/components/retryable";

// A page under the showroom shell failed its own read. This boundary sits *inside* the shell, so
// the header and footer stay and the retry appears where the person is. It cannot catch a throw
// from `(site)/layout.tsx` itself (a boundary never catches its own segment's layout) — that case
// still belongs to `app/error.tsx`, which stays where it is.
export default function ShowroomError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <Retryable onRetry={reset} />;
}
