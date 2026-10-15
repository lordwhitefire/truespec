import "./settings.css";
import { getCarStateRegistry, getEnquiryStateRegistry } from "@/lib/office";
import { readNotices, readSettings } from "@/lib/settings";
import { buildNotices } from "@/lib/notices";
import { requireOfficeSession } from "@/lib/session";
import { Settings } from "./settings-client";

// The registries and the three settings come from the store, so this page renders per request —
// never from a build-time snapshot of them.
export const dynamic = "force-dynamic";

/* Settings — the four site-wide cards plus the two state editors, swapped in place
   by the left sub-menu (ui-plan Q58). Both editors are the owner's registries: read
   from the store here, written back to it through `app/office/actions/state.ts` (a
   car's states) and `app/office/actions/enquiry.ts` (an enquiry's), with the count
   beside each state straight from the store's own rows.
   The three settings are read here too (truth 12) and written back through
   `app/office/actions/setting.ts`, so the cards show what the store holds rather than
   a literal — and an audit line can say when the store last changed.
   The two operational notices (D19) are read here as well and decided by `lib/notices.ts`,
   on the server, so the office's own clock is the one the notice is built from. */

export default async function SettingsPage() {
  await requireOfficeSession();
  const [registry, enquiryRegistry, settings, noticeRows] = await Promise.all([
    getCarStateRegistry(),
    getEnquiryStateRegistry(),
    readSettings(),
    readNotices(),
  ]);
  const notices = buildNotices(noticeRows, new Date());

  return (
    <Settings registry={registry} enquiryRegistry={enquiryRegistry} settings={settings} notices={notices} />
  );
}
