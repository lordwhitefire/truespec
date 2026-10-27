import type { Metadata } from 'next';
import '../../door.css';
import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { demoSwitchOn } from '@/lib/config';

// The flag and the provider's own sign-up state are read per request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Try the demo office | TrueSpec Automotive',
};

/**
 * The optional demo door. Clerk's own sign-up is mounted here; the application builds no credential
 * form and holds no password material. `DEMO_SIGNUP_ENABLED` is only the app-side switch: when it is
 * off this route sends the visitor back to sign-in. Clerk's own sign-up mode remains the outer
 * switch, so the app flag cannot make sign-up possible on its own.
 *
 * The copy says what the account is for and what happens to it: a demo, reset daily around 03:00
 * UTC, uploads deleted with the demo, and the public showroom always showing main's inventory.
 */
export default function OfficeSignUpPage() {
  if (!demoSwitchOn(process.env.DEMO_SIGNUP_ENABLED)) redirect('/office/sign-in');

  return (
    <main className="office-door">
      <h1 className="office-door-title">Try the demo office</h1>
      <p className="office-door-strapline">
        This is a demo account. Its data resets daily, around 03:00 UTC. Uploads are deleted with
        the demo.
      </p>
      <p className="office-door-sub">
        The public showroom shows the main inventory, not the demo inventory.
      </p>
      <SignUp fallbackRedirectUrl="/office" />
      <p className="office-door-demo">
        Read the <Link href="/privacy">privacy notice</Link>.
      </p>
    </main>
  );
}
