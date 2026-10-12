import "./settings.css";
import { Settings } from "./settings-client";

/* Settings — four cards, each with its own validation or dirty-watch and a demo
   toast. The screen has no data layer (plan §1 — the data model is out of scope
   for this layer), so the page is a thin route: it imports the screen's own
   stylesheet and mounts the client. */

export default function SettingsPage() {
  return <Settings />;
}
