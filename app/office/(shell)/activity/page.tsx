import "./activity.css";
import { requireOfficeSession } from "@/lib/session";
import { Activity } from "./activity-client";

/* Activity log — the chips, the match line and the log body are drawn from a
   hardcoded demo timeline in the reference (office-activity.html), and the log
   has no data layer (plan §1 — the data model is out of scope for this layer).
   So the page is a thin route: it imports the screen's own stylesheet and mounts
   the client log. */

export default async function ActivityPage() {
  await requireOfficeSession();
  return <Activity />;
}
