import "./settings.css";
import { getOfficeCars } from "@/lib/office";
import { Settings } from "./settings-client";

// The cars come from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* Settings — the four site-wide cards plus the two state editors, swapped in
   place by the left sub-menu (ui-plan Q58). The editors are UI-only, but the
   car-state counts are the office's own rows, so this route reads them (as
   inventory does) and hands the counts to the client. Nothing is stored. */

export default async function SettingsPage() {
  const cars = await getOfficeCars();
  const carCounts: Record<string, number> = {};
  for (const c of cars) {
    if (c.sold_at !== null) continue; // a sold car is rendered as "Sold", not its old state
    carCounts[c.state] = (carCounts[c.state] ?? 0) + 1;
  }

  return <Settings carCounts={carCounts} />;
}
