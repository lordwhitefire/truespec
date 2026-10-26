import { OfficeNav } from "@/components/office/OfficeNav";
import { OfficeBottomNav } from "@/components/office/OfficeBottomNav";
import { OfficeTopbar } from "@/components/office/OfficeTopbar";
import { TapNotice } from "@/components/office/TapNotice";
import { OfflineBanner } from "@/components/office/OfflineBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireOfficeSession } from "@/lib/session";
import { getNewOfficeTapCount } from "@/lib/office";
import { DemoBanner } from "./demo-banner";
import { signOutOffice } from "../actions/session";

// The shared Office shell: sidebar (desktop) / topbar (mobile) + bottom nav.
// Comes into being here, with the first page that uses it (the dashboard).
// Each page imports its own self-contained stylesheet (the reference pages
// carry their own <style> copies with small page-to-page deltas), so the
// layout itself imports no CSS.
//
// The shell is behind the door: it checks the session on the server and shows the
// owner that the session belongs to (design D4 — "Signed in as <the signed-in row>",
// never a hardcoded name). Each page checks for itself as well; a layout is never a
// substitute, because it is not re-run on every navigation.
export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOfficeSession();
  // The visitor's side of the story, read with the page (truth 8): how many WhatsApp taps are **new
  // since the office last looked** — not an all-time total (owner ruling, 2026-10-16). It is the same
  // figure the taps list is built from, so the notice and the list can never disagree. It is read
  // here, in the shell, so it is visible on every office route — the phone topbar and the desktop
  // sidebar footer each carry it (only one shows, by width), and both link to the taps tab, which is
  // what clears it.
  //
  // Guarded (Finding A): this read sits in the layout, which wraps every office route, so a failure
  // here would take the whole shell down — not just the notice. The required error state is "notice
  // absent, shell alive": if the count cannot be read, the notice simply does not draw and the office
  // carries on. The failure is logged, never silently swallowed.
  let tapCount = 0;
  try {
    tapCount = await getNewOfficeTapCount();
  } catch (error) {
    console.error("[office shell] tap count read failed; notice omitted", error);
  }

  return (
    <>
      <OfflineBanner />
      <div className="shell">
        <aside className="side">
          <div className="sl">
            <i className="fa-solid fa-gauge-high" />
            <div>
              TrueSpec<small>Office</small>
            </div>
          </div>
          <OfficeNav />
          <div className="sfoot">
            <b>Signed in as {session.email}</b>
            <div className="srow">
              <ThemeToggle />
              {/* Sign-out is a POST (a Server Action) — no GET changes state. */}
              <form action={signOutOffice}>
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    color: "#8a9096",
                    background: "none",
                    border: 0,
                    padding: 0,
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket" />
                  Sign out
                </button>
              </form>
              {/* The tap notice — desktop's home (Designer ruling 2): grouped with the account
                  section, last in the row, so the theme toggle and Sign out never move when the
                  count goes to or from zero. It draws nothing at zero. */}
              <TapNotice count={tapCount} />
            </div>
          </div>
        </aside>

        <OfficeTopbar tapCount={tapCount} />

        <main className="main">
          {/* The demo notice is shell-wide and not dismissible. Main renders nothing. */}
          {session.space === "demo" ? <DemoBanner /> : null}
          {children}
        </main>
      </div>
      <OfficeBottomNav />
    </>
  );
}
