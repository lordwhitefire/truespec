"use client";

import "../door.css";
import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

/**
 * The client half of sign-out.
 *
 * Revoking a session on the server does not, by itself, remove the provider's
 * cookie from the browser — and Clerk's own sign-in would bounce a browser that
 * still holds a session straight back into the office. So every path that ends a
 * session (the sign-out button, and a session whose own limits have been crossed)
 * lands here, where Clerk clears the browser's session, and only then returns to
 * the door.
 */
export default function OfficeSignOutPage() {
  const { signOut } = useClerk();

  useEffect(() => {
    void signOut({ redirectUrl: "/office/sign-in" });
  }, [signOut]);

  return (
    <main className="office-signout">
      <p>Signing out…</p>
    </main>
  );
}
