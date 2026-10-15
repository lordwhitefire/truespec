import "./settings.css";
import { getCarStateRegistry } from "@/lib/office";
import { requireOfficeSession } from "@/lib/session";
import { Settings } from "./settings-client";

// The registry comes from the store, so this page renders per request — never from a build-time
// snapshot of it.
export const dynamic = "force-dynamic";

/* Settings — the four site-wide cards plus the two state editors, swapped in place
   by the left sub-menu (ui-plan Q58). The car-state editor is the owner's registry:
   read from the store here, written back to it through `app/office/actions/state.ts`,
   with the count beside each state straight from the store's own rows. */

export default async function SettingsPage() {
  await requireOfficeSession();
  const registry = await getCarStateRegistry();

  return <Settings registry={registry} />;
}
