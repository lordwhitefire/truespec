'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavLabel } from './NavLabel';

// Sidebar nav (desktop). The current page carries the reference's `.on` class.
// "Add / edit car" opens the add form (`/office/car/new`); `match` keeps it lit on a
// per-car edit page too (`/office/car/<ref>`).
//
// The nav is destinations only. The WhatsApp tap notice is not a nav row — the owner rejected that
// ("you putting it in the nav bar is complicating matters") and it lives in the shell instead, as a
// notification badge: the topbar on a phone, the account footer on desktop (`TapNotice.tsx`).
const items: { href: string; label: string; icon: string; match?: string }[] = [
  { href: '/office', label: 'Dashboard', icon: 'fa-chart-pie' },
  { href: '/office/inventory', label: 'Inventory', icon: 'fa-car-side' },
  { href: '/office/car/new', match: '/office/car', label: 'Add / edit car', icon: 'fa-plus' },
  { href: '/office/enquiries', label: 'Enquiries', icon: 'fa-comments' },
  { href: '/office/drafts', label: 'Drafts', icon: 'fa-inbox' },
  { href: '/office/activity', label: 'Activity log', icon: 'fa-list-check' },
  { href: '/office/settings', label: 'Settings', icon: 'fa-gear' },
];

export function OfficeNav() {
  const pathname = usePathname();
  return (
    <nav className="sn" aria-label="Office">
      {items.map((it) => {
        const on =
          it.href === '/office' ? pathname === '/office' : pathname.startsWith(it.match ?? it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={on ? 'on' : undefined}
            aria-label={it.label}
            aria-current={on ? 'page' : undefined}
          >
            <i className={`fa-solid ${it.icon}`} />
            <NavLabel>{it.label}</NavLabel>
          </Link>
        );
      })}
    </nav>
  );
}
