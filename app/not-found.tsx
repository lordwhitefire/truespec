import './globals.css';
import './reference.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getSetting } from '@/lib/public-cars';
import { waClass, waLink, waOffProps } from '@/components/whatsapp';
import { ThemeSpeech } from '@/components/site/ThemeSpeech';

export const metadata: Metadata = {
  title: 'Page not found | TrueSpec Automotive',
  description:
    'The page you asked for is not here. Browse the TrueSpec inventory or head back to the home page.',
  robots: { index: false, follow: false },
};

const WA_MESSAGE = 'Hello TrueSpec, I was looking for a car on your site.';

export default async function NotFound() {
  // The root 404 sits outside the site layout's `force-dynamic`, so without this wait Next would
  // prerender it at build time and could show a number the owner has since removed. `connection()`
  // keeps the number a per-request read; the saved number is the only one ever shown.
  await connection();
  const num = (await getSetting('whatsapp_number')) ?? '';
  const wa = waLink(num, WA_MESSAGE);

  return (
    <main
      className="nfbox"
      style={{ padding: '90px 24px', textAlign: 'center', maxWidth: 620, margin: 'auto' }}
    >
      <div
        className="av"
        aria-hidden="true"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--gold)',
          color: 'var(--gt)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-head)',
          fontWeight: 700,
          fontSize: 28,
          margin: '0 auto 20px',
        }}
      >
        U
      </div>
      <h1 style={{ fontSize: 'clamp(26px,4vw,36px)', marginBottom: 12 }}>
        We couldn't find that page
      </h1>
      <p style={{ color: 'var(--mute)', marginBottom: 28, fontSize: 15.5 }}>
        The link may be old, or the address mistyped. The showroom is still open — every car, one
        doorstep price, delivered anywhere in Nigeria.
      </p>
      <div
        className="row"
        style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <Link
          className="btn"
          href="/inventory"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--gold)',
            color: 'var(--gt)',
            height: 48,
            padding: '0 26px',
            fontWeight: 700,
            fontSize: 14,
            border: 0,
            borderRadius: 5,
          }}
        >
          <i className="fa-solid fa-grip" />
          Browse the inventory
        </Link>
        <a
          className={waClass('wab big', !wa)}
          target="_blank"
          rel="noopener noreferrer"
          href={wa ?? undefined}
          {...waOffProps(!wa)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--wa)',
            color: '#06220f',
            fontWeight: 700,
            fontSize: 15,
            padding: '0 26px',
            height: 48,
            borderRadius: 5,
            whiteSpace: 'nowrap',
          }}
        >
          <i className="fa-brands fa-whatsapp fa-xl" />
          Message Umar
        </a>
      </div>
      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--mute)' }}>
        Or head back to the{' '}
        <Link href="/" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
          home page
        </Link>
        .
      </p>
      <ThemeSpeech />
    </main>
  );
}
