// Office-area layout — wraps every /office/* route (the (shell) group today,
// and the login/settings screens). Loads the office reference's font set
// verbatim: every reference office page links
//   Inter 400;500;600 + Oswald 500;600;700
// Oswald 600 matters — without it, font-weight:600 Oswald text (e.g. the
// WhatsApp preview number `.mchip b`) is substituted under Chrome's weight
// matching and renders ~2px wide versus the reference.
const fonts = (
  <link
    href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
);

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {fonts}
      {children}
    </>
  );
}