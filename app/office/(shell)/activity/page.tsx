import "./activity.css";
import { getOfficeActivity } from "@/lib/office";
import { clock, dayKey, dayTitle, weekdayDay } from "@/lib/office-time";
import { requireOfficeSession } from "@/lib/session";
import { Activity } from "./activity-client";

// The log is the store's rows, so this page renders per request — never from a build-time snapshot.
export const dynamic = "force-dynamic";

/* Activity log — the office's own record, from `activity_event` (truth 15, D20).

   The day and the time are formatted here, in UTC, for the same reason the board's are: a screen
   that formatted them itself would disagree with the server it was rendered on (`lib/office-time.ts`).
   The feed is read newest first and bounded (200 rows), which is the read's own limit rather than a
   page's. */

export default async function ActivityPage() {
  await requireOfficeSession();
  const entries = await getOfficeActivity();
  const now = new Date();

  return (
    <Activity
      entries={entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        subject: e.subject,
        day: dayKey(e.at),
        dayTitle: dayTitle(e.at, now),
        dayFull: weekdayDay(e.at),
        clock: clock(e.at),
        actor: e.actor,
      }))}
    />
  );
}
