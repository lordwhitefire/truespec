import type { Metadata } from "next";
import "../../door.css";
import "../account.css";
import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { requireOfficeSession } from "@/lib/session";

// Behind the door, so it reads the session per request.
export const dynamic = "force-dynamic";

// A surface of its own, so it carries its own title rather than inheriting the showroom's.
export const metadata: Metadata = {
  title: "Your account | TrueSpec Office",
};

/**
 * Where the office sends the owner to change their password.
 *
 * Truth 12: "The password is the provider's: changing it is delegated". The office builds no password
 * form and holds no password material — the provider's own account UI is mounted here and does the
 * whole job (current password, new password, the rules, the verification). Nothing about the password
 * ever passes through this application.
 *
 * Mounted the way Clerk requires for `routing="path"`: an optional catch-all route, so the provider's
 * own sub-pages (security, etc.) work. This is the same shape as the office's one door
 * (`app/office/sign-in/[[...sign-in]]`), which mounts the provider's sign-in the same way.
 *
 * The recovery sentence is here on purpose (task.md): there is no in-app reset flow, and the owner
 * should know the route before he needs it.
 */
export default async function OfficeAccountPage() {
  await requireOfficeSession();

  return (
    <main className="office-account">
      <Link className="office-account-back" href="/office/settings">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to the office
      </Link>
      <h1 className="office-door-title">Your account</h1>
      <p className="office-door-sub">
        Your password is held by the sign-in provider, never by the office. Change it here.
      </p>
      <UserProfile path="/office/account" routing="path" />
      <p className="office-account-note">
        Forgot your password? Recovery is an identity-provider operation — it happens at the sign-in
        screen, not in the office.
      </p>
    </main>
  );
}
