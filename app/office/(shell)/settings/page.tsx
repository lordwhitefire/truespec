import "./settings.css";
import { getCarStateRegistry, getEnquiryStateRegistry } from "@/lib/office";
import { requireOfficeSession } from "@/lib/session";
import { Settings } from "./settings-client";

// The registries come from the store, so this page renders per request — never from a build-time
// snapshot of them.
export const dynamic = "force-dynamic";

/* Settings — the four site-wide cards plus the two state editors, swapped in place
   by the left sub-menu (ui-plan Q58). Both editors are the owner's registries: read
   from the store here, written back to it through `app/office/actions/state.ts` (a
   car's states) and `app/office/actions/enquiry.ts` (an enquiry's), with the count
   beside each state straight from the store's own rows. */

export default async function SettingsPage() {
  await requireOfficeSession();
  const [registry, enquiryRegistry] = await Promise.all([
    getCarStateRegistry(),
    getEnquiryStateRegistry(),
  ]);

  return <Settings registry={registry} enquiryRegistry={enquiryRegistry} />;
}
