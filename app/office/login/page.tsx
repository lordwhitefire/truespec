import "./login.css";
import { Login } from "./login-client";

/* Login / first-run / reset — a standalone screen (no office shell): the theme
   toggle, the auth card with its three panels, and the boot line. No data layer
   (plan §1 — the data model is out of scope), so the page is a thin route that
   imports the screen's own stylesheet and mounts the client. */

export default function LoginPage() {
  return <Login />;
}
