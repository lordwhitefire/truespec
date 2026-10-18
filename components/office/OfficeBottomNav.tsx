"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreSheet } from "./MoreSheet";

// Mobile bottom bar (≤820px). Four destinations plus the More cell: Drafts, Activity log and
// Settings are reached through the sheet, in the sidebar's order and words (Task 20). The
// current page carries the `.on` class; the More cell lights on all three paths it reaches (not
// only while the sheet is open). "Add" opens the add form; `match` keeps it lit on a per-car edit
// page too.
const items: { href: string; label: string; icon: string; match?: string }[] = [
  { href: "/office", label: "Home", icon: "fa-chart-pie" },
  { href: "/office/inventory", label: "Stock", icon: "fa-car-side" },
  { href: "/office/car/new", match: "/office/car", label: "Add", icon: "fa-plus" },
  { href: "/office/enquiries", label: "Chats", icon: "fa-comments" },
];

// The More sheet's destinations — the one place the list lives; `MoreSheet.tsx` renders it.
const morePaths = ["/office/drafts", "/office/activity", "/office/settings"];

export function OfficeBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const onMore = morePaths.some((h) => pathname.startsWith(h));
  return (
    <>
      <nav className="bnav" aria-label="Office (mobile)">
        {items.map((it) => {
          const on =
            it.href === "/office"
              ? pathname === "/office"
              : pathname.startsWith(it.match ?? it.href);
          return (
            <Link key={it.href} href={it.href} className={on ? "on" : undefined}>
              <i className={`fa-solid ${it.icon}`} />
              {it.label}
            </Link>
          );
        })}
        <button
          type="button"
          className={moreOpen || onMore ? "on" : undefined}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-controls="more-sheet"
          onClick={() => setMoreOpen(true)}
        >
          {/* "More things", not Settings — a gear here read as the settings destination. */}
          <i className="fa-solid fa-ellipsis" />
          More
        </button>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
