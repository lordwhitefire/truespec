import { OfficeNav } from "@/components/office/OfficeNav";
import { OfficeBottomNav } from "@/components/office/OfficeBottomNav";
import { OfficeTopbar } from "@/components/office/OfficeTopbar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireOfficeSession } from "@/lib/session";
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

  return (
    <>
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
            </div>
          </div>
        </aside>

        <OfficeTopbar />

        <main className="main">{children}</main>
      </div>
      <OfficeBottomNav />
    </>
  );
}
