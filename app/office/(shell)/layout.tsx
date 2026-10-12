import Link from "next/link";
import { OfficeNav } from "@/components/office/OfficeNav";
import { OfficeBottomNav } from "@/components/office/OfficeBottomNav";
import { OfficeTopbar } from "@/components/office/OfficeTopbar";
import { ThemeToggle } from "@/components/ThemeToggle";

// The shared Office shell: sidebar (desktop) / topbar (mobile) + bottom nav.
// Comes into being here, with the first page that uses it (the dashboard).
// Each page imports its own self-contained stylesheet (the reference pages
// carry their own <style> copies with small page-to-page deltas), so the
// layout itself imports no CSS.
export default function OfficeLayout({ children }: { children: React.ReactNode }) {
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
            <b>Signed in as Umar</b>
            <div className="srow">
              <ThemeToggle />
              <Link href="/office/login">
                <i className="fa-solid fa-right-from-bracket" />
                Sign out
              </Link>
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
