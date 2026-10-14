import type { Metadata } from "next";
import "../../door.css";
import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkOfficeSession, SIGN_OUT_PATH } from "@/lib/session";

// The door reads the provider's session, so it renders per request.
export const dynamic = "force-dynamic";

// The door is a surface of its own, so it carries its own document title rather
// than inheriting the showroom's. The root layout sets no title template, so this
// string is used as written.
export const metadata: Metadata = {
  title: "Owner sign in | TrueSpec Automotive",
};

/**
 * The office's one door (design D4). The provider's own sign-in is mounted here,
 * inside the office — the application builds no password form and no account-creation
 * route, and the provider is in invite-only mode, so there is no public sign-up.
 *
 * A request that already holds a live office session is sent inside. One whose
 * provider session exists but whose own limits have been crossed goes through the
 * client-side sign-out first, so a dead provider cookie is cleared rather than being
 * bounced straight back into the office.
 */
export default async function OfficeSignInPage() {
  const state = await checkOfficeSession();
  if (state.status === "active") redirect("/office");
  if (state.status === "ended") redirect(SIGN_OUT_PATH);

  return (
    <main className="office-door">
      <h1 className="office-door-title">TrueSpec Office</h1>
      <p className="office-door-strapline">
        The owner's side of the showroom. Nothing here is public.
      </p>
      <p className="office-door-sub">Sign in to continue.</p>
      <SignIn />
    </main>
  );
}
