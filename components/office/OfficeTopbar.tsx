"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TapNotice } from "./TapNotice";

// The office topbar (mobile shell). Which icon it carries depends on the route:
//   /office/settings → dashboard
//   any other office route (dashboard, inventory, car, enquiries, activity) → settings
//
// The dead search placeholder is gone (Task 18): search lives where it filters — the keyword
// fields on Inventory and Activity, not a control here that did nothing.
//
// The WhatsApp tap notice is the **last** icon on **every** office route (Designer ruling 2):
// the top-right corner is where a notification icon belongs, and a notice that showed on only some
// screens would not be one. It is drawn here and, for desktop, in the sidebar footer — CSS reveals
// exactly the one that fits the width, from the one server-read count.
export function OfficeTopbar({ tapCount = 0 }: { tapCount?: number }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <span className="lg">
        <i className="fa-solid fa-gauge-high" />
        TrueSpec <span style={{ color: "var(--gold)" }}>Office</span>
      </span>
      <span className="sp" />
      {pathname === "/office/settings" ? (
        <Link className="ico" href="/office" aria-label="Dashboard">
          <i className="fa-solid fa-chart-pie" />
        </Link>
      ) : (
        <Link className="ico" href="/office/settings" aria-label="Settings">
          <i className="fa-solid fa-gear" />
        </Link>
      )}
      <TapNotice className="ico" count={tapCount} />
    </header>
  );
}
