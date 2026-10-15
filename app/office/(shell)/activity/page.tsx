import "./activity.css";
import { getOfficeActivity } from "@/lib/office";
import { toActivityEntries } from "@/lib/activity-feed";
import { requireOfficeSession } from "@/lib/session";
import { Activity } from "./activity-client";

// The log is the store's rows, so this page renders per request — never from a build-time snapshot.
export const dynamic = "force-dynamic";

/* Activity log — the office's own record, from `activity_event` (truth 15, D20).

   The day and the time are put on the rows here, in UTC, by the one rule (`lib/activity-feed.ts`,
   over `lib/office-time.ts`): a screen that formatted them itself would disagree with the server it
   was rendered on — and the dashboard's panel words and times its rows with that same rule.
   The feed is read newest first and bounded (200 rows), which is the read's own limit, not a page's. */

export default async function ActivityPage() {
  await requireOfficeSession();
  const entries = await getOfficeActivity();

  return <Activity entries={toActivityEntries(entries, new Date())} />;
}
