// Office-area layout — wraps every /office/* route (the (shell) group today,
// and the upcoming login/settings/car-form screens). Loads the office reference's
// font set: Oswald 500;700 + Inter 400;500;600. The reference office page loads
// Oswald 500 and 700 only, so its font-weight:400/600 text renders through
// Chrome's weight substitution; this link reproduces that exactly.
const fonts = (
  <link
    href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap"
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