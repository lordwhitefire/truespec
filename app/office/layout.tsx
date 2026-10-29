import { ClerkProvider } from '@clerk/nextjs';

// Office-area layout — wraps every /office/* route (the (shell) group today,
// and the login/settings screens). The office reference's font set
//   Inter 400;500;600 + Oswald 500;600;700
// is self-hosted once in app/layout.tsx, so every area gets the same fonts with no third-party
// stylesheet. Oswald 600 matters — without it, font-weight:600 Oswald text (e.g. the WhatsApp
// preview number `.mchip b`) is substituted under Chrome's weight matching and renders ~2px wide
// versus the reference.
export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
