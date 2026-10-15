"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TapBadge } from "./TapBadge";

// Sidebar nav (desktop). The current page carries the reference's `.on` class.
// "Add / edit car" opens the add form (`/office/car/new`); `match` keeps it lit on a
// per-car edit page too (`/office/car/<ref>`).
//
// `tapCount` is the visitor's side of the story (truth 8): the office hears that a buyer
// tapped WhatsApp for a car by a count badge on the entry that leads to the recent-taps
// panel, and in no other way — never a popup, an alert or a sound.
const items: { href: string; label: string; icon: string; match?: string }[] = [
  { href: "/office", label: "Dashboard", icon: "fa-chart-pie" },
  { href: "/office/inventory", label: "Inventory", icon: "fa-car-side" },
  { href: "/office/car/new", match: "/office/car", label: "Add / edit car", icon: "fa-plus" },
  { href: "/office/enquiries", label: "Enquiries", icon: "fa-comments" },
  { href: "/office/activity", label: "Activity log", icon: "fa-list-check" },
  { href: "/office/settings", label: "Settings", icon: "fa-gear" },
];

export function OfficeNav({ tapCount = 0 }: { tapCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="sn" aria-label="Office">
      {items.map((it) => {
        const on =
          it.href === "/office" ? pathname === "/office" : pathname.startsWith(it.match ?? it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : undefined}>
            <i className={`fa-solid ${it.icon}`} />
            {it.label}
            {it.href === "/office" ? <TapBadge count={tapCount} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
