import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrueSpec — cars you can trust",
  description: "A Nigerian vehicle-import showroom: browse, judge a car completely, chat on WhatsApp.",
};

// Matches the reference: only the literal "light" is honoured; anything else is dark.
const themeInit = `(function(){var t="dark";try{t=localStorage.getItem("ts-theme")||"dark";}catch(e){}if(t!=="light")t="dark";document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Fonts are loaded per area in (site)/layout.tsx and office/layout.tsx —
        each area mirrors the reference's own Oswald weights (public: 600;700,
        office: 500;600;700) so font-weight substitution resolves identically. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}