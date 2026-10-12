"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Mobile bottom bar (≤820px). Five destinations; activity is not one of them
// (matches the reference). The current page carries the `.on` class.
const items = [
  { href: "/office", label: "Home", icon: "fa-chart-pie" },
  { href: "/office/inventory", label: "Stock", icon: "fa-car-side" },
  { href: "/office/car", label: "Add", icon: "fa-plus" },
  { href: "/office/enquiries", label: "Chats", icon: "fa-comments" },
  { href: "/office/settings", label: "More", icon: "fa-gear" },
];

export function OfficeBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bnav" aria-label="Office (mobile)">
      {items.map((it) => {
        const on = it.href === "/office" ? pathname === "/office" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : undefined}>
            <i className={`fa-solid ${it.icon}`} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
