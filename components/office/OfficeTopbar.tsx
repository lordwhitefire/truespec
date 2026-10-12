"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The office topbar (mobile shell). Which icon it carries depends on the route,
// matching the reference screens exactly:
//   /office          → search (UI placeholder) + settings
//   /office/settings → dashboard
//   any other office route (inventory, car, enquiries, activity) → settings
export function OfficeTopbar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <span className="lg">
        <i className="fa-solid fa-gauge-high" />
        TrueSpec <span style={{ color: "var(--gold)" }}>Office</span>
      </span>
      <span className="sp" />
      {pathname === "/office" ? (
        <>
          <button className="ico" type="button" aria-label="Search (UI placeholder)">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
          <Link className="ico" href="/office/settings" aria-label="Settings">
            <i className="fa-solid fa-gear" />
          </Link>
        </>
      ) : pathname === "/office/settings" ? (
        <Link className="ico" href="/office" aria-label="Dashboard">
          <i className="fa-solid fa-chart-pie" />
        </Link>
      ) : (
        <Link className="ico" href="/office/settings" aria-label="Settings">
          <i className="fa-solid fa-gear" />
        </Link>
      )}
    </header>
  );
}