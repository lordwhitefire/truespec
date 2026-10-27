'use client';

import { Retryable } from '@/components/retryable';
import './office.css';

// A page inside the office shell failed its own read. The boundary lives in the same segment as
// the shell, so the sidebar, top bar and signed-in identity stay, and the retry lands in the
// content area. It cannot catch a throw from `(shell)/layout.tsx` itself (the session check) —
// that case still belongs to `app/office/error.tsx`, which stays where it is. The shell layout
// imports no stylesheet of its own, so the boundary imports the shell's, as the not-found boundary
// does.
export default function OfficeShellError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <Retryable onRetry={reset} />;
}
