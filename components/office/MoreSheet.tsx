'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog } from './Dialog';
import './MoreSheet.css';

// The More cell's three destinations (Task 20) — the sidebar's order and the sidebar's words
// (`OfficeNav.tsx`): Drafts, Activity log, Settings. Everything else the sidebar carries already
// has a cell of its own in the bottom bar; these three do not, and the More cell is where a
// phone reaches them.
//
// The sheet is the platform's modal (`Dialog`, Task 13): it takes focus, returns it to the cell
// on close, and Escape is the platform's. It is navigation, not a confirmation, so an outside
// tap closes it (Task 16's opt-in). A choice closes it too — the link navigates and the sheet
// goes with it.
const destinations: { href: string; label: string; icon: string }[] = [
  { href: '/office/drafts', label: 'Drafts', icon: 'fa-inbox' },
  { href: '/office/activity', label: 'Activity log', icon: 'fa-list-check' },
  { href: '/office/settings', label: 'Settings', icon: 'fa-gear' },
];

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      id="more-sheet"
      labelledBy="more-sheet-h"
      dismissOnBackdrop
    >
      <div className="msheet">
        <h2 id="more-sheet-h">More</h2>
        <nav aria-label="More (office)">
          {destinations.map((d) => {
            const current = pathname.startsWith(d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                onClick={onClose}
                aria-current={current ? 'page' : undefined}
                className={current ? 'on' : undefined}
              >
                <i className={`fa-solid ${d.icon}`} />
                {d.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </Dialog>
  );
}
