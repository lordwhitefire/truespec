import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { Inter, Oswald } from 'next/font/google';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
};

// Self-hosted by next/font at build time: no third-party font request, and the generated fallback
// metrics keep the text's space stable while the web font swaps in.
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

// The site and office stylesheets both name the font aliases, but the door and office shell
// stylesheets are standalone and do not import globals.css. Define the aliases once on <html>
// so every area resolves them, and keep the fallback stack for a failed font file.
const fontVars = {
  '--font-head': 'var(--font-oswald, Oswald), sans-serif',
  '--font-body': 'var(--font-inter, Inter), sans-serif',
} as CSSProperties;

// Matches the reference: only the literal "light" is honoured; anything else is dark.
const themeInit = `(function(){var t="dark";try{t=localStorage.getItem("ts-theme")||"dark";}catch(e){}if(t!=="light")t="dark";document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${oswald.variable} ${inter.variable}`}
      style={fontVars}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
