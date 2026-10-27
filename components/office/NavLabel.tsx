'use client';

import { useLinkStatus } from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * The waiting sign for a soft navigation (Task 33; approved copy "Loading…").
 *
 * `useLinkStatus` may only be read inside a `<Link>` — the context is opened in `Link` and wraps
 * only that link's subtree. The sign waits 400 ms before it appears, so a fast (usually
 * prefetched) navigation never flashes it; while it is up its clock is the navigation's own
 * pending state, not a timer. The link keeps its destination as its accessible name through
 * `aria-label` on the caller; the status text is announced once when it appears.
 */
export function NavLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShow(false);
      return;
    }
    const id = window.setTimeout(() => setShow(true), 400);
    return () => window.clearTimeout(id);
  }, [pending]);

  if (!show) return <>{children}</>;
  return (
    <span className="nav-wait" role="status">
      <span className="nav-wait__spin" aria-hidden="true" />
      Loading…
    </span>
  );
}
