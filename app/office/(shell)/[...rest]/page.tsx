import { notFound } from 'next/navigation';
import { requireOfficeSession } from '@/lib/session';

/* Every `/office/…` address that matches no real screen: a mistyped address, a stale link.
 *
 * It exists as a **route** because an unmatched path never descends into a route group: without
 * this page, `/office/nonsense` stops at the root not-found — the showroom's words, the showroom's
 * shape, no office chrome — before the shell's session check even runs. Matching the address here
 * puts it through the door and the shell, and the `not-found.tsx` beside it answers with the
 * office's own view (design I28; `notes/TASK-005-task9.md`).
 *
 * It renders nothing: it throws, like any page whose subject is missing.
 */
export default async function UnknownOfficeAddress() {
  // The door first, like every office page — a layout is never a substitute.
  await requireOfficeSession();
  notFound();
}
